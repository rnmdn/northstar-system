const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createServer}=require('../server');
const objective=require('../grading/objective');
const coding=require('../grading/coding');
const rubric=require('../grading/rubric');
const ai=require('../grading/ai');
const references=require('../grading/reference-answers.json');
const vm=require('node:vm');
const answers=Object.fromEntries(objective.bank.items.map(item=>[item.id,item.key]));
const input={answers,code:'function larger(a,b){return Math.max(a,b);}'};
const grades=Object.keys(rubric.criteria).map(id=>({id,criteria:[1,1,1],points:3,feedback:'All criteria demonstrated.'}));
test('Knowledge and code are recalculated, independent of client totals',()=>{
  const scored=objective.score({...input,passed:0,knowledgeScore:0});assert.equal(scored.knowledge.correct,50);assert.equal(scored.coding.passed,8);assert.equal(scored.skillScores.length,10);
  assert.throws(()=>objective.score({...input,answers:{...answers,Q01:99}}));assert.throws(()=>objective.score({...input,answers:{Q01:0}}));
  assert.equal(objective.score({...input,code:'function larger(a,b){return Math.min(a,b)}'}).coding.passed,3);
  assert.equal(objective.score({...input,code:'function larger(a,b){while(true){} }'}).coding.status,'unscored');
});
test('Server answer keys match the current question wording and option order',async()=>{
  const source=await fs.readFile(path.join(__dirname,'../scripts/skills-assessment.js'),'utf8');
  const context={};vm.runInNewContext(source.slice(0,source.indexOf('const key ='))+'globalThis.items=items;})();',context);
  assert.equal(JSON.stringify(context.items),JSON.stringify(objective.bank.items));
});
test('Numeric interpreter supports legitimate solutions and rejects host access',()=>{
  for(const code of ['function larger(a,b){if(a>b)return a;else return b;}','const larger=(a,b)=>a>=b?a:b;','function larger(a,b){let answer=b;if(a>b)answer=a;return answer;}','function larger(a,b){if(a>b){var result=a;}else{var result=b;}return result;}'])assert.equal(coding.scoreCode(code).passed,8);
  for(const code of ['function larger(a,b){return process.exit()}','function larger(a,b){return Math.max.constructor("return process")()}','function larger(a,b){for(;;){}}','function larger(a,b){return fetch("https://example.com")}','function larger(a,b){return ({})["constructor"]}'])assert.throws(()=>coding.scoreCode(code));
  assert.equal(coding.scoreCode('function larger(a,b){const c=a;c=b;return c;}').passed,0);
});
test('Each AI criterion and sum must be internally consistent',()=>{
  assert.equal(rubric.validateGrades(grades).length,6);
  assert.throws(()=>rubric.validateGrades([{...grades[0],points:2},...grades.slice(1)]));
  assert.throws(()=>rubric.validateGrades([null,...grades.slice(1)]));
  assert.throws(()=>rubric.validateAnswers(Array(6).fill(null)));
  assert.throws(()=>rubric.validateGrades(grades.map(item=>({...item,id:'P1'}))));
});
test('Gemini success records versions; malformed outputs, quota and timeout stay errors',async()=>{
  const result=await ai.grade(references.sets[0].answers,{key:'test-only',fetchImpl:async()=>({ok:true,json:async()=>({modelVersion:'test-model-version',candidates:[{content:{parts:[{text:JSON.stringify({grades})}]}}]})})});
  assert.equal(result.metadata.modelVersion,'test-model-version');assert.equal(result.metadata.rubricVersion,rubric.version);
  await assert.rejects(ai.grade(references.sets[0].answers,{key:'test-only',fetchImpl:async()=>({ok:false,status:429,headers:{get:()=> '45'}})}),error=>error.status===429&&error.retryAfter===45);
  await assert.rejects(ai.grade(references.sets[0].answers,{key:'test-only',fetchImpl:async()=>{throw Object.assign(new Error(),{name:'TimeoutError'});}}),error=>error.status===504);
  await assert.rejects(ai.grade(references.sets[0].answers,{key:'test-only',fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'<html>'}]}}]})})}),error=>error.code==='INVALID_AI_RESPONSE');
});
test('HTTP saves records, restores after restart, deduplicates and blocks private files',async()=>{
  const testRoot=require('node:os').tmpdir();const directory=await fs.mkdtemp(path.join(testRoot,'grading-test-'));
  let calls=0,server;
  const provider=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,30));return {grades,metadata:{provider:'Test double',modelVersion:'test-version',gradedAt:new Date().toISOString()}};};
  async function start(){server=createServer({dataDir:directory,grade:provider,model:'test'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;}
  const post=(base,route,data,cookie='')=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});
  try{
    let base=await start();const objectiveResponse=await post(base,'/api/score-objective',input);assert.equal(objectiveResponse.status,200);const cookie=objectiveResponse.headers.get('set-cookie').split(';')[0];
    const [a,b]=await Promise.all([post(base,'/api/grade-scenarios',{answers:references.sets[0].answers},cookie),post(base,'/api/grade-scenarios',{answers:references.sets[0].answers},cookie)]);
    const first=await a.json(),second=await b.json();assert.equal(calls,1);assert.equal(first.metadata.recordId,second.metadata.recordId);
    const retry=await post(base,'/api/grade-scenarios',{answers:references.sets[0].answers},cookie);assert.equal((await retry.json()).cached,true);
    const changed=await post(base,'/api/grade-scenarios',{answers:references.sets[1].answers},cookie);assert.equal(changed.status,429);
    for(const route of ['/grading/question-bank.json','/.astra-data/test.json','/server.js','/node_modules/acorn/package.json','/outputs/ai-reference-report.json'])assert.equal((await fetch(base+route)).status,404);
    assert.equal((await post(base,'/api/score-objective',null)).status,400);
    await new Promise(resolve=>server.close(resolve));base=await start();const restored=await post(base,'/api/grade-scenarios',{answers:references.sets[0].answers},cookie);assert.equal((await restored.json()).metadata.recordId,first.metadata.recordId);assert.equal(calls,1);
  }finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));if(!directory.startsWith(testRoot+path.sep+'grading-test-'))throw new Error('Unsafe test cleanup path');await fs.rm(directory,{recursive:true,force:true});}
});
