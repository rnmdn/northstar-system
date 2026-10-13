const fs=require('node:fs/promises');
const path=require('node:path');
const references=require('../grading/reference-answers.json');
const rubric=require('../grading/rubric');
const base=process.argv[2]||'http://127.0.0.1:8767';
const report={referenceVersion:references.version,rubricVersion:rubric.version,referenceStatus:references.status,at:new Date().toISOString(),sets:[]};
(async()=>{
  let cookie='';
  for(const set of references.sets){
    console.log(`Checking ${set.name}…`);
    // Separate reference sets use separate sessions to avoid the student retry cooldown.
    const response=await fetch(base+'/api/grade-scenarios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:set.answers}),signal:AbortSignal.timeout(35000)});
    const data=await response.json();
    if(!response.ok){report.error={status:response.status,message:data.error};console.log(`Live verification stopped: HTTP ${response.status}: ${data.error}`);break;}
    if(data.metadata?.rubricVersion!==rubric.version){report.error={message:'Start the updated server before running this check.'};break;}
    const grades=rubric.validateGrades(data.grades);
    report.sets.push({name:set.name,metadata:data.metadata,items:grades.map((grade,index)=>({id:grade.id,expected:set.expected[index],actual:grade.points,criteria:grade.criteria,feedback:grade.feedback}))});
    cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
    // Verify that retrying the identical submission uses the saved server record.
    const cached=await fetch(base+'/api/grade-scenarios',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({answers:set.answers}),signal:AbortSignal.timeout(35000)});
    const repeat=await cached.json();if(!repeat.cached||repeat.metadata?.recordId!==data.metadata.recordId)throw new Error('Identical submissions were not restored from the saved grade.');
  }
  const items=report.sets.flatMap(set=>set.items);report.checked=items.length;report.exactAgreement=items.length?items.filter(item=>item.expected===item.actual).length/items.length:null;report.meanAbsoluteError=items.length?items.reduce((sum,item)=>sum+Math.abs(item.expected-item.actual),0)/items.length:null;
  report.passed=!report.error&&items.length===18&&report.exactAgreement>=.9&&report.meanAbsoluteError<=.25;
  await fs.mkdir(path.join(__dirname,'../outputs'),{recursive:true});await fs.writeFile(path.join(__dirname,'../outputs/ai-reference-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checked:report.checked,exactAgreement:report.exactAgreement,meanAbsoluteError:report.meanAbsoluteError,passed:report.passed,error:report.error}));
  if(!report.passed)process.exitCode=1;
})().catch(async error=>{report.error={message:error.message};report.passed=false;await fs.writeFile(path.join(__dirname,'../outputs/ai-reference-report.json'),JSON.stringify(report,null,2));console.error(error.message);process.exitCode=1;});
