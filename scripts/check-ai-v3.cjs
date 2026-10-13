// Development calibration only: source-bank anchors still need independent adjudication.
const v=require('../grading/v3'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const items=v.bank.items.filter(i=>i.type==='Written scenario'),report={bankVersion:v.version,rubricVersion:v.bank.rubricVersion,at:new Date().toISOString(),runs:[]};
 for(const [field,expected]of [['reference',4],['partial',2],['zero',0]]){
  const responses=Object.fromEntries(items.map(i=>{const raw=v.bank.keys[i.id][field];const quote=raw.match(/^Reference [02]\/4:\s*"([\s\S]*?)"/);return [i.id,quote?.[1]||raw];}));
  const result=await v.gradeWritten({bankVersion:v.version,responses});
  report.runs.push({expected,grades:result.grades,metadata:result.metadata});
 }
 report.exactAgreement=report.runs.flatMap(r=>r.grades.map(g=>g.points===r.expected)).filter(Boolean).length;
 const file=path.join(__dirname,'../outputs/ai-v3-reference-report.json');await fs.writeFile(file,JSON.stringify(report,null,2));
 console.log(`${report.exactAgreement}/18 v3 reference totals matched. This is a development check, not research validation.`);
 if(report.exactAgreement!==18)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
