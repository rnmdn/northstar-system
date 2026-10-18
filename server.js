const v3=require('./grading/v3');
const v3Storage=require('./storage/v3');
const http=require('node:http');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const ai=require('./grading/ai');
const rubric=require('./grading/rubric');
const objective=require('./grading/objective');
const {privateStore}=require('./storage/private-store');
const assessmentStorage=require('./storage/assessment');
const {lock}=require('./storage/maintenance');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
function createServer({dataDir=process.env.ASTRA_DATA_DIR?path.resolve(process.env.ASTRA_DATA_DIR):path.join(__dirname,'.astra-data'),grade=ai.grade,gradeV3,model=process.env.GEMINI_MODEL||'gemini-flash-lite-latest',authProvider=undefined,authRequired=process.env.NORTHSTAR_AUTH_REQUIRED==='true',rfTesting=process.env.NORTHSTAR_RF_ENABLED!=='false'}={}) {
  const cloud=process.env.NORTHSTAR_STORAGE==='supabase';
  const vercelHost=process.env.VERCEL_ENV==='production'?process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL:process.env.VERCEL_URL;
  const publicURL=process.env.NORTHSTAR_PUBLIC_URL||(vercelHost?'https://'+vercelHost:process.env.RENDER_EXTERNAL_URL);
  const publicOrigin=publicURL?new URL(publicURL).origin:null;
  const allowedOrigins=new Set([publicOrigin,...(process.env.VERCEL_URL?['https://'+process.env.VERCEL_URL]:[])]);
  if(process.env.NODE_ENV==='production'&&(!cloud||process.env.ASTRA_HTTPS!=='true'||!publicOrigin?.startsWith('https://')))throw new Error('Production requires Supabase storage and a canonical HTTPS public URL.');
  const unlock=cloud?()=>{}:lock(dataDir);
  const pending=new Map(),cooldowns=new Map();
  const requestLimits=new Map();
  const privateData=cloud?require('./storage/supabase-store').supabaseStore(dataDir):privateStore(dataDir);
  const readRecord=privateData.read,store=privateData.write;
  const provider=authProvider===undefined?require('./storage/auth-provider').authProvider():authProvider;
  const account=provider?require('./storage/accounts').accounts({provider,store:privateData,dataDir,secure:process.env.ASTRA_HTTPS==='true',origin:publicOrigin||'http://127.0.0.1:8766'}):null;
  const recordPath=owner=>path.join(dataDir,owner,'assessment.json');
  const send=(res,status,data,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...extra});res.end(JSON.stringify(data));};
  async function session(req,res) {
    if(authRequired&&!account)throw Object.assign(new Error('Account sign-in is not configured. Please retry later.'),{status:503});
    if(account){const signed=await account.userSession(req);if(signed){let owner=await account.owner(req);if(!owner)throw Object.assign(new Error('Your account could not be loaded. Sign in again.'),{status:401});return owner;}if(authRequired)throw Object.assign(new Error('Sign in to continue your assessment.'),{status:401});}
    let token=req.headers.cookie?.match(/(?:^|;\s*)astra_grading=([a-f0-9]{64})(?:;|$)/)?.[1];
    if(!token){token=crypto.randomBytes(32).toString('hex');setCookie(res,token);}
    const id=hash(token);
    const mapped=await readRecord(path.join(dataDir,'sessions',`${id}.json`));
    if(mapped && mapped.expiresAt<Date.now()){const nextOwner=hash(crypto.randomBytes(32).toString('hex'));await newSession(res,nextOwner);return nextOwner;}
    if(!mapped)await store(path.join(dataDir,'sessions',`${id}.json`),{owner:id,expiresAt:Date.now()+2592000000});
    const owner=mapped?.owner||id;
    if((await readRecord(recordPath(owner)))?.accountUserId)throw Object.assign(new Error('This assessment belongs to an account. Sign in to continue.'),{status:401});
    return owner;
  }
  function setCookie(res,token){const previous=res.getHeader('Set-Cookie')||[];res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:[previous]),`astra_grading=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${process.env.ASTRA_HTTPS==='true'?'; Secure':''}`]);}
  async function newSession(res,owner){const token=crypto.randomBytes(32).toString('hex');await store(path.join(dataDir,'sessions',`${hash(token)}.json`),{owner,expiresAt:Date.now()+2592000000});setCookie(res,token);}
  async function body(req){let text='';if(req.body!==undefined){text=Buffer.isBuffer(req.body)?req.body.toString('utf8'):typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(text)>300000)throw Object.assign(new Error('Submission is too long.'),{status:413});}else for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>300000)throw Object.assign(new Error('Submission is too long.'),{status:413});}try{return JSON.parse(text);}catch{throw Object.assign(new Error('Invalid JSON submission.'),{status:400});}}
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/healthz'&&req.method==='GET'){if(privateData.ping)await privateData.ping();return send(res,200,{status:'ok'});}
      if(publicOrigin&&![...allowedOrigins].some(origin=>origin&&req.headers.host===new URL(origin).host))return send(res,403,{error:'Use the NorthStar website address.'});
      if(process.env.ASTRA_HTTPS!=='true'&&!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host||''))return send(res,403,{error:'Use the local Astra address.'});
      if(url.pathname.startsWith('/api/')) {
        if(req.method!=='POST')return send(res,405,{error:'Use POST for assessment requests.'});
        const origin=req.headers.origin;
        if(origin && (publicOrigin?!allowedOrigins.has(origin):origin!==`http://${req.headers.host}` && origin!==`https://${req.headers.host}`))return send(res,403,{error:'Use the assessment from this server.'});
        if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Use the assessment from this server.'});
        if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'Use JSON assessment requests.'});
        const forwarded=process.env.RENDER==='true'||process.env.VERCEL==='1'?req.headers['x-forwarded-for']?.split(',')[0].trim():null;
        const clientAddress=forwarded&&require('node:net').isIP(forwarded)?forwarded:req.socket.remoteAddress;
        const isAuth=url.pathname.startsWith('/api/auth/')&&!url.pathname.endsWith('/status');
        const rateKey=`${clientAddress}:${isAuth?'auth':url.pathname==='/api/storage/resume'?'resume':'api'}`,period=url.pathname==='/api/storage/resume'?600000:60000,maximum=isAuth?12:url.pathname==='/api/storage/resume'?20:240;
        for(const [key,value]of requestLimits)if(value.until<Date.now())requestLimits.delete(key);
        let rate=requestLimits.get(rateKey);if(!rate){rate={count:0,until:Date.now()+period};requestLimits.set(rateKey,rate);}if(++rate.count>maximum)return send(res,429,{error:'Too many requests. Retry later.',retryAfter:Math.ceil((rate.until-Date.now())/1000)},{'Retry-After':String(Math.ceil((rate.until-Date.now())/1000))});
        const input=await body(req);
        if(url.pathname.startsWith('/api/auth/')){
          const name=url.pathname.slice('/api/auth/'.length);
          if(!account)return send(res,name==='status'?200:503,name==='status'?{enabled:false,user:null}:{error:'Account sign-in is not configured yet.'});
          if(name!=='claim')return await privateData.exclusive(async()=>send(res,200,await account.route(req,res,name,input)));
          return await privateData.exclusive(async()=>{
            const signed=await account.userSession(req);if(!signed)return send(res,401,{error:'Sign in before linking your assessment.'});
            const code=typeof input.code==='string'?input.code.replace(/[-\s]/g,'').toLowerCase():'';
            if(!/^[a-f0-9]{48}$/.test(code))return send(res,403,{error:'That recovery code could not be verified.'});
            const recovery=await readRecord(path.join(dataDir,'recovery',hash(code)+'.json'));
            const record=recovery&&await readRecord(recordPath(recovery.owner));
            if(!record||record.recoveryHash!==hash(code))return send(res,403,{error:'That recovery code could not be verified.'});
            if(record.accountUserId&&record.accountUserId!==signed.userId)return send(res,403,{error:'This assessment is already linked to another account.'});
            const existing=await account.owner(req),existingRecord=existing&&await readRecord(recordPath(existing));
            if(existing!==recovery.owner&&existingRecord&&Object.keys(existingRecord.state).length)return send(res,409,{error:'Your account already has saved answers. Linking would replace them, so no changes were made.'});
            await store(recordPath(recovery.owner),{...record,accountUserId:signed.userId});await account.link(signed.userId,recovery.owner);
            return send(res,200,{linked:true});
          });
        }
        if(account&&!url.pathname.startsWith('/api/storage/'))await privateData.exclusive(()=>account.userSession(req));
        if(url.pathname.startsWith('/api/storage/')) {
          return await privateData.exclusive(async()=>{
            const route=url.pathname.slice('/api/storage/'.length);
            if(route==='resume') {
              const code=typeof input?.code==='string'?input.code.replace(/[-\s]/g,'').toLowerCase():'';
              if(!/^[a-f0-9]{48}$/.test(code))return send(res,403,{error:'That recovery code could not be verified.'});
              const recovery=await readRecord(path.join(dataDir,'recovery',`${hash(code)}.json`));
              if(!recovery)return send(res,403,{error:'That recovery code could not be verified.'});
              const record=await readRecord(recordPath(recovery.owner));
              if(!record || record.recoveryHash!==hash(code))return send(res,403,{error:'That recovery code could not be verified.'});
              const signed=account&&await account.userSession(req);
              if(record.accountUserId&&record.accountUserId!==signed?.userId)return send(res,403,{error:'Sign in to the account linked to this assessment.'});
              if(signed)return send(res,409,{error:'Use My assessment to link a recovery code to your account.'});
              await newSession(res,recovery.owner);
              return send(res,200,{revision:record.revision,recordId:record.recordId,...await assessmentStorage.enrich(record.state,recovery.owner,privateData,dataDir,model)});
            }
            let owner=await session(req,res),record=await readRecord(recordPath(owner));
            if(route==='new'&&account&&await account.userSession(req))return send(res,409,{error:'Your account already has an assessment. Resume it from My assessment.'});
            if(route==='logout'&&account&&await account.userSession(req))return send(res,200,await account.route(req,res,'logout',{}));
            if(route==='new'){owner=hash(crypto.randomBytes(32).toString('hex'));await newSession(res,owner);record=null;}
            if(!record){record={recordId:crypto.randomUUID(),revision:0,state:{},createdAt:new Date().toISOString(),...(req.northstarAccount?{accountUserId:req.northstarAccount.userId}:{})};await store(recordPath(owner),record);}
            if(route==='load'||route==='new')return send(res,200,{recordId:record.recordId,revision:record.revision,accountLinked:!!req.northstarAccount,...await assessmentStorage.enrich(record.state,owner,privateData,dataDir,model)});
            if(route==='recovery') {
              const code=crypto.randomBytes(24).toString('hex');
              record.recoveryHash=hash(code);
              await store(recordPath(owner),record);
              await store(path.join(dataDir,'recovery',`${hash(code)}.json`),{owner});
              return send(res,200,{code:code.match(/.{1,8}/g).join('-')});
            }
            if(route==='logout'){const previous=req.headers.cookie?.match(/(?:^|;\s*)astra_grading=([a-f0-9]{64})(?:;|$)/)?.[1];if(previous)await store(path.join(dataDir,'sessions',`${hash(previous)}.json`),{owner,expiresAt:0});const token=crypto.randomBytes(32).toString('hex');setCookie(res,token);return send(res,200,{signedOut:true});}
            if(route==='save') {
              if(input?.recordId!==record.recordId)return send(res,409,{error:'This browser has switched to a different assessment. Download this tab’s answers before loading the current assessment.',code:'ASSESSMENT_CHANGED'});
              if(!Number.isInteger(input?.revision)||input.revision!==record.revision)return send(res,409,{error:'Newer answers were saved in another tab. Reload the saved assessment before editing.',code:'REVISION_CONFLICT'});
              const clean=assessmentStorage.validateState(input.state);
              for(const version of ['3.0','4.0']){
                const module=require('./storage/v3').forVersion(version),previous=record.state[module.key]?module.validate(JSON.parse(record.state[module.key])):null;
                if(previous?.submittedAt){
                  if(!clean[module.key])return send(res,403,{error:'Submitted assessment answers are locked.'});
                  const next=module.validate(JSON.parse(clean[module.key]));
                  if(!require('node:util').isDeepStrictEqual(previous.responses,next.responses)||!require('node:util').isDeepStrictEqual(previous.profile,next.profile)||!next.reviewed)return send(res,403,{error:'Submitted assessment answers are locked. You can view your results but cannot change answers.'});
                  next.submittedAt=previous.submittedAt;clean[module.key]=JSON.stringify(next);
                }else if(clean[module.key]){const next=JSON.parse(clean[module.key]);delete next.submittedAt;clean[module.key]=JSON.stringify(next);}
              }
              const enriched=await assessmentStorage.enrich(clean,owner,privateData,dataDir,model);
              record={...record,...enriched,revision:record.revision+1,updatedAt:new Date().toISOString()};
              await store(recordPath(owner),record);
              return send(res,200,{recordId:record.recordId,revision:record.revision,savedAt:record.updatedAt});
            }
            return send(res,404,{error:'Storage endpoint not found.'});
          });
        }
        if(url.pathname==='/api/v3/recommend') {
          const bankVersion=input.bankVersion||'3.0',v3=require('./grading/v3').forVersion(bankVersion),v3Storage=require('./storage/v3').forVersion(bankVersion);
          if(!rfTesting)return send(res,503,{error:'Career suggestions are turned off on this server. Your assessment remains saved.',code:'RF_TESTING_DISABLED'});
          return await privateData.exclusive(async()=>{
            const owner=await session(req,res),record=await readRecord(recordPath(owner));
            if(!record||req.headers['x-astra-assessment']!==record.recordId)return send(res,409,{error:'Load the saved assessment before requesting suggestions.'});
            if(!record.state[v3Storage.key])return send(res,422,{error:'Complete the v3 assessment first.'});
            const a=v3Storage.validate(JSON.parse(record.state[v3Storage.key]));
            if(!v3Storage.profileComplete(a)||!a.reviewed)return send(res,422,{error:'Complete and review your profile first.'});
            if(!v3.responsesComplete(a))return send(res,422,{error:'Complete every skill response before requesting suggestions.'});
            const scores=await v3Storage.scores(a,owner,privateData,dataDir,model);
            const result=await v3Storage.recommendation(a,scores,owner,privateData,dataDir,model,true);
            if(result.status&&result.status!=='ready')return send(res,422,{error:result.reason,code:result.status});
            return send(res,200,result);
          });
        }
        if(['/api/v3/score','/api/v3/grade','/api/v3/submit'].includes(url.pathname)) {
          const v3=require('./grading/v3').forVersion(input.bankVersion),v3Storage=require('./storage/v3').forVersion(input.bankVersion);
          const responses=v3.validate(input), a={bankVersion:v3.version,responses};
          const owner=await session(req,res);let record=await readRecord(recordPath(owner));
          if(!record||req.headers['x-astra-assessment']!==record.recordId)return send(res,409,{error:'Load the saved assessment before grading.'});
          const stored=record.state[v3Storage.key]?v3Storage.validate(JSON.parse(record.state[v3Storage.key])):null;
          if(stored?.submittedAt&&!require('node:util').isDeepStrictEqual(stored.responses,responses))return send(res,403,{error:'Submitted assessment answers are locked.'});
          if(url.pathname==='/api/v3/submit'){
            const submission=await privateData.exclusive(async()=>{
              const current=await readRecord(recordPath(owner)),saved=current?.state[v3Storage.key]?v3Storage.validate(JSON.parse(current.state[v3Storage.key])):null;
              if(!saved||!v3Storage.profileComplete(saved)||!saved.reviewed||saved.skipped?.length||!v3.responsesComplete(saved)||!require('node:util').isDeepStrictEqual(saved.responses,responses))throw Object.assign(Error('Save and complete your assessment before submitting.'),{status:422});
              if(!saved.submittedAt){saved.submittedAt=new Date().toISOString();current.state[v3Storage.key]=JSON.stringify(saved);current.revision++;await store(recordPath(owner),current);}
              return current;
            });record=submission;
          }
          const completeScores=async()=>{const result=await v3Storage.scores(a,owner,privateData,dataDir,model);if(record.state[v3Storage.key])result.features=v3Storage.features({...v3Storage.validate(JSON.parse(record.state[v3Storage.key])),responses},result);result.submittedAt=record.state[v3Storage.key]?JSON.parse(record.state[v3Storage.key]).submittedAt||null:null;result.recordRevision=record.revision;return result;};
          if(url.pathname==='/api/v3/score'||url.pathname==='/api/v3/submit'){
            const file=path.join(dataDir,owner,v3Storage.prefix+'-objective-'+v3Storage.objectiveHash(a)+'.json');
            if(!await readRecord(file))await store(file,await v3.score(a));
            return send(res,200,await completeScores());
          }
          const fingerprint=v3Storage.writtenHash(a,model),file=path.join(dataDir,owner,v3Storage.prefix+'-written-'+fingerprint+'.json');
          if(!await readRecord(file)){
            const pendingKey='v3:'+owner,active=pending.get(pendingKey);
            if(active&&active.fingerprint!==fingerprint)return send(res,429,{error:'Another grading request is running. Retry shortly.'});
            if(!active&&(cooldowns.get(pendingKey)||0)>Date.now()){const seconds=Math.ceil((cooldowns.get(pendingKey)-Date.now())/1000);return send(res,429,{error:`Grading is cooling down. Wait ${seconds} seconds before retrying. Your answers are saved.`,retryAfter:seconds},{'Retry-After':String(seconds)});}
            let promise=active?.promise;
            if(!promise){cooldowns.set(pendingKey,Date.now()+10000);promise=(async()=>{const result=await (gradeV3||v3.gradeWritten)(a,{model});result.grades=v3.validateWritten(result.grades,Object.keys(v3Storage.writtenAnswers(a)));await store(file,result);})();pending.set(pendingKey,{fingerprint,promise});promise.then(()=>pending.delete(pendingKey),()=>pending.delete(pendingKey));}
            try{await promise;}catch(error){if(error.retryAfter)cooldowns.set(pendingKey,Date.now()+error.retryAfter*1000);throw error;}
          }
          return send(res,200,await completeScores());
        }
        if(url.pathname==='/api/score-objective') {
          let result;try{result=objective.score(input);}catch(error){return send(res,400,{error:error.message,code:'INVALID_ASSESSMENT'});}
          const owner=await session(req,res),fingerprint=hash({answers:input.answers,code:input.code,knowledge:result.metadata.knowledgeVersion,coding:result.metadata.codingVersion,policy:result.metadata.policyVersion});
          if(req.headers['x-astra-assessment'] && (await readRecord(recordPath(owner)))?.recordId!==req.headers['x-astra-assessment'])return send(res,409,{error:'This browser has switched assessments. Load the saved assessment before grading.'});
          const file=path.join(dataDir,owner,`objective-${fingerprint}.json`);const cached=await readRecord(file);if(cached)return send(res,200,{...cached,cached:true});
          result.metadata.recordId=crypto.randomUUID();result.metadata.submissionHash=hash({answers:input.answers,code:input.code});
          await store(file,result);
          return send(res,200,result);
        }
        if(url.pathname==='/api/grade-scenarios') {
          let answers;try{answers=rubric.validateAnswers(input?.answers);}catch(error){return send(res,400,{error:error.message,code:'INVALID_ANSWERS'});}
          const owner=await session(req,res),fingerprint=hash({answers,rubric:rubric.version,model}),file=path.join(dataDir,owner,`written-${fingerprint}.json`);
          if(req.headers['x-astra-assessment'] && (await readRecord(recordPath(owner)))?.recordId!==req.headers['x-astra-assessment'])return send(res,409,{error:'This browser has switched assessments. Load the saved assessment before grading.'});
          const cached=await readRecord(file);if(cached)return send(res,200,{...cached,cached:true});
          const active=pending.get(owner);
          if(active&&active.fingerprint!==fingerprint)return send(res,429,{error:'Another grading request is still running. Retry shortly.',retryAfter:5},{'Retry-After':'5'});
          if(!active){const until=cooldowns.get(owner)||0;if(until>Date.now()){const seconds=Math.ceil((until-Date.now())/1000);return send(res,429,{error:`Retry grading in ${seconds} seconds. Your answers are saved.`,code:'COOLDOWN',retryAfter:seconds},{'Retry-After':String(seconds)});}}
          let promise=active?.promise;
          if(!promise){cooldowns.set(owner,Date.now()+10000);promise=(async()=>{const result=await grade(answers,{model});result.grades=rubric.validateGrades(result.grades);result.metadata={...result.metadata,rubricVersion:rubric.version,requestedModel:model,recordId:crypto.randomUUID(),submissionHash:hash(answers)};await store(file,result);return result;})();pending.set(owner,{fingerprint,promise});promise.then(()=>pending.delete(owner),()=>pending.delete(owner));}
          try{return send(res,200,await promise);}catch(error){if(error.retryAfter)cooldowns.set(owner,Date.now()+error.retryAfter*1000);return send(res,error.status||502,{error:error.message,code:error.code||'GRADING_FAILED',retryAfter:error.retryAfter||0},error.retryAfter?{'Retry-After':String(error.retryAfter)}:{});}
        }
        return send(res,404,{error:'Assessment endpoint not found.'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'});
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(res,400,{error:'Invalid path.'});}
      const file=path.resolve(__dirname,`.${pathname==='/'?'/index.html':pathname}`),relative=path.relative(__dirname,file);
      const blocked=relative.split(path.sep).some(part=>part.startsWith('.')||['grading','storage','datasets','models','data','ml','tools','tests','node_modules','outputs'].includes(part));
      if(!file.startsWith(__dirname+path.sep)||blocked||['server.js','package.json','package-lock.json'].includes(relative)||!Object.hasOwn(types,path.extname(file)))return send(res,404,{error:'Not found.'});
      let stat;try{stat=await fsp.stat(file);}catch{return send(res,404,{error:'Not found.'});}if(!stat.isFile())return send(res,404,{error:'Not found.'});
      if(await fsp.realpath(file)!==file)return send(res,404,{error:'Not found.'});
      res.writeHead(200,{'Content-Type':types[path.extname(file)]+'; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
    }catch(error){if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:'The server could not save or process this assessment. Retry later.',...(error.retryAfter?{retryAfter:error.retryAfter,code:error.code}: {})},error.retryAfter?{'Retry-After':String(error.retryAfter)}:{});else res.end();}
  });
  server.on('close',unlock);
  server.on('error',()=>{if(!server.listening)unlock();});
  server.requestTimeout=20000;
  return server;
}
if(require.main===module){require('./scripts/ai-config.cjs').loadAIKey();const port=Number(process.env.PORT||8766),host=process.env.RENDER||process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1';createServer().listen(port,host,()=>console.log(`NorthStar listening on ${host}:${port}`));}
module.exports={createServer};
