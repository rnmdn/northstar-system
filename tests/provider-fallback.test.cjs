const test=require('node:test'),assert=require('node:assert/strict');
const v=require('../grading/v3').forVersion('4.0'),id='OB-SD04',answer='The loop skips the last element.';
const input={bankVersion:'4.0',responses:{[id]:answer}};
const grades=[{id,rubricVersion:v.bank.rubricVersion,criteria:[1,0,0,0],points:1,feedback:'Add your correction and tests.',evidence:[answer,'','','']}];
function gemini(){return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({grades})}]}}]})};}
test('successful Gemini grading never calls backup',async()=>{
 let calls=0;const result=await v.gradeWritten(input,{key:'gemini-test',groqKey:'groq-test',fetchImpl:async url=>{calls++;assert.match(url,/googleapis/);return gemini();}});
 assert.equal(calls,1);assert.equal(result.metadata.provider,'Google Gemini');assert.equal(result.metadata.fallbackUsed,false);
});
for(const failure of ['timeout','quota','unavailable','invalid-output'])test(`Groq uses the same rubric after Gemini ${failure}`,async()=>{
 const calls=[];const result=await v.gradeWritten(input,{key:'gemini-test',groqKey:'groq-test',fetchImpl:async(url,options)=>{
  calls.push(url);
  if(url.includes('googleapis')){if(failure==='timeout')throw Object.assign(Error('private message'),{name:'TimeoutError'});if(failure==='invalid-output')return {ok:true,json:async()=>({})};return {ok:false,status:failure==='quota'?429:503,json:async()=>({})};}
  assert.equal(options.headers.Authorization,'Bearer groq-test');assert.equal(options.headers['x-goog-api-key'],undefined);
  const body=JSON.parse(options.body);assert.equal(body.response_format.json_schema.strict,true);assert.equal(body.model,'openai/gpt-oss-120b');assert(body.messages[0].content.includes(answer));
  return {ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify({grades})}}]})};
 }});
 assert.equal(calls.length,2);assert.equal(result.metadata.provider,'Groq');assert.equal(result.metadata.fallbackUsed,true);assert.equal(result.grades[0].points,1);
});
test('invented backup evidence and dual failures stay pending; invalid inputs never go to either API',async()=>{
 let calls=0;const options={key:'gemini-test',groqKey:'groq-test',fetchImpl:async url=>{calls++;return url.includes('googleapis')?{ok:false,status:503,json:async()=>({})}:{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({grades:[{...grades[0],evidence:['invented','','','']}]})}}]})};}};
 await assert.rejects(v.gradeWritten(input,options),e=>e.code==='ALL_PROVIDERS_UNAVAILABLE'&&!e.message.includes('gemini-test'));assert.equal(calls,2);
 calls=0;await assert.rejects(v.gradeWritten({bankVersion:'4.0',responses:{unknown:'answer'}},options));assert.equal(calls,0);
});
test('Groq rate limits preserve retry-after and stop repeated upstream attempts',async()=>{
 let backupCalls=0;const options={key:'gemini-test',groqKey:'groq-rate-test',fetchImpl:async url=>{
  if(url.includes('googleapis'))return {ok:false,status:503,json:async()=>({})};
  backupCalls++;return {ok:false,status:429,headers:new Headers({'retry-after':'120'}),json:async()=>({error:{message:'TPM exceeded; private upstream detail'}})};
 }};
 for(let attempt=0;attempt<2;attempt++)await assert.rejects(v.gradeWritten(input,options),e=>e.status===429&&e.code==='GRADING_RATE_LIMIT'&&e.retryAfter>=119&&!e.message.includes('private upstream detail'));
 assert.equal(backupCalls,1);
});
