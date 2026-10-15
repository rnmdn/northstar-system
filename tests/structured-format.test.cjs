const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
test('structured data task explains invalid formats and accepts a formatted wrong answer',()=>{
 const {window}=parseHTML(fs.readFileSync('skills-assessment.html','utf8'));
 window.HTMLElement.prototype.focus=()=>{};window.HTMLElement.prototype.scrollIntoView=function(options){window.scrollBehavior=options.behavior;};window.matchMedia=()=>({matches:true});window.scrollTo=()=>{};
 const bank=require('../grading/bank-v4.json'),key='astra-item-bank-v4';
 const draft={bankVersion:'4.0',profile:{exposure:['EX-NONE'],interests:Object.fromEntries(bank.interests.map(i=>[i.id,3])),styles:Object.fromEntries(bank.styles.map(i=>[i.id,'A']))},responses:{'OB-DA10':{cleaned_rows:'C1: rubric text',duplicates_removed:null,missing_rows_removed:null,mean_minutes:null}},stage:30,reviewed:true,selected:[]};
 const cache=new Map([[key,JSON.stringify(draft)]]),store={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)};
 window.AstraStorage={cache:store,navigate:()=>{},flush:async()=>{}};
 const context={window,document:window.document,sessionStorage:store,location:{search:'?bank=v4',pathname:'/skills-assessment.html'},URLSearchParams,setTimeout,console};
 for(const file of ['scripts/bank-v4.js','scripts/assessment-v3.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
 window.document.querySelector('#v3-next').onclick();
 assert.match(window.document.querySelector('#v3-status').textContent,/JSON array/);
 assert.match(window.document.querySelector('#v3-status').textContent,/enter a number, not text/);
 assert.equal(window.document.querySelectorAll('[aria-invalid=true]').length,4);for(const input of window.document.querySelectorAll('[aria-invalid=true]'))assert(window.document.getElementById(input.getAttribute('aria-describedby')));assert.equal(window.scrollBehavior,'instant');
 assert.equal(JSON.parse(cache.get(key)).stage,30);
 for(const [field,value]of [['cleaned_rows','[]'],['duplicates_removed','99'],['missing_rows_removed','99'],['mean_minutes','99']]){const input=window.document.querySelector(`[data-field="${field}"]`);input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));}
 window.document.querySelector('#v3-next').onclick();
 assert.equal(JSON.parse(cache.get(key)).stage,31);
});
