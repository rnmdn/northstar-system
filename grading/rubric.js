const version = 'written_rubric_v2_criterion_scores';
const criteria = {
  P1:['Identify reversed return values','Correct to return a when a > b and b otherwise','Give a valid test with expected output, such as 8 and 3 expecting 8'],
  P2:['Give a plausible laptop-specific cause, such as DNS or proxy settings','Describe a check that distinguishes the cause from other failures','Give a correction conditional on that check'],
  P3:['Check sign-in context and user activity without assuming compromise','Preserve relevant sign-in evidence','Explain when to escalate under incident procedure'],
  P4:['Use June as the baseline: (100 - 80) / 80','Calculate the increase as 25%','Explain that timing alone does not prove the poster caused the increase'],
  P5:['Explain one-to-many join duplicates order rows','Count distinct order IDs or aggregate safely','Describe a production check, such as validating counts or a query plan'],
  P6:['Make the submit action visible without horizontal scrolling','Include a concrete accessibility check','Test the revised form with users']
};
function validateAnswers(answers) {
  if(!Array.isArray(answers)||answers.length!==6||answers.some(item=>!item||!Object.hasOwn(criteria,item.id)||typeof item.answer!=='string'||!item.answer.trim()||item.answer.length>2500)||new Set(answers.map(item=>item.id)).size!==6)throw new Error('Submit all six scenario answers within 2,500 characters each.');
  return Object.keys(criteria).map(id=>({id,answer:answers.find(item=>item.id===id).answer}));
}
function validateGrades(grades) {
  if(!Array.isArray(grades)||grades.length!==6||grades.some(item=>!item||!Object.hasOwn(criteria,item.id)||!Array.isArray(item.criteria)||item.criteria.length!==3||item.criteria.some(value=>value!==0&&value!==1)||!Number.isInteger(item.points)||item.points!==item.criteria.reduce((sum,value)=>sum+value,0)||typeof item.feedback!=='string'||!item.feedback.trim()||item.feedback.length>600)||new Set(grades.map(item=>item.id)).size!==6)throw new Error('The AI returned invalid or inconsistent criterion scores. Retry grading.');
  return Object.keys(criteria).map(id=>{const item=grades.find(item=>item.id===id);return {id,points:item.points,criteria:item.criteria,feedback:item.feedback};});
}
module.exports={version,criteria,validateAnswers,validateGrades};
