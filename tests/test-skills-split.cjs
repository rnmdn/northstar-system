const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root,'scripts/skills-assessment.js'),'utf8');
const model = {};
vm.runInNewContext(source.slice(0,source.indexOf("const key ="))+'globalThis.model={items,tasks,quizVersion,practicalVersion};})();',model);
const data = model.model;
const state = {participantCode:'disposable-test',quizVersion:data.quizVersion,practicalVersion:data.practicalVersion,startedAt:new Date().toISOString(),answers:{},practical:{},unclear:'',feedback:'',coding:{code:'function larger(a,b){return Math.max(a,b)}',runs:1,lastRun:{status:'4 of 4 sample checks passed'}}};
data.items.forEach((item,i)=>{state.answers[item.id]=i<23?item.key:(item.key+1)%4});
data.tasks.forEach(task=>{state.practical[task.id]='Disposable test response'});
class Element {constructor(){this.style={};this.dataset={};this.hidden=false;this.children=[];this.events={}} setAttribute(){} append(...v){this.children.push(...v)} replaceChildren(...v){this.children=v} addEventListener(name,fn){this.events[name]=fn}}
function run(saved){const elements={};const storage=new Map(saved?[["astra-research-pilot-v0-1",JSON.stringify(saved)]]:[]);vm.runInNewContext(source,{document:{body:{dataset:{page:'skills-results'}},getElementById:id=>elements[id]??=new Element(),createElement:()=>new Element()},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},crypto:{randomUUID:()=> 'test'},window:{dispatchEvent(){}},Event:class{},Date,URL,Blob,setTimeout});return{elements,storage}}
const complete=run(state);
assert.equal(complete.elements['knowledge-score'].textContent,'23/50');
assert.equal(complete.elements['domain-feedback'].children.length,10);
assert.equal(complete.elements['results-content'].hidden,false);
complete.elements.feedback.value='Test feedback';complete.elements.feedback.events.input();
assert.equal(JSON.parse(complete.storage.get('astra-research-pilot-v0-1')).feedback,'Test feedback');
assert.equal(run(null).elements['results-content'].hidden,true);
const partial=structuredClone(state);delete partial.answers.Q01;assert.equal(run(partial).elements['results-empty'].hidden,false);
const ratings=(n,value)=>Object.fromEntries(Array.from({length:n},(_,i)=>[i,value]));
const profile={skills:ratings(10,2),interest:ratings(6,2),style:ratings(3,1),exposure:[]};
const fixture=`<!doctype html><title>Disposable skills test</title><script>sessionStorage.setItem('astra-student-profile-v1',${JSON.stringify(JSON.stringify(profile))});sessionStorage.setItem('astra-review-complete','true');sessionStorage.setItem('astra-research-pilot-v0-1',${JSON.stringify(JSON.stringify(state))});sessionStorage.setItem('astra-skills-stage-v3','57');location.replace('../skills-assessment.html');</script>`;
fs.writeFileSync(path.join(root,'outputs/test-skills-start.html'),fixture);
console.log('PASS: total score, 10 domain bars, saved feedback, empty and incomplete states. Disposable browser fixture ready.');
