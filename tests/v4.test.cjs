const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const v=require('../grading/v3').forVersion('4.0'),s=require('../storage/v3').forVersion('4.0'),old=require('../storage/v3'),{createServer}=require('../server'),{validateState}=require('../storage/assessment'),{parseHTML}=require('linkedom');
const draft=()=>({bankVersion:v.version,profile:{exposure:['EX-NONE'],interests:Object.fromEntries(v.bank.interests.map(i=>[i.id,3])),styles:Object.fromEntries(v.bank.styles.map(i=>[i.id,'A']))},responses:{},stage:48,reviewed:true,selected:['Networking'],reflections:{}});
function reference(key,kind){const text=key[kind];
 if(key.type==='Structured practical task')return JSON.parse(text);
 if(key.type==='Coding task')return text.match(/function[\s\S]*}/)[0];
 if(key.type==='SQL task')return text.match(/SELECT[\s\S]*?;/)[0];
 return text.slice(text.indexOf('<'),text.lastIndexOf('>')+1);
}
const tasks=v.bank.items.filter(i=>i.maximum===4&&i.type!=='Written scenario');
const correct=Object.fromEntries(tasks.map(i=>[i.id,reference(v.bank.keys[i.id],'reference')]));
const allResponses=()=>structuredClone({...correct,...Object.fromEntries(v.bank.items.filter(i=>i.type==='Knowledge MCQ').map(i=>[i.id,v.bank.keys[i.id].reference[0]])),...Object.fromEntries(v.bank.items.filter(i=>i.type==='Written scenario').map(i=>[i.id,'Synthetic reference for transport tests.']))});
test('V4 has a consistent blueprint, new IDs, protected keys and versioned response storage',async()=>{
 assert.equal(v.bank.items.length,48);assert.equal(tasks.length,6);assert.equal(v.bank.rubricVersion,'objective-skills-v4.0');
 for(const career of new Set(v.bank.items.map(i=>i.career)))for(const target of ['Interpret','Apply','Diagnose'])assert.equal(v.bank.items.filter(i=>i.career===career&&i.type==='Knowledge MCQ'&&i.cognitiveTarget===target).length,2);
 assert.deepEqual(v.bank.styles.map(i=>i.id),['WS06','WS02','WS03','WS07','WS08']);
 for(const id of v.bank.revisionNotes.retired)assert(!v.bank.items.some(i=>i.id===id));
 const context={window:{}};vm.runInNewContext(await fs.readFile(path.join(__dirname,'../scripts/bank-v4.js'),'utf8'),context);
 assert.equal(context.window.AstraBankV4.keys,undefined);assert.equal(context.window.AstraBankV4.sourceSha256,v.bank.sourceSha256);
 const a=draft();a.scores={forged:999};const oldDraft={...draft(),bankVersion:'3.0',profile:{...a.profile,styles:{WS01:'A',WS02:'B',WS03:'A',WS04:'B',WS05:'A'}},responses:{}};
 const clean=validateState({[s.key]:JSON.stringify(a),[old.key]:JSON.stringify(oldDraft)});
 assert.equal(JSON.parse(clean[s.key]).scores,undefined);assert.equal(JSON.parse(clean[old.key]).bankVersion,'3.0');
 assert.throws(()=>validateState({[old.key]:JSON.stringify(a)}));
 assert.throws(()=>v.validate({bankVersion:'4.0',responses:{'OB-DA01':'B'}}));
});
test('Revised practical tasks reproduce independently checked 0/2/4 anchors; incomplete drafts cannot reach RF',async()=>{
 for(const [kind,expected]of [['reference',4],['partial',2],['zero',0]]){
  const responses=Object.fromEntries(tasks.map(i=>[i.id,reference(v.bank.keys[i.id],kind)]));
  const scores=await v.score({bankVersion:v.version,responses});
  for(const i of tasks)assert.equal(scores.grades[i.id].points,expected,i.id+' '+kind);
 }
 const a=draft();a.responses=allResponses();assert(v.responsesComplete(a));
 delete a.responses['OB-NW10'].verification;assert(!v.responsesComplete(a));
 const scores=await v.score({bankVersion:v.version,responses:allResponses()});assert(scores.careers.every(c=>c.knowledge.percent===100&&c.practical.percent===100&&c.written.percent===null));
 assert.equal(Object.keys(s.features(draft(),{careers:scores.careers}).values).length,35);
});
test('V4 HTTP grades, reload and RF use the saved bank/rubric and server grades',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'northstar-v4-'));
 const server=createServer({dataDir:dir,gradeV3:async a=>({grades:Object.keys(s.writtenAnswers(a)).map(id=>({id,rubricVersion:v.bank.rubricVersion,criteria:[1,1,1,1],points:4,evidence:['','','',''],feedback:'Synthetic test'})),metadata:{model:'mock'}})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='',record;
 const post=async(route,data)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,'X-Astra-Assessment':record?.recordId||''},body:JSON.stringify(data)});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:r.status,data:await r.json()};};
 try{
  record=(await post('/api/storage/load',{})).data;const a=draft();a.responses=allResponses();
  assert.equal((await post('/api/storage/save',{recordId:record.recordId,revision:record.revision,state:{[s.key]:JSON.stringify(a)}})).status,200);
  assert.equal((await post('/api/v3/score',{bankVersion:v.version,responses:a.responses})).status,200);
  assert.equal((await post('/api/v3/recommend',{bankVersion:v.version})).status,422);
  assert.equal((await post('/api/v3/grade',{bankVersion:v.version,responses:a.responses})).status,200);
  const result=await post('/api/v3/recommend',{bankVersion:v.version,values:[1,0,0,0,0,0]});assert.equal(result.status,200);
  assert.equal(result.data.rubricVersion,v.bank.rubricVersion);assert.equal(result.data.mapping.version,'objective-domain-pilot-v1');assert(result.data.mapping.values.every(n=>Math.abs(n-1/6)<1e-12));
  const loaded=JSON.parse((await post('/api/storage/load',{})).data.state[s.key]);assert.equal(loaded.scores.careers[0].written.points,4);
  assert.equal(loaded.recommendation.assessmentFingerprint,result.data.assessmentFingerprint);
  assert.deepEqual(loaded.recommendation.topThree,result.data.topThree);
  const submitted=await post('/api/v3/submit',{bankVersion:v.version,responses:a.responses});assert.equal(submitted.status,200);assert(submitted.data.submittedAt);
  record=(await post('/api/storage/load',{})).data;
  const locked=JSON.parse(record.state[s.key]);assert.equal(locked.submittedAt,submitted.data.submittedAt);
  const changed=structuredClone(locked);changed.responses['OB-SD10']='dsa';changed.submittedAt=null;
  assert.equal((await post('/api/storage/save',{recordId:record.recordId,revision:record.revision,state:{[s.key]:JSON.stringify(changed)}})).status,403);
  assert.equal((await post('/api/v3/grade',{bankVersion:v.version,responses:changed.responses})).status,403);
  const changedProfile=structuredClone(locked);changedProfile.profile.exposure=['EX-SD'];
  assert.equal((await post('/api/storage/save',{recordId:record.recordId,revision:record.revision,state:{[s.key]:JSON.stringify(changedProfile)}})).status,403);
  assert.equal((await post('/api/storage/save',{recordId:record.recordId,revision:record.revision,state:{[s.key]:JSON.stringify(locked)}})).status,200);
  assert.equal((await fetch(base+'/grading/bank-v4.json')).status,404);
 }finally{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
test('Results use the RF ranking, save chosen directions, and show actionable pending/error states',async()=>{
 const {mapStudent}=require('../ml/student-mapping.cjs'),{predict}=require('../ml/team-rf.cjs');
 const grades=Object.fromEntries(v.bank.items.map(i=>[i.id,{status:'graded',points:i.maximum,maximum:i.maximum}]));
 const scoreSet={grades,careers:v.summary(grades)},a=draft();a.responses=allResponses();a.selected=[];a.scores=scoreSet;
 const mapping=mapStudent(a,scoreSet),payload={...predict(mapping.values),mapping,bankVersion:v.version};
 const bank3=await fs.readFile(path.join(__dirname,'../scripts/bank-v3.js'),'utf8'),bank4=await fs.readFile(path.join(__dirname,'../scripts/bank-v4.js'),'utf8'),code=await fs.readFile(path.join(__dirname,'../scripts/assessment-v3.js'),'utf8');
 for(const [ok,result]of [[true,payload],[false,{code:'incomplete',error:'Complete grading for Software Development: written.'}],[false,{code:'insufficient_evidence',error:'All graded scores and exposure values are zero.'}]]){
  const {window}=parseHTML(await fs.readFile(path.join(__dirname,'../results.html'),'utf8'));
  const cache=new Map([[s.key,JSON.stringify(a)]]),ss={getItem:k=>cache.get(k)||null,setItem:(k,text)=>cache.set(k,text)};let destination='',requested;
  window.AstraStorage={cache:ss,recordId:'owned-record',flush:async()=>{},navigate:url=>destination=url};
  const context={window,document:window.document,sessionStorage:ss,location:{search:'?bank=v4',pathname:'/results.html'},URLSearchParams,AbortSignal,setTimeout,console,
   fetch:async(route,options)=>{requested={route,body:JSON.parse(options.body),record:options.headers['X-Astra-Assessment']};return {ok,json:async()=>result};}};
  for(const src of [bank3,bank4,code])vm.runInNewContext(src,context);
  await new Promise(r=>setImmediate(r));
  assert.equal(requested.route,'/api/v3/recommend');assert.deepEqual(requested.body,{bankVersion:'4.0'});assert.equal(requested.record,'owned-record');
  if(ok){
   const rows=[...window.document.querySelectorAll('.rf-result h3')];assert.equal(rows.length,3);
   payload.topThree.forEach((item,n)=>assert(rows[n].textContent.includes(item.career)));
   assert.deepEqual(JSON.parse(cache.get(s.key)).selected,[]);
   assert.equal(window.document.querySelectorAll('.career-card').length,3);
   assert.equal(window.document.querySelectorAll('.career-match').length,0);assert(!window.document.querySelector('.career-cards').textContent.includes('%'));
   assert.equal(window.document.querySelector('.career-preliminary'),null);
   assert.equal(window.document.querySelector('.career-summary-label'),null);
   assert.match(window.document.querySelector('.career-match-note').textContent,/order does not measure your potential/);
   assert.equal(window.document.querySelectorAll('.model-match-help').length,0);
   const choice=window.document.querySelector('#v3-paths input');choice.checked=true;
   window.document.querySelector('#v3-paths').onchange({target:choice});
   assert.equal(JSON.parse(cache.get(s.key)).selected.length,1);
   assert(window.document.querySelector('#plan-directions').textContent.includes(choice.value));
   choice.checked=true;window.document.querySelector('#v3-paths').onchange({target:choice});
   assert.equal(JSON.parse(cache.get(s.key)).selected.length,1);
   window.document.querySelector('#v3-plan').onclick();assert.equal(destination,'next-steps.html');
  }else{
   assert(window.document.querySelector('[role=alert]').textContent.includes(result.error));assert.equal(window.document.querySelectorAll('.rf-result').length,0);
   if(result.code==='incomplete')assert(window.document.querySelector('#rf-retry'));
   else assert.equal(window.document.querySelectorAll('#v3-paths input').length,6);
  }
 }
});
test('Every revised page/task renders using v4; existing v3 answers are never silently recast',async()=>{
 const bank3=await fs.readFile(path.join(__dirname,'../scripts/bank-v3.js'),'utf8'),bank4=await fs.readFile(path.join(__dirname,'../scripts/bank-v4.js'),'utf8'),code=await fs.readFile(path.join(__dirname,'../scripts/assessment-v3.js'),'utf8');
 for(const [page,stage]of [['assessment',0],['review',0],...v.bank.items.map((_,n)=>['skills-assessment',n]),['skills-results',48],['results',48],['next-steps',48]]){
  const {window}=parseHTML(await fs.readFile(path.join(__dirname,'../'+page+'.html'),'utf8')),a=draft();a.stage=stage;a.responses=allResponses();
  const cache=new Map([[s.key,JSON.stringify(a)]]),ss={getItem:k=>cache.get(k)||null,setItem:(k,text)=>cache.set(k,text)};
  const context={window,document:window.document,sessionStorage:ss,location:{search:'?bank=v4',pathname:'/'+page+'.html'},URLSearchParams,setTimeout,console};window.AstraStorage={cache:ss,navigate:()=>{},flush:async()=>{}};window.scrollTo=()=>{};
  for(const src of [bank3,bank4,code])vm.runInNewContext(src,context);
  assert(window.document.querySelector('#v3-heading'),page+' '+stage);
  if(page==='skills-results'){
   assert.equal(window.document.querySelectorAll('.score-help').length,18);
   const dialog=window.document.querySelector('#score-explanation');let opened=false;dialog.showModal=()=>{opened=true;};
   window.document.querySelector('.score-help').onclick();assert(opened);assert.match(dialog.textContent,/Knowledge/);assert.match(dialog.textContent,/Your submitted answer/);
  }
  if(page==='skills-assessment'){
   const i=v.bank.items[stage],count=i.type==='Knowledge MCQ'?4:i.type==='Structured practical task'?4:1;
   assert.equal(window.document.querySelectorAll('#v3-form input,#v3-form select,#v3-form textarea').length,count,i.id);
   assert.equal(window.document.querySelector('#v3-check'),null,'Normal exam must not expose individual grading');
  }
  assert.equal(JSON.parse(cache.get(s.key)).bankVersion,'4.0');
 }
 const {window}=parseHTML(await fs.readFile(path.join(__dirname,'../assessment.html'),'utf8'));
 const cache=new Map([[old.key,JSON.stringify({bankVersion:'3.0',profile:{exposure:null,interests:{},styles:{}},responses:{},stage:0,reviewed:false,selected:[],reflections:{}})]]),ss={getItem:k=>cache.get(k)||null,setItem:(k,text)=>cache.set(k,text)};
 const context={window,document:window.document,sessionStorage:ss,location:{search:'',pathname:'/assessment.html'},URLSearchParams,setTimeout,console};window.AstraStorage={cache:ss,navigate:()=>{},flush:async()=>{}};
 for(const src of [bank3,bank4,code])vm.runInNewContext(src,context);
 assert.equal(cache.get(s.key),undefined);assert.equal(cache.get('astra-bank-mode'),'v3');
});

test('Final submission sends all answers then opens the results grading stage',async()=>{
 const bank=await fs.readFile(path.join(__dirname,'../scripts/bank-v4.js'),'utf8'),code=await fs.readFile(path.join(__dirname,'../scripts/assessment-v3.js'),'utf8');
 const {window}=parseHTML(await fs.readFile(path.join(__dirname,'../skills-assessment.html'),'utf8')),a=draft();a.stage=48;a.responses=allResponses();
 const cache=new Map([[s.key,JSON.stringify(a)]]),ss={getItem:k=>cache.get(k)||null,setItem:(k,text)=>cache.set(k,text)},calls=[];let destination;
 const context={window,document:window.document,sessionStorage:ss,location:{search:'?bank=v4',pathname:'/skills-assessment.html'},URLSearchParams,setTimeout,console,AbortSignal,fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({grades:{},careers:[],submittedAt:'2026-10-15T00:00:00Z'})};}};
 window.AstraStorage={cache:ss,recordId:'test-record',navigate:url=>{destination=url;},flush:async()=>{}};window.scrollTo=()=>{};
 vm.runInNewContext(bank,context);vm.runInNewContext(code,context);await window.document.querySelector('#v3-finish').onclick();
 assert.deepEqual(calls.map(c=>c.url),['/api/v3/submit']);assert.equal(v.bank.items.filter(i=>i.type==='Written scenario'&&calls[0].body.responses[i.id]).length,6);assert.equal(destination,'skills-results.html?grading=auto');
});
