const test=require('node:test'),assert=require('node:assert/strict'),{explain,RULES}=require('../ml/result-summary.cjs');
const bank=require('../grading/bank-v4.json');
const careers=[...new Set(bank.items.map(i=>i.career))];
const result={topThree:careers.slice(0,3).map((career,n)=>({career,probability:.4-n*.1})),mapping:{evidence:careers.map(career=>({career,points:5,reportedExposure:false}))}};
const a={profile:{interests:Object.fromEntries(bank.interests.map(i=>[i.id,3]))}},scores={grades:{example:{gradingMethod:'ai-fallback'}}};
test('Summary accepts plain grounded output and preserves the original RF result',async()=>{
 const before=JSON.stringify(result);let calls=0;
 const out=await explain(result,a,scores,bank,{key:'test',fetchImpl:async(url,options)=>{calls++;const payload=JSON.parse(options.body);assert(payload.contents[0].parts[0].text.includes(RULES));assert(!payload.contents[0].parts[0].text.includes('studentResponse'));return {ok:true,json:async()=>({modelVersion:'mock',candidates:[{content:{parts:[{text:JSON.stringify({summary:'Software Development ranks first in your suggestions. Try an introductory programming activity and review your scores.'})}]}}]})};}});
 assert.equal(out.source,'ai');assert.equal(out.providerModel,'mock');assert.match(out.text,/without executing/);assert.equal(calls,1);assert.equal(JSON.stringify(result),before);
});
test('Quota, invalid output, unsafe claims and missing keys use the template',async()=>{
 for(const summary of ['Software Development is your perfect fit.','Software Development gives you 90% success.','<script>Software Development</script>','Networking ranks first.']){
  const out=await explain(result,a,scores,bank,{key:'test',fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({summary})}]}}]})})});assert.equal(out.source,'template');
 }
 assert.equal((await explain(result,a,scores,bank,{key:''})).source,'template');
 assert.equal((await explain(result,a,scores,bank,{key:'test',fetchImpl:async()=>({ok:false,status:429})})).source,'template');
 assert.equal((await explain(result,a,scores,bank,{key:'test',fetchImpl:async()=>{throw Error('timeout');}})).source,'template');
});
