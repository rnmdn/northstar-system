const crypto=require('node:crypto'),path=require('node:path');
function createStorage(v3){
const prefix='v'+v3.version.split('.')[0],key='astra-item-bank-'+prefix;
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=m=>{throw Object.assign(Error(m),{status:400});};
function validate(a){
 if(!a||a.bankVersion!==v3.version)fail('Invalid v3 assessment version.');
 const p=a.profile||{},interest={},style={};
 for(const [id,n]of Object.entries(p.interests||{})){if(!v3.bank.interests.some(i=>i.id===id)||!Number.isInteger(n)||n<1||n>5)fail('Invalid v3 interest response.');interest[id]=n;}
 for(const [id,n]of Object.entries(p.styles||{})){if(!v3.bank.styles.some(i=>i.id===id)||!['A','B'].includes(n))fail('Invalid v3 work-style response.');style[id]=n;}
 const exposure=p.exposure??null;
 if(exposure!==null&&(!Array.isArray(exposure)||new Set(exposure).size!==exposure.length||exposure.some(id=>!v3.bank.exposure.some(i=>i.id===id))||exposure.includes('EX-NONE')&&exposure.length!==1))fail('Invalid v3 exposure selections.');
 const selected=a.selected||[];if(!Array.isArray(selected)||selected.length>3||new Set(selected).size!==selected.length||selected.some(c=>!v3.bank.items.some(i=>i.career===c)))fail('Choose up to three career paths.');
 const reflections={};for(const [c,s]of Object.entries(a.reflections||{})){if(!v3.bank.items.some(i=>i.career===c)||typeof s!=='string'||s.length>2000)fail('Invalid reflection.');reflections[c]=s;}
 if(!Number.isInteger(a.stage)||a.stage<0||a.stage>48)fail('Invalid v3 stage.');
 for(const f of ['feedback','unclear'])if(a[f]!==undefined&&(typeof a[f]!=='string'||a[f].length>4000))fail('Invalid feedback.');
 return {bankVersion:v3.version,submittedAt:typeof a.submittedAt==='string'?a.submittedAt:null,profile:{interests:interest,styles:style,exposure},responses:v3.validate(a),stage:a.stage,reviewed:a.reviewed===true,selected,reflections,feedback:a.feedback||'',unclear:a.unclear||''};
}
function profileComplete(a){return a.profile.exposure?.length>0&&Object.keys(a.profile.interests).length===18&&Object.keys(a.profile.styles).length===5;}
function writtenAnswers(a){return Object.fromEntries(v3.bank.items.filter(i=>['Written scenario','Coding task','SQL task','HTML task'].includes(i.type)&&v3.nonempty(a.responses[i.id])).map(i=>[i.id,a.responses[i.id]]));}
const objectiveHash=a=>hash({bank:v3.version,source:v3.bank.sourceSha256,policy:'v3-grading-4',rubric:v3.bank.rubricVersion,responses:Object.fromEntries(v3.bank.items.filter(i=>i.type!=='Written scenario'&&Object.hasOwn(a.responses,i.id)).map(i=>[i.id,a.responses[i.id]]))});
const writtenHash=(a,model)=>hash({feedbackVersion:'student-v1',bank:v3.version,source:v3.bank.sourceSha256,policy:'v3-grading-4',rubric:v3.bank.rubricVersion,model,responses:writtenAnswers(a)});
async function scores(a,owner,store,dataDir,model){
 const objective=await store.read(path.join(dataDir,owner,prefix+'-objective-'+objectiveHash(a)+'.json'));
 const written=await store.read(path.join(dataDir,owner,prefix+'-written-'+writtenHash(a,model)+'.json'));
 const grades={};for(const i of v3.bank.items)grades[i.id]=objective?.grades[i.id]||{status:v3.nonempty(a.responses[i.id])?'pending':'unanswered',points:null};
 for(const g of written?.grades||[]){
  const item=v3.bank.items.find(i=>i.id===g.id),tested=grades[g.id];
  if(item.type==='Written scenario')grades[g.id]={...g,gradingMethod:'ai-rubric'};
  else if(tested.status==='graded')grades[g.id]={...tested,gradingMethod:'tests',aiFeedback:g.feedback,aiModel:written.metadata?.model};
  else if(tested.aiFallbackEligible)grades[g.id]={...g,gradingMethod:'ai-fallback',executionVerified:false,reviewRequired:true,checkerError:tested.error,aiModel:written.metadata?.model};
  else grades[g.id]={...tested,aiFeedback:g.feedback};
 }

 return {bankVersion:v3.version,rubricVersion:v3.bank.rubricVersion,grades,careers:v3.summary(grades),writtenMetadata:written?.metadata||null,scoredAt:objective?.scoredAt||null};
}
function features(a,scores){
 const values={};for(const item of v3.bank.items){const component=item.type==='Knowledge MCQ'?'knowledge':item.type==='Written scenario'?'written':'practical';values[item.feature]=scores.careers.find(c=>c.career===item.career)[component].percent;}
 for(const option of v3.bank.exposure.filter(i=>i.id!=='EX-NONE'))values[option.feature]=a.profile.exposure?.length?Number(a.profile.exposure.includes(option.id)):null;
 for(const career of [...new Set(v3.bank.interests.map(i=>i.career))]){const items=v3.bank.interests.filter(i=>i.career===career);values[items[0].feature]=items.every(i=>Object.hasOwn(a.profile.interests,i.id))?items.reduce((sum,i)=>sum+a.profile.interests[i.id],0)/items.length:null;}
 for(const item of v3.bank.styles)values[item.feature]=a.profile.styles[item.id]||null;
 return {version:v3.version==='4.0'?'v4-assessment-fields':'v3-proposed-features',values,mappingStatus:v3.version==='4.0'?'Six-domain schema confirmed; objective-domain-pilot-v1 transformation requires adviser/student validation':'Proposed only; no verified Random Forest mapping or recommendation weights'};
}
async function recommendation(a,scoreSet,owner,store,dataDir,model,create=false){
 if(!profileComplete(a)||!a.reviewed||!v3.responsesComplete(a))return {status:'incomplete',reason:'Complete and review your assessment first.'};
 const {mapStudent}=require('../ml/student-mapping.cjs'),rf=require('../ml/team-rf.cjs');
 const mapping=mapStudent(a,scoreSet);
 if(mapping.status!=='ready')return mapping;
 let modelInfo;try{modelInfo=rf.loadModel();}catch{throw Object.assign(Error('The career model is unavailable. Your answers are saved; retry after the server is checked.'),{status:503});}
 const fingerprint=hash({summaryVersion:'career-summary-v1',interests:a.profile.interests,mapping:mapping.version,values:mapping.values,parameters:mapping.parameters,model:modelInfo.sha256,source:v3.bank.sourceSha256,
  objective:objectiveHash(a),written:writtenHash(a,model),exposure:a.profile.exposure,grades:scoreSet.grades});
 const file=path.join(dataDir,owner,'rf-'+fingerprint+'.json');
 const cached=await store.read(file);if(cached)return cached;
 if(!create)return null;
 const result={...rf.predict(mapping.values),mapping,assessmentFingerprint:fingerprint,bankVersion:v3.version,
  rubricVersion:v3.bank.rubricVersion,generatedAt:new Date().toISOString()};
 result.summary=await require('../ml/result-summary.cjs').explain(result,a,scoreSet,v3.bank,{model});
 await store.write(file,result);return result;
}
async function enrich(raw,owner,store,dataDir,model){
 const a=validate(JSON.parse(raw));if(!profileComplete(a))a.reviewed=false;
 a.scores=await scores(a,owner,store,dataDir,model);a.features=features(a,a.scores);
 if(process.env.NORTHSTAR_RF_ENABLED!=='false')try{
  const result=await recommendation(a,a.scores,owner,store,dataDir,model);
  if(result?.topThree)a.recommendation=result;
 }catch{a.recommendationStatus='unavailable';} // Saving answers must still work if the model is missing.
 return JSON.stringify(a);
}
return {key,prefix,validate,profileComplete,objectiveHash,writtenHash,writtenAnswers,scores,enrich,features,recommendation};
}
const graders=require('../grading/v3'),stores={'3.0':createStorage(graders),'4.0':createStorage(graders.forVersion('4.0'))};
module.exports=stores['3.0'];
module.exports.forVersion=version=>{if(!stores[version])throw Object.assign(Error('Unsupported assessment bank version.'),{status:400});return stores[version];};
