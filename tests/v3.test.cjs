const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const v=require('../grading/v3'),storage=require('../storage/v3'),{validateState}=require('../storage/assessment'),{createServer}=require('../server'),{parseHTML}=require('linkedom');
const input=responses=>({bankVersion:'3.0',responses});
const correct={
 'OB-SD09':v.bank.keys['OB-SD09'].reference.split(/\r?\n/)[0],
 'OB-NW09':{ipv4_address:'10.20.30.29',subnet_mask:'255.255.255.0',default_gateway:'10.20.30.1',dns_server:'10.20.30.53'},
 'OB-CS09':{student_own_draft:['update','read'],student_other_draft:[],student_own_submitted:['read'],researcher_any_submitted:['read']},
 'OB-DA09':{cleaned_rows:[{id:'A',minutes:10},{id:'B',minutes:20}],duplicates_removed:1,missing_rows_removed:1,mean_minutes:15},
 'OB-DB03':v.bank.keys['OB-DB03'].reference.split(/\r?\n/)[0],
 'OB-UX03':v.bank.keys['OB-UX03'].reference
};
const partial={
 'OB-SD09':'function summarizeScores(scores) { const total=scores.reduce((sum,s)=>sum+(s===null?0:s),0); return {count:scores.length,total,average:scores.length?total/scores.length:null}; }',
 'OB-NW09':{...correct['OB-NW09'],default_gateway:'10.20.30.200',dns_server:'10.20.30.200'},
 'OB-CS09':{...correct['OB-CS09'],student_own_submitted:['update'],researcher_any_submitted:['update']},
 'OB-DA09':{cleaned_rows:[],duplicates_removed:1,missing_rows_removed:1,mean_minutes:0},
 'OB-DB03':'SELECT customer, amount AS total FROM Orders WHERE amount >= 50 ORDER BY total DESC, customer ASC;',
 'OB-UX03':'<button onclick="send()">Send</button><label for="email">Email</label><input id="email">'
};
const zero={
 'OB-SD09':'function summarizeScores(scores){return null;}',
 'OB-NW09':{ipv4_address:'10.20.31.20',subnet_mask:'255.255.0.0',default_gateway:'10.20.31.1',dns_server:'10.20.31.53'},
 'OB-CS09':{student_own_draft:[],student_other_draft:['read'],student_own_submitted:['update'],researcher_any_submitted:['update']},
 'OB-DA09':{cleaned_rows:[{id:'C',minutes:0}],duplicates_removed:0,missing_rows_removed:0,mean_minutes:0},
 'OB-DB03':'SELECT customer, 0 AS total FROM Orders;', 'OB-UX03':'<div>Go</div><input id="other">'
};
const draft=()=>({bankVersion:'3.0',profile:{exposure:['EX-NONE'],interests:Object.fromEntries(v.bank.interests.map(i=>[i.id,3])),styles:Object.fromEntries(v.bank.styles.map(i=>[i.id,'A']))},responses:{},stage:0,reviewed:true,selected:[],reflections:{}});
test('V3 has the workbook counts, replacement IDs, and no public answer keys',async()=>{
 assert.equal(v.bank.items.length,48);assert.equal(v.bank.items.filter(i=>i.type==='Knowledge MCQ').length,36);assert.equal(v.bank.items.filter(i=>i.type==='Written scenario').length,6);assert.equal(v.bank.interests.length,18);assert.equal(v.bank.styles.length,5);
 for(const id of ['OB-SD03','OB-NW03','OB-CS03','OB-DA03'])assert(!v.bank.items.some(i=>i.id===id));
 const context={window:{}};vm.runInNewContext(await fs.readFile(path.join(__dirname,'../scripts/bank-v3.js'),'utf8'),context);const b=context.window.AstraBankV3;assert.equal(b.sourceSha256,v.bank.sourceSha256);assert.equal(b.keys,undefined);assert.equal(b.items.length,48);
});
test('All six practical reference sets yield exactly 4, 2, and 0 points',async()=>{
 for(const [responses,expected]of [[correct,4],[partial,2],[zero,0]]){const r=await v.score(input(responses));for(const id of Object.keys(correct))assert.equal(r.grades[id].points,expected,`${id}: ${JSON.stringify(r.grades[id])}`);}
 const r=await v.score(input({}));assert.equal(r.grades['OB-SD01'].points,null);assert.equal(r.careers[0].knowledge.percent,null);
 const mcq=Object.fromEntries(v.bank.items.filter(i=>i.type==='Knowledge MCQ').map(i=>[i.id,v.bank.keys[i.id].reference[0]]));assert((await v.score(input(mcq))).careers.every(c=>c.knowledge.percent===100));
});
test('Alternative implementations work; host access, loops, SQL writes and fake markup do not earn scores',async()=>{
 const alt='function summarizeScores(scores){let count=0,total=0;for(const s of scores){if(s!==null){count++;total+=s;}}return {count,total,average:count?total/count:null};}';assert.equal((await v.score(input({'OB-SD09':alt}))).grades['OB-SD09'].points,4);
 for(const code of ['function summarizeScores(scores){return process.exit();}','function summarizeScores(scores){while(true){}}','function summarizeScores(scores){return scores.constructor.constructor("return process")();}'])assert.equal((await v.score(input({'OB-SD09':code}))).grades['OB-SD09'].status,'grading_error');
 for(const sql of ['DELETE FROM Orders;','SELECT customer FROM Orders; DELETE FROM Orders;','SELECT load_extension("x");','SELECT * FROM sqlite_master;'])assert.equal((await v.score(input({'OB-DB03':sql}))).grades['OB-DB03'].status,'graded');
 assert.equal((await v.score(input({'OB-UX03':'<!-- <button type="button" onclick="send()">Send</button> --><script>"<label for=email>Email</label><input id=email type=email>"</script>'}))).grades['OB-UX03'].points,0);
 assert.equal((await v.score(input({'OB-UX03':'<BUTTON TYPE=button onclick="send ( ) ;">send</BUTTON><LABEL>Email <INPUT ID=email TYPE=email></LABEL>'}))).grades['OB-UX03'].points,4);
 assert.throws(()=>v.validate(input({'OB-CS09':{student_other_draft:['read','read']}})));
});
test('Storage retains old answers and strips forged v3 scores; profile scale and missing exposure are distinct',()=>{
 const a=draft();a.scores={grades:{'OB-SD01':{points:99}}};const clean=validateState({[storage.key]:JSON.stringify(a)});assert.equal(JSON.parse(clean[storage.key]).scores,undefined);
 assert.equal(storage.profileComplete(storage.validate({...a,profile:{...a.profile,exposure:null}})),false);assert.equal(storage.profileComplete(storage.validate(a)),true);
 assert.throws(()=>storage.validate({...a,profile:{...a.profile,exposure:['EX-NONE','EX-SD']}}));assert.throws(()=>storage.validate({...a,profile:{...a.profile,interests:{'IN-SD01':0}}}));
 const features=storage.features(a,{careers:v.summary({})}).values;assert.equal(Object.keys(features).length,35);assert.equal(features[v.bank.interests[0].feature],3);assert.equal(features[v.bank.styles[0].feature],'A');assert.equal(features[v.bank.exposure[0].feature],0);assert.equal(features[v.bank.items[0].feature],null);
});
test('AI validates four criteria, IDs, sums, versions and evidence; unavailable or malformed grading remains an error',async()=>{
 const id='OB-SD04',answer='It skips the last element.';
 const grade={id,rubricVersion:v.bank.rubricVersion,criteria:[1,0,0,0],points:1,feedback:'Add tests.',evidence:[answer,'','','']};
 assert.throws(()=>v.validateWritten([{...grade,points:4}],[id]));assert.throws(()=>v.validateWritten([{...grade,rubricVersion:'old'}],[id]));
 await assert.rejects(v.gradeWritten(input({[id]:answer}),{key:''}),/not configured/);
 const mock=raw=>async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({grades:[raw]})}]}}]})});
 assert.equal((await v.gradeWritten(input({[id]:answer}),{key:'test',fetchImpl:mock(grade)})).grades[0].points,1);
 await assert.rejects(v.gradeWritten(input({[id]:answer}),{key:'test',fetchImpl:mock({...grade,evidence:['invented quote','','','']})}),/invalid grading evidence/);
});
test('HTTP v3 round trip uses authoritative, versioned scores and blocks keys',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'astra-v3-'));const server=createServer({dataDir:dir,gradeV3:async a=>({grades:Object.keys(storage.writtenAnswers(a)).map(id=>({id,rubricVersion:v.bank.rubricVersion,criteria:[1,1,0,0],points:2,feedback:'Test grade',evidence:['','','','']})),metadata:{model:'mock'}})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='',record;
 const post=async(route,data)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,'X-Astra-Assessment':record?.recordId||''},body:JSON.stringify(data)});cookie=r.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:r.status,data:await r.json()};};
 try{
 record=(await post('/api/storage/load',{})).data;const a=draft();a.responses={...correct,'OB-SD04':'A private student response.'};
 const save=await post('/api/storage/save',{recordId:record.recordId,revision:record.revision,state:{[storage.key]:JSON.stringify(a)}});assert.equal(save.status,200);
 assert.equal((await post('/api/v3/score',input(a.responses))).data.grades['OB-DB03'].points,4);
 assert.equal((await post('/api/v3/grade',input(a.responses))).data.grades['OB-SD04'].points,2);
 record=(await post('/api/storage/load',{})).data;const loaded=JSON.parse(record.state[storage.key]);assert.equal(loaded.scores.grades['OB-SD04'].points,2);
 const changed={...a,responses:{...a.responses,'OB-SD04':'changed response'}};await post('/api/storage/save',{recordId:record.recordId,revision:record.revision,state:{[storage.key]:JSON.stringify(changed)}});
 const stale=JSON.parse((await post('/api/storage/load',{})).data.state[storage.key]);assert.equal(stale.scores.grades['OB-SD04'].status,'pending');assert.equal(stale.scores.grades['OB-DB03'].points,4);
 assert.equal((await fetch(base+'/grading/bank-v3.json')).status,404);assert.equal((await fetch(base+'/scripts/bank-v3.js')).status,200);
 }finally{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
test('V3 DOM renders every task, restores responses, and keeps Next on the right',async()=>{
 const bank=await fs.readFile(path.join(__dirname,'../scripts/bank-v3.js'),'utf8'),code=await fs.readFile(path.join(__dirname,'../scripts/assessment-v3.js'),'utf8');
 for(const [page,stage]of [['assessment',0],['review',0],...v.bank.items.map((_,n)=>['skills-assessment',n]),['skills-assessment',48],['skills-results',48],['results',48],['next-steps',48]]){
 const {window}=parseHTML(await fs.readFile(path.join(__dirname,'../'+page+'.html'),'utf8')),a=draft();a.stage=stage;a.responses={...correct,...Object.fromEntries(v.bank.items.filter(i=>i.type==='Knowledge MCQ').map(i=>[i.id,'A'])),...Object.fromEntries(v.bank.items.filter(i=>i.type==='Written scenario').map(i=>[i.id,'My reasoning.']))};a.selected=['Networking'];
 const cache=new Map([[storage.key,JSON.stringify(a)]]);const ss={getItem:k=>cache.get(k)||null,setItem:(k,s)=>cache.set(k,s)};
 const context={window,document:window.document,sessionStorage:ss,location:{search:'',pathname:'/'+page+'.html'},URLSearchParams,setTimeout,console};window.AstraStorage={cache:ss,navigate:()=>{},flush:async()=>{}};window.scrollTo=()=>{};
 vm.runInNewContext(bank,context);vm.runInNewContext(code,context);
 assert(window.AstraV3.active,`${page} ${stage}`);assert(window.document.querySelector('#v3-heading'),`${page} ${stage}`);
 if(page==='skills-assessment'&&stage<48){assert(window.document.querySelector('#v3-next'));assert.equal(window.document.querySelectorAll('#v3-form textarea,#v3-form input,#v3-form select').length,v.bank.items[stage].type==='Knowledge MCQ'?4:fieldsCount(v.bank.items[stage]));}
 }
 function fieldsCount(i){return ['OB-NW09','OB-CS09','OB-DA09'].includes(i.id)?4:1;}
});
test('Work-style cards preserve A/B values and guide an unanswered pair',async()=>{
 const bank=await fs.readFile(path.join(__dirname,'../scripts/bank-v3.js'),'utf8'),code=await fs.readFile(path.join(__dirname,'../scripts/assessment-v3.js'),'utf8');
 const {window}=parseHTML(await fs.readFile(path.join(__dirname,'../assessment.html'),'utf8')),a=draft();
 delete a.profile.styles[v.bank.styles[4].id];
 const cache=new Map([[storage.key,JSON.stringify(a)]]),ss={getItem:k=>cache.get(k)||null,setItem:(k,s)=>cache.set(k,s)};
 let destination='',scrolled=false,focused=false;
 const context={window,document:window.document,sessionStorage:ss,location:{search:'?step=2',pathname:'/assessment.html'},URLSearchParams,setTimeout,console,matchMedia:()=>({matches:true})};
 window.AstraStorage={cache:ss,navigate:url=>{destination=url;},flush:async()=>{}};window.scrollTo=()=>{};
 vm.runInNewContext(bank,context);vm.runInNewContext(code,context);
 const questions=[...window.document.querySelectorAll('.work-style-question')];
 assert.equal(questions.length,5);assert.equal(questions[0].querySelector('input').value,'A');assert.equal(questions[1].querySelector('input').value,'B');
 assert.equal(window.document.querySelector('#work-style-progress').textContent,'4 of 5 answered');
 questions[4].scrollIntoView=()=>{scrolled=true;};questions[4].querySelector('input').focus=()=>{focused=true;};
 window.document.querySelector('#v3-next').onclick();
 assert(questions[4].classList.contains('is-missing'));assert(scrolled&&focused);assert.equal(destination,'');
 const answer=questions[4].querySelector('input[value="B"]');answer.checked=true;window.document.querySelector('#v3-form').onchange({target:answer});
 assert.equal(JSON.parse(cache.get(storage.key)).profile.styles[v.bank.styles[4].id],'B');
 assert.equal(window.document.querySelector('#work-style-progress').textContent,'5 of 5 answered');
 assert(!questions[4].classList.contains('is-missing'));
 window.document.querySelector('#v3-next').onclick();assert.equal(destination,'review.html');
});
test('Separate tests bypass profile and knowledge, contain six items, and allow individual checks',async()=>{
 const bank=await fs.readFile(path.join(__dirname,'../scripts/bank-v3.js'),'utf8'),code=await fs.readFile(path.join(__dirname,'../scripts/assessment-v3.js'),'utf8');
 for(const mode of ['practical','written']){
  const items=v.bank.items.filter(i=>mode==='written'?i.type==='Written scenario':i.maximum===4&&i.type!=='Written scenario');
  const a=draft();a.profile={exposure:null,interests:{},styles:{}};a.reviewed=false;
  a.responses=mode==='practical'?correct:Object.fromEntries(items.map(i=>[i.id,'My reasoning.']));
  const {window}=parseHTML(await fs.readFile(path.join(__dirname,'../skills-assessment.html'),'utf8'));
  const cache=new Map([[storage.key,JSON.stringify(a)]]),ss={getItem:k=>cache.get(k)||null,setItem:(k,s)=>cache.set(k,s)};
  const context={window,document:window.document,sessionStorage:ss,location:{search:'?bank=v3&test='+mode,pathname:'/skills-assessment.html'},URLSearchParams,setTimeout,console};
  window.AstraStorage={cache:ss,navigate:()=>{},flush:async()=>{}};window.scrollTo=()=>{};
  vm.runInNewContext(bank,context);vm.runInNewContext(code,context);
  for(let n=0;n<6;n++){
   assert.match(window.document.querySelector('.question-details').textContent,new RegExp(items[n].id));
   assert(!window.document.querySelector('.v3-stage').textContent.includes(items[n].id));
   assert(window.document.querySelector('#v3-check'));assert.equal(window.document.querySelector('#v3-jump').children.length,7);
   window.document.querySelector('#v3-next').onclick();
  }
  assert.match(window.document.querySelector('#v3-heading').textContent,/Review your/);
  assert.equal(Object.keys(JSON.parse(cache.get(storage.key)).responses).length,6);
 }
});

test('Invalid coding submissions receive zero; empty responses remain unanswered',async()=>{
 for(const code of ['dsadsa','Submit one function summarizeScores(scores).','function summarizeScores(scores) {','function other(scores){return null;}','function(scores){}']){
  const r=await v.score(input({'OB-SD09':code})),g=r.grades['OB-SD09'];
  assert.equal(g.status,'graded');assert.equal(g.points,0);assert.deepEqual(g.criteria,[0,0,0,0]);assert.ok(g.feedback);
  assert.equal(r.careers.find(c=>c.career==='Software Development').practical.percent,0);
 }
 assert.equal((await v.score(input({'OB-SD09':'  '}))).grades['OB-SD09'].status,'unanswered');
});

test('AI connection diagnostics expose safe codes without credentials or raw messages',async()=>{
 const response=input({'OB-SD04':'My reasoning.'});
 for(const code of ['ENOTFOUND','ERR_INVALID_CHAR','secret-value']){
  await assert.rejects(v.gradeWritten(response,{key:'private-key',fetchImpl:async()=>{throw Object.assign(Error('private-key'),{cause:{code}});}}),e=>e.message.includes(code==='secret-value'?'CONNECTION_FAILED':code)&&!e.message.includes('private-key')&&!e.message.includes('secret-value'));
 }
 await assert.rejects(v.gradeWritten(response,{key:'private-key',fetchImpl:async()=>{throw Object.assign(Error('private-key'),{cause:{errors:[{code:'ENETUNREACH'}]}});}}),e=>e.message.includes('ENETUNREACH')&&!e.message.includes('private-key'));
});
