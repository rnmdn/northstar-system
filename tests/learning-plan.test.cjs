const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const learning=require('../scripts/learning-plan'),bank=require('../grading/bank-v4.json');
const row=(knowledge,practical,written)=>({knowledge:{points:knowledge,maximum:6,graded:6,total:6},practical:{points:practical,maximum:4,graded:1,total:1},written:{points:written,maximum:4,graded:1,total:1}});
test('Starting points follow boundaries and target component proportions, not raw points',()=>{
 for(const [parts,label]of [[[0,0,0],'Foundations'],[[3,1,1],'Foundations'],[[4,1,1],'Build your skills'],[[6,2,2],'Build your skills'],[[5,3,3],'Explore a challenge'],[[6,4,4],'Explore a challenge']])assert.equal(learning.recommend('Software Development',row(...parts)).label,label);
 const applied=learning.recommend('Software Development',row(6,0,0));assert.equal(applied.weakest,'practical');assert.match(applied.focus,/hands-on/);
 assert.equal(learning.recommend('Software Development',row(3,4,3)).weakest,'knowledge');
 const pending=row(6,4,null);assert.equal(learning.recommend('Software Development',pending).points,null);assert.equal(learning.recommend('Software Development',undefined).label,'Awaiting scores');
 for(const [career,entry]of Object.entries(learning.catalog))for(const tier of [row(0,0,0),row(6,2,2),row(6,4,4)]){const value=learning.recommend(career,tier);assert.equal(new URL(value.resource.url).protocol,'https:');assert(value.activity.length>30);assert(value.resource.provider);assert(entry.resources.length===3);}
});
test('Plan renders curated resources and retains optional reflections for selected careers',async()=>{
 const {window}=parseHTML(await fs.readFile(path.join(__dirname,'../next-steps.html'),'utf8'));
 const a={bankVersion:'4.0',profile:{exposure:['EX-NONE'],interests:Object.fromEntries(bank.interests.map(i=>[i.id,3])),styles:Object.fromEntries(bank.styles.map(i=>[i.id,'A']))},responses:Object.fromEntries(bank.items.map(i=>[i.id,i.type==='Knowledge MCQ'?'A':i.type==='Structured practical task'?JSON.parse(bank.keys[i.id].reference):'test'])),stage:48,reviewed:true,selected:['Software Development','Database Administration'],reflections:{},scores:{careers:[{career:'Software Development',...row(6,0,0)},{career:'Database Administration',...row(6,4,4)}],grades:{}}};
 const cache=new Map([['astra-item-bank-v4',JSON.stringify(a)]]),ss={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)};
 window.AstraStorage={cache:ss,flush:async()=>{},navigate:()=>{}};
 const context={window,document:window.document,sessionStorage:ss,location:{search:'?bank=v4',pathname:'/next-steps.html'},URLSearchParams,setTimeout,console};
 for(const filename of ['bank-v4.js','learning-plan.js','assessment-v3.js'])vm.runInNewContext(await fs.readFile(path.join(__dirname,'../scripts/'+filename),'utf8'),context);
 assert.equal(window.document.querySelectorAll('.learning-path').length,2);
 assert.match(window.document.querySelector('.learning-path').textContent,/Build your skills/);
 assert.match(window.document.querySelectorAll('.learning-path')[1].textContent,/Explore a challenge/);
 assert.equal(window.document.querySelectorAll('a[target="_blank"][rel="noopener noreferrer"]').length,2);
 const reflection=window.document.querySelector('textarea');reflection.value='I tested a real zero.';reflection.oninput();assert.equal(JSON.parse(cache.get('astra-item-bank-v4')).reflections['Software Development'],reflection.value);
});
