const v3Storage = require('./v3');
const versionStores=[v3Storage,v3Storage.forVersion('4.0')];
const objective = require('../grading/objective');
const rubric = require('../grading/rubric');
const crypto = require('node:crypto');
const path = require('node:path');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const profileKey = 'astra-student-profile-v1';
const assessmentKey = 'astra-research-pilot-v0-1';
const keys = [...versionStores.map(s=>s.key),profileKey, assessmentKey, 'astra-exploration-plan-v1', 'astra-assessment-unlocked-v1', 'astra-skills-stage-v3', 'astra-skills-return-v1', 'astra-review-complete', 'astra-skills-complete', 'astra-results-complete'];
const skills = ['Programming','Networks','Security','Data analysis','Databases','Interface design','Problem solving','Systems','Software design','Troubleshooting'];
const careers = [
  ['Software development',[0,6,8]], ['Networking',[1,9,7]], ['Cybersecurity',[2,1,6]],
  ['Data science & analytics',[3,0,6]], ['Database administration',[4,7,6]], ['UI/UX & web development',[5,0,6]]
];
const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function text(value, maximum) { if (typeof value !== 'string' || value.length > maximum) invalid('An assessment field is invalid or too long.'); return value; }
function ratings(value, count, maximum) {
  if (!object(value)) invalid('Invalid assessment ratings.');
  const result = {};
  for (const [key, rating] of Object.entries(value)) {
    if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= count || !Number.isInteger(rating) || rating < 0 || rating > maximum) invalid('Invalid assessment rating.');
    result[key] = rating;
  }
  return result;
}
function profile(value) {
  if (!object(value)) invalid('Invalid student profile.');
  const result = { skills: ratings(value.skills || {},10,3), interest: ratings(value.interest || {},6,3), style: ratings(value.style || {},3,1) };
  if (!Array.isArray(value.exposure) || value.exposure.length > 6 || value.exposure.some(i => !Number.isInteger(i) || i < 0 || i > 5)) invalid('Invalid prior exposure.');
  result.exposure = [...new Set(value.exposure)];
  result.exposureStatus = result.exposure.length ? 'selected' : value.exposureStatus === 'none' ? 'none' : null;
  const evidence=value.evidence ?? [];
  if (!Array.isArray(evidence) || evidence.length > 8) invalid('Invalid evidence.');
  // Incomplete evidence rows are valid drafts; submission validation remains separate.
  result.evidence = evidence.map(row => {
    if (!object(row) || !['course','project','certification'].includes(row.type) || !['higher','lower'].includes(row.grading) || (row.skill && !skills.includes(row.skill))) invalid('Invalid evidence field.');
    const clean = { type: row.type, grading: row.grading };
    for (const [field, maximum] of Object.entries({title:120,skill:50,provider:120,reference:300,earned:12,maximum:12,note:500})) clean[field] = text(row[field] ?? '',maximum);
    if (/^[a-z][a-z0-9+.-]*:/i.test(clean.reference) && !/^https?:\/\//i.test(clean.reference)) invalid('Evidence links must use http or https.');
    return clean;
  });
  return result;
}
function assessment(value) {
  if (!object(value)) invalid('Invalid assessment answers.');
  const result = { quizVersion: objective.bank.quizVersion, practicalVersion: objective.bank.practicalVersion, answers:{}, practical:{} };
  for (const [id, answer] of Object.entries(value.answers || {})) {
    if (!objective.bank.items.some(item => item.id === id) || !Number.isInteger(answer) || answer < 0 || answer > 3) invalid('Invalid knowledge answer.');
    result.answers[id] = answer;
  }
  for (const [id, answer] of Object.entries(value.practical || {})) {
    if (!Object.hasOwn(rubric.criteria,id)) invalid('Invalid scenario answer.');
    result.practical[id] = text(answer,2500);
  }
  for (const field of ['participantCode','startedAt','completedAt']) if (value[field] !== undefined) result[field] = text(value[field],80);
  for (const field of ['unclear','feedback']) result[field] = text(value[field] || '',4000);
  if (value.coding) result.coding = { version:'javascript_larger_v0_1',code:text(value.coding.code || '',20000),runs:Number.isInteger(value.coding.runs) && value.coding.runs >= 0 ? Math.min(value.coding.runs,100000):0 };
  if (value.certificate) result.certificate = {name:text(value.certificate.name || '',80),issuedAt:text(value.certificate.issuedAt || '',80),recordId:text(value.certificate.recordId || '',80)};
  return result;
}
function validateState(value) {
  if (!object(value) || Object.keys(value).some(key => !keys.includes(key))) invalid('Invalid assessment storage fields.');
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    text(raw,125000);
    const bankStore=versionStores.find(s=>s.key===key);
    if(bankStore){let a;try{a=JSON.parse(raw);}catch{invalid("Invalid assessment JSON.");}result[key]=JSON.stringify(bankStore.validate(a));continue;}
    if ([profileKey,assessmentKey,'astra-exploration-plan-v1'].includes(key)) {
      let parsed; try { parsed = JSON.parse(raw); } catch { invalid('Invalid saved assessment JSON.'); }
      if (key === profileKey) parsed = profile(parsed);
      else if (key === assessmentKey) parsed = assessment(parsed);
      else {
        if (!object(parsed) || !careers.some(([name]) => name === parsed.selected) || !object(parsed.tasks) || Object.keys(parsed.tasks).length > 18) invalid('Invalid exploration plan.');
        const tasks = {};
        for (const [name, task] of Object.entries(parsed.tasks)) {
          if (!careers.some(([career,indices]) => indices.some(index => `${career}:${skills[index]}` === name)) || !object(task)) invalid('Invalid practice task.');
          tasks[name] = { complete:task.complete === true, reflection:text(task.reflection || '',2000) };
        }
        parsed = {profile:text(parsed.profile || '',25000),selected:parsed.selected,tasks};
      }
      result[key] = JSON.stringify(parsed);
    } else if (key.endsWith('complete')) { if (raw !== 'true') invalid('Invalid completion state.'); result[key] = raw; }
    else { const number = Number(raw), max = key === 'astra-assessment-unlocked-v1' ? 3 : 57; if (!Number.isInteger(number) || number < 0 || number > max) invalid('Invalid assessment step.'); result[key] = String(number); }
  }
  return result;
}
async function enrich(state, owner, store, dataDir, model) {
  const result = { state:{...state}, recommendations:[], scores:{objective:null,written:null}, recommendationVersion:'profile_ranking_v1' };
  if (state[profileKey]) {
    const p = JSON.parse(state[profileKey]);
    if (Object.keys(p.skills).length === 10 && Object.keys(p.interest).length === 6 && Object.keys(p.style).length === 3) result.recommendations = careers.map(([name,indices], index) => ({name,index,score:indices.reduce((sum,i) => sum + p.skills[i],0)+(p.exposure.includes(index)?2:0),maximum:11,basis:'Self-rated skills and prior exposure; not Random Forest'})).sort((a,b) => b.score-a.score || a.index-b.index).slice(0,3);
  }
  if (state[assessmentKey]) {
    const a = JSON.parse(state[assessmentKey]);
    try {
      const scored = objective.score({answers:a.answers,code:a.coding?.code});
      const fingerprint = hash({answers:a.answers,code:a.coding.code,knowledge:scored.metadata.knowledgeVersion,coding:scored.metadata.codingVersion,policy:scored.metadata.policyVersion});
      const saved = await store.read(path.join(dataDir,owner,`objective-${fingerprint}.json`));
      result.scores.objective = saved || scored;
      a.objective = result.scores.objective;
      if (saved && saved.coding.status !== 'unscored') a.coding.lastRun = {status:`${saved.coding.passed} of ${saved.coding.total} server checks passed`,passed:saved.coding.passed,total:saved.coding.total,version:saved.metadata.codingVersion,recordId:saved.metadata.recordId,at:saved.metadata.scoredAt};
    } catch { /* Partial drafts have no complete objective score. */ }
    try {
      const answers = rubric.validateAnswers(Object.entries(a.practical).map(([id,answer]) => ({id,answer})));
      const fingerprint = hash({answers,rubric:rubric.version,model});
      const saved = await store.read(path.join(dataDir,owner,`written-${fingerprint}.json`));
      if (saved) { result.scores.written = saved; a.grades = {stamp:JSON.stringify(answers),items:saved.grades,metadata:saved.metadata,at:saved.metadata.gradedAt}; }
    } catch { /* No matching authoritative grade for this draft. */ }
    result.state[assessmentKey] = JSON.stringify(a);
  }
  // Navigation attestations cannot create a completed assessment without answers.
  let profileComplete = false;
  if(state[profileKey]) {
    const p=JSON.parse(state[profileKey]);
    profileComplete=Object.keys(p.skills).length===10&&Object.keys(p.interest).length===6&&Object.keys(p.style).length===3&&p.evidence.every(row=>{
      if(![row.title,row.skill,row.provider,row.reference,row.earned,row.maximum,row.note].some(value=>value.trim()))return true;
      return row.title.trim()&&row.skill&&(row.type!=='course'||(row.earned.trim()&&row.maximum.trim()&&Number.isFinite(Number(row.earned))&&Number.isFinite(Number(row.maximum))&&Number(row.maximum)>0&&Number(row.earned)>=0&&Number(row.earned)<=Number(row.maximum)));
    });
  }
  let skillsComplete=false;
  if(state[assessmentKey]) {
    const a=JSON.parse(state[assessmentKey]);
    skillsComplete=Boolean(result.scores.objective&&result.scores.objective.coding.status==='scored'&&a.coding?.lastRun&&Object.keys(rubric.criteria).every(id=>a.practical[id]?.trim()));
  }
  if(!profileComplete)delete result.state['astra-review-complete'];
  if(!profileComplete||!skillsComplete||!result.state['astra-review-complete'])delete result.state['astra-skills-complete'];
  if(!result.state['astra-skills-complete'])delete result.state['astra-results-complete'];
  for(const bankStore of versionStores)if(state[bankStore.key])result.state[bankStore.key]=await bankStore.enrich(state[bankStore.key],owner,store,dataDir,model);
  return result;
}
module.exports = { keys, validateState, enrich, hash };
