const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
function setup(page,submitted=false){
 const {window}=parseHTML(fs.readFileSync(page+'.html','utf8'));window.scrollTo=()=>{};window.HTMLElement.prototype.focus=()=>{};
 const bank=require('../grading/v3').forVersion('4.0').bank;
 const responses=Object.fromEntries(bank.items.map(i=>[i.id,i.type==='Knowledge MCQ'?'A':i.type==='Structured practical task'?JSON.parse(bank.keys[i.id].zero):'Example answer']));
 const a={bankVersion:'4.0',profile:{exposure:['EX-NONE'],interests:Object.fromEntries(bank.interests.map(i=>[i.id,3])),styles:Object.fromEntries(bank.styles.map(i=>[i.id,'A']))},responses,stage:48,reviewed:true,selected:[],reflections:{},...(submitted?{submittedAt:'2026-10-15T00:00:00Z',scores:{grades:{},careers:[]}}:{})};
 const values=new Map([['astra-item-bank-v4',JSON.stringify(a)]]),store={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};const navigations=[],routes=[];
 window.AstraStorage={cache:store,flush:async()=>{},navigate:p=>navigations.push(p),acceptRevision:()=>{},recordId:'fictional'};
 const context={window,document:window.document,sessionStorage:store,location:{search:submitted?'?grading=auto':'',pathname:'/'+page+'.html'},history:{replaceState:()=>{}},URLSearchParams,AbortSignal,setTimeout,setInterval,clearInterval,console,fetch:async route=>{routes.push(route);if(route.endsWith('/grade'))throw Error('Grading is temporarily unavailable.');return {ok:true,json:async()=>({submittedAt:'2026-10-15T00:00:00Z',grades:{},careers:[]})};}};
 for(const file of ['scripts/bank-v4.js','scripts/assessment-v3.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
 return {document:window.document,navigations,routes};
}
test('submission warns about locking and opens results without waiting for AI',async()=>{const x=setup('skills-assessment');assert.match(x.document.body.textContent,/Submitting locks your answers/);await x.document.querySelector('#v3-finish').onclick();assert.deepEqual(x.routes,['/api/v3/submit']);assert.deepEqual(x.navigations,['skills-results.html?grading=auto']);});
test('automatic AI failure keeps submitted results visible and offers retry',async()=>{const x=setup('skills-results',true);await new Promise(setImmediate);assert.deepEqual(x.routes,['/api/v3/grade']);assert.match(x.document.body.textContent,/Assessment submitted/);assert.match(x.document.querySelector('#v3-status').textContent,/answers remain locked/);assert.match(x.document.querySelector('#v3-status').textContent,/Incomplete grades stay pending/);assert.equal(x.document.querySelector('#v3-grade').disabled,false);assert.equal(x.document.querySelector('#v3-finalize'),null);});
