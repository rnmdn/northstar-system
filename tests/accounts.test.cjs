const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createServer}=require('../server');
const {privateStore}=require('../storage/private-store');
const {accounts}=require('../storage/accounts');
function fakeProvider(){const calls=[];return {calls,async request(route,options={}){calls.push({route,...options});if(route.startsWith('token')){const id=options.body.email?.split('@')[0]||options.body.refresh_token||'a';return {access_token:id,refresh_token:id,expires_in:3600};}if(route==='user'&&options.method==='GET')return {id:options.token,email:options.token+'@example.test',email_confirmed_at:'2026-01-01T00:00:00Z'};return {};}};}
test('account progress is isolated, persists through restart, and claimed work cannot be opened anonymously',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'northstar-auth-')),provider=fakeProvider();let server,base;
  async function start(){server=createServer({dataDir:dir,authProvider:provider});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
  const post=(route,input={},cookie='',headers={})=>fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,...headers},body:JSON.stringify(input)});
  const cookie=response=>response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  try{
    await start();const anon=await post('storage/load'),anonCookie=cookie(anon),original=await anon.json();
    const v=require('../grading/v3').forVersion('4.0'),key=require('../storage/v3').forVersion('4.0').key;
    const draft={bankVersion:'4.0',profile:{exposure:['EX-NONE'],interests:Object.fromEntries(v.bank.interests.map(i=>[i.id,3])),styles:Object.fromEntries(v.bank.styles.map(i=>[i.id,'A']))},responses:Object.fromEntries(v.bank.items.map(i=>[i.id,{status:'not_learned'}])),stage:48,reviewed:true,selected:[],skipped:[],flagged:[],reflections:{}};
    const saved=await post('storage/save',{recordId:original.recordId,revision:0,state:{'astra-assessment-unlocked-v1':'1',[key]:JSON.stringify(draft)}},anonCookie);assert.equal(saved.status,200);
    assert.equal((await post('v3/submit',draft,anonCookie,{'X-Astra-Assessment':original.recordId})).status,200);
    const recovery=await (await post('storage/recovery',{},anonCookie)).json();
    const a=await post('auth/login',{email:'a@example.test',password:'password-a'}),cookieA=cookie(a);assert.match(cookieA,/northstar_account=/);assert.match(a.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);assert.equal((await a.json()).access_token,undefined);
    assert.equal((await post('auth/claim',{code:recovery.code},cookieA)).status,200);
    const linked=await (await post('storage/load',{},cookieA)).json();assert.equal(linked.recordId,original.recordId);assert.equal(linked.state['astra-assessment-unlocked-v1'],'1');assert.equal(linked.accountLinked,true);
    const locked=JSON.parse(linked.state[key]);assert.ok(locked.submittedAt);locked.responses['OB-SD01']='A';
    assert.equal((await post('storage/save',{recordId:linked.recordId,revision:linked.revision,state:{...linked.state,[key]:JSON.stringify(locked)}},cookieA)).status,403);
    assert.equal((await post('storage/load',{},anonCookie)).status,401);assert.equal((await post('storage/resume',{code:recovery.code})).status,403);
    const b=await post('auth/login',{email:'b@example.test',password:'password-b'}),cookieB=cookie(b);
    assert.equal((await post('auth/claim',{code:recovery.code},cookieB)).status,403);
    const other=await (await post('storage/load',{},cookieB)).json();assert.notEqual(other.recordId,linked.recordId);assert.deepEqual(other.state,{});
    assert.equal((await post('auth/password',{password:'new-password-b'},cookieB)).status,403);
    assert.equal((await post('storage/new',{},cookieA)).status,409);
    await new Promise(r=>server.close(r));await start();assert.equal((await (await post('storage/load',{},cookieA)).json()).recordId,original.recordId);
    await post('auth/logout',{},cookieA);assert.equal((await post('storage/load',{},cookieA)).status,401);
  }finally{if(server?.listening)await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
test('email flows use server-held PKCE; reset requires the originating flow and is single-use',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'northstar-pkce-')),store=privateStore(dir),provider=fakeProvider();
  const api=accounts({provider,store,dataDir:dir,secure:true,origin:'https://northstar.example'});
  const response=()=>({headers:{},getHeader(name){return this.headers[name];},setHeader(name,value){this.headers[name]=value;}});
  const request=cookie=>({headers:{cookie}});
  try{
    const res=response();await api.route(request(''),res,'recover',{email:'a@example.test'});
    const flow=res.headers['Set-Cookie'][0].split(';')[0],call=provider.calls.find(c=>c.route==='recover');
    assert.equal(call.code_challenge,undefined);assert.equal(call.body.code_challenge_method,'s256');assert.equal(call.body.code_challenge.length,43);assert.equal(call.redirect,'https://northstar.example/auth-callback.html');
    await assert.rejects(api.route(request(''),response(),'exchange',{code:'test-code'}),/browser that requested/);
    const exchange=response(),result=await api.route(request(flow),exchange,'exchange',{code:'test-code'});assert.equal(result.recovery,true);
    assert.ok(provider.calls.find(c=>c.route.includes('pkce')).body.code_verifier.length>=43);
    await assert.rejects(api.route(request(flow),response(),'exchange',{code:'test-code'}),/browser that requested/);
    const sessionCookie=exchange.headers['Set-Cookie'][0].split(';')[0];await api.route(request(sessionCookie),response(),'password',{password:'a-new-password'});
    await assert.rejects(api.route(request(sessionCookie),response(),'password',{password:'another-password'}),/reset email first/);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('auth provider sanitizes upstream failures and sends credentials only to Supabase Auth',async()=>{
  const {authProvider}=require('../storage/auth-provider');let captured;
  const api=authProvider({url:'https://project.supabase.co',key:'test-publishable',fetcher:async(url,options)=>{captured={url,options};return {ok:false,status:400,json:async()=>({error_code:'invalid_credentials',message:'DO NOT EXPOSE PRIVATE DETAIL'})};}});
  await assert.rejects(api.request('token?grant_type=password',{body:{email:'a@example.test',password:'test-password'}}),/Email or password is incorrect/);
  assert.equal(captured.url.origin,'https://project.supabase.co');assert.equal(captured.options.headers.apikey,'test-publishable');assert.equal(captured.options.headers.Authorization,undefined);
});
test('required sign-in does not silently create an anonymous assessment',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'northstar-required-')),server=createServer({dataDir:dir,authProvider:fakeProvider(),authRequired:true});
  try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const result=await fetch('http://127.0.0.1:'+server.address().port+'/api/storage/load',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(result.status,401);}finally{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
