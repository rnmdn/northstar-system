const test=require('node:test'),assert=require('node:assert/strict');
const v=require('../grading/v3').forVersion('4.0'),s=require('../storage/v3').forVersion('4.0');
const id='OB-SD10';
const input=source=>({bankVersion:'4.0',responses:{[id]:source}});
test('Invalid SQL is a graded zero while legitimate repair SQL is executed',async()=>{
 const result=await v.score({bankVersion:'4.0',responses:{'OB-DB10':'dsadsa'}});
 assert.equal(result.grades['OB-DB10'].status,'graded');assert.equal(result.grades['OB-DB10'].points,0);
 const syntax=await v.score({bankVersion:'4.0',responses:{'OB-DB10':'SELECT nonsense FROM Orders'}});
 assert.equal(syntax.grades['OB-DB10'].points,0);
});
test('Only checker limitations qualify for AI scoring; tests and invalid syntax remain authoritative',async()=>{
 const unsupported='function summarizeScores(scores) { const {length} = scores; return {count:length,total:0,average:0}; }';
 const objective=await v.score(input(unsupported));assert.equal(objective.grades[id].aiFallbackEligible,true);
 const failed=await v.score(input('function summarizeScores(scores) { return {count:0,total:0,average:null}; }'));
 assert.equal(failed.grades[id].status,'graded');assert(failed.grades[id].points<4);
 const invalid=await v.score(input('dsa'));assert.equal(invalid.grades[id].points,0);assert.equal(invalid.grades[id].aiFallbackEligible,undefined);
 const limited=await v.score(input('function summarizeScores(scores) { while(true) {} }'));assert.equal(limited.grades[id].aiFallbackEligible,false);
 for(const [response,original] of [[unsupported,objective],['dsa',invalid],['function summarizeScores(scores) { return {count:0,total:0,average:null}; }',failed]]){
  const record=input(response),ai={grades:[{id,status:'graded',maximum:4,criteria:[1,1,1,1],points:4,feedback:'AI review',evidence:['','','','']}],metadata:{model:'mock'}};
  const store={read:async file=>file.includes('-objective-')?original:ai};
  const result=await s.scores(record,'owner',store,'test-data','mock');
  if(original.grades[id].aiFallbackEligible){assert.equal(result.grades[id].points,4);assert.equal(result.grades[id].gradingMethod,'ai-fallback');assert.equal(result.grades[id].executionVerified,false);assert.equal(result.grades[id].reviewRequired,true);}
  else{assert.equal(result.grades[id].points,original.grades[id].points);assert.equal(result.grades[id].gradingMethod,'tests');assert.equal(result.grades[id].aiFeedback,'AI review');}
 }
 const absent=await s.scores(input(unsupported),'owner',{read:async file=>file.includes('-objective-')?objective:null},'test-data','mock');
 assert.equal(absent.grades[id].points,null);
});
test('Coding feedback and written responses share one Gemini request',async()=>{
 const source='function summarizeScores(scores) { return {count:0,total:0,average:null}; }',answer='The last element is skipped.';
 let calls=0;
 const result=await v.gradeWritten({bankVersion:'4.0',responses:{[id]:source,'OB-SD04':answer}},{key:'test',fetchImpl:async(url,options)=>{
  calls++;const payload=JSON.parse(options.body).contents[0].parts[0].text;assert(payload.includes('testResult'));assert(payload.includes(id));
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({grades:[{id,rubricVersion:v.bank.rubricVersion,criteria:[0,0,0,0],points:0,feedback:'Missing logic',evidence:['','','','']},{id:'OB-SD04',rubricVersion:v.bank.rubricVersion,criteria:[1,0,0,0],points:1,feedback:'Add correction and tests',evidence:[answer,'','','']}]})}]}}]})};
 }});
 assert.equal(calls,1);assert.equal(result.grades.length,2);
});
