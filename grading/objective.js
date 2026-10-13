const bank=require('./question-bank.json');
const coding=require('./coding');
const policyVersion='skill_evidence_policy_v1';
const scenarioSkills={programming:'P1',networks:'P2',security:'P3',data_analysis:'P4',databases:'P5',interface_design:'P6'};
function score(input) {
  if(!input||!input.answers||typeof input.answers!=='object'||Array.isArray(input.answers)||Object.keys(input.answers).length!==50||bank.items.some(item=>!Number.isInteger(input.answers[item.id])||input.answers[item.id]<0||input.answers[item.id]>3))throw new Error('Submit one valid answer for each of the 50 knowledge questions.');
  if(typeof input.code!=='string'||!input.code.trim()||input.code.length>20000)throw new Error('Submit code within the 20,000-character limit.');
  const domains=[...new Set(bank.items.map(item=>item.skill))].map(skill=>{const questions=bank.items.filter(item=>item.skill===skill);return {id:skill,correct:questions.filter(item=>input.answers[item.id]===item.key).length,total:questions.length};});
  let code;
  try{code={...coding.scoreCode(input.code),status:'scored'};}catch(error){code={version:coding.version,status:'unscored',passed:null,total:8,error:error.message};}
  return {knowledge:{correct:domains.reduce((sum,item)=>sum+item.correct,0),total:50,domains},coding:code,skillScores:domains.map(item=>({skill:item.id,knowledgeScore:Math.round(item.correct/item.total*100),basis:'five knowledge questions only',additionalScenario:scenarioSkills[item.id]||null,additionalCoding:item.id==='programming',evidenceWeight:0,selfRatingWeight:0})),metadata:{knowledgeVersion:bank.quizVersion,codingVersion:coding.version,policyVersion,scoredAt:new Date().toISOString()}};
}
module.exports={score,bank,policyVersion};
