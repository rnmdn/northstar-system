(() => {
// Generated from the versioned question banks and research-pilot.js.
// Draft, low-stakes pilot items. Keys are zero-based and visible in this static module.
// Do not use these items for secure testing or validated skill scores.
const quizVersion = 'skill_quiz_pilot_v0_1';
const items = [
  ['Q01','programming','F','What does a variable store in a program?',['A value that can be used later','A network address','A database table','A screen layout'],0],
  ['Q02','programming','F','Which structure repeats an action while a condition remains true?',['A loop','A comment','A constant','A file'],0],
  ['Q03','programming','A','A function returns x + 2. What does it return when x is 3?',['3','5','6','32'],1],
  ['Q04','programming','A','A test expects 4 but receives 5. What does this result establish?',['The tested behavior differs from the expectation','All code is incorrect','The test cannot be rerun','The program has a security flaw'],0],
  ['Q05','programming','D','A list has three entries at indexes 0, 1, and 2. Code tries to read index 3. What is the most direct fix?',['Read index 2 when the last entry is needed','Add a comment','Rename the list','Repeat the same read'],0],

  ['Q06','networks','F','What identifies a device interface on an IP network?',['An IP address','A file extension','A table name','A browser tab'],0],
  ['Q07','networks','F','What is DNS mainly used for?',['Resolving names to network addresses','Encrypting a disk','Joining database tables','Compiling code'],0],
  ['Q08','networks','A','Two devices use 192.168.1.10/24 and 192.168.1.20/24 on the same LAN. What can they normally do without a router?',['Communicate on that LAN','Reach every internet site','Use different subnet masks automatically','Ignore link connectivity'],0],
  ['Q09','networks','A','A device can ping its router but cannot resolve example.com. Which service should be checked first?',['DNS','Printer spooler','Database backup','Source control'],0],
  ['Q10','networks','D','One laptop loses Wi-Fi while nearby laptops remain connected. What is the best first check?',['Check that laptop’s Wi-Fi state and local connection','Replace the building router immediately','Reconfigure every switch','Disable the firewall for all users'],0],

  ['Q11','security','F','Authentication answers which question?',['Who is requesting access?','What files are backed up?','How fast is the network?','Which chart is best?'],0],
  ['Q12','security','F','What does least privilege mean?',['Give only access needed for a task','Give all users administrator access','Share one account across a team','Remove all logs'],0],
  ['Q13','security','A','An account has many failed logins followed by one successful login from a new location. What is a reasonable first interpretation?',['The event needs investigation','The account is certainly compromised','The event is certainly harmless','Logs should be deleted'],0],
  ['Q14','security','A','A colleague asks for your password to complete their task. What should you do?',['Decline and use an approved access request','Send the password privately','Post it in the team chat','Disable account monitoring'],0],
  ['Q15','security','D','A suspicious endpoint alert appears. Which response best preserves evidence while following procedure?',['Record details and escalate under the incident playbook','Delete the alert and wait','Publicly post the logs','Immediately wipe the device without authorization'],0],

  ['Q16','data_analysis','F','What is a missing value in a dataset?',['A field without an observed value','A guaranteed zero','A duplicate column','A chart title'],0],
  ['Q17','data_analysis','F','For values 2, 4, and 6, what is the mean?',['3','4','5','6'],1],
  ['Q18','data_analysis','A','Monthly users rise from 100 to 120. What is the percentage increase relative to 100?',['10%','20%','25%','120%'],1],
  ['Q19','data_analysis','A','A chart shows sales rose in June. Can it alone prove a new website caused the rise?',['No, other factors could explain it','Yes, timing proves cause','Yes, all charts prove cause','No, charts cannot show change'],0],
  ['Q20','data_analysis','D','A dataset contains duplicate orders. What should happen before counting unique orders?',['Identify duplicates using a reliable order ID','Add all rows without checking','Delete every repeated customer','Use only the first ten rows'],0],

  ['Q21','databases','F','What is a primary key used for?',['Uniquely identifying a table row','Encrypting every column','Drawing a chart','Starting a server'],0],
  ['Q22','databases','F','What does a foreign key usually represent?',['A reference to a row in another table','A network gateway','A backup file','A user password'],0],
  ['Q23','databases','A',"A query uses WHERE status = 'active'. Which rows should it return?",['Only rows whose status is active','Every row in the table','Only rows with missing status','Only duplicate rows'],0],
  ['Q24','databases','A','Each student can enroll in many courses, and each course has many students. What table is usually needed?',['An enrollment table linking student and course IDs','A single course-name field in student','A password table','No relationship table'],0],
  ['Q25','databases','D','A report counts the same order twice after joining orders to order_items. What is the likely reason?',['One order has multiple matching item rows','The database has no tables','The query ran too slowly','The order ID is encrypted'],0],

  ['Q26','interface_design','F','Why should a form field have a visible label?',['People can understand what to enter','It automatically stores answers','It makes the database faster','It replaces error messages'],0],
  ['Q27','interface_design','F','What is a usability test mainly used to observe?',['How people complete tasks with an interface','Server CPU temperature','Network packet loss','Code compilation speed'],0],
  ['Q28','interface_design','A','Two users cannot find the Submit button because it appears only after horizontal scrolling. Which change directly addresses the evidence?',['Keep the action visible within the layout','Increase database storage','Rename the API endpoint','Add more decorative images'],0],
  ['Q29','interface_design','A','A form shows “Error” after submission. Which message is more useful?',['“Enter a valid email address in Email.”','“Error.”','“Something happened.”','No message'],0],
  ['Q30','interface_design','D','A redesign looks cleaner, but users now take longer to finish a task. What should the team do next?',['Observe where users slow down and test a revision','Keep it because it looks cleaner','Hide completion time','Remove all labels'],0],

  ['Q31','problem_solving','F','What is a hypothesis in troubleshooting?',['A testable possible explanation','A guaranteed answer','A final report','A random change'],0],
  ['Q32','problem_solving','F','Why reproduce a reported problem?',['To observe conditions and check a proposed cause','To prove the user is wrong','To avoid recording evidence','To replace all system parts'],0],
  ['Q33','problem_solving','A','An app fails only after a new configuration is enabled. Which clue is most relevant?',['The configuration change and failure timing','The app logo color','The developer’s favorite tool','A different app’s version'],0],
  ['Q34','problem_solving','A','Two possible causes are a bad network route and a stopped app service. Which check best separates them?',['Test route reachability and service status separately','Restart everything at once','Change both settings together','Ask another user to guess'],0],
  ['Q35','problem_solving','D','A proposed fix does not change the symptom. What is the best next step?',['Revisit the hypothesis and collect new evidence','Declare success','Apply the same fix repeatedly','Delete the incident notes'],0],

  ['Q36','systems','F','What is an operating system service?',['A background process that provides a function','A printed report','A network cable','A spreadsheet cell'],0],
  ['Q37','systems','F','What do file permissions control?',['Who may read, change, or execute a file','How many files exist','The screen resolution','The network provider'],0],
  ['Q38','systems','A','A server shows disk use at 99%. Which symptom is plausible?',['New writes may fail','All network routes change','Every password expires','The CPU becomes a database'],0],
  ['Q39','systems','A','Before changing a production service setting, what is a safe preparation step?',['Record the current setting and rollback plan','Delete the logs','Share administrator credentials','Disable backups'],0],
  ['Q40','systems','D','A web service stops after a restart; the host responds to ping. What should be checked next?',['Service status and logs','Monitor brightness','Database table colors','Printer paper'],0],

  ['Q41','software_design','F','What does separation of concerns aim to do?',['Keep different responsibilities in appropriate components','Put all logic in one function','Avoid tests','Make every file identical'],0],
  ['Q42','software_design','F','What is an interface between components?',['An agreed way they exchange data or behavior','Only a visual screen','A backup schedule','A network address'],0],
  ['Q43','software_design','A','A checkout page formats prices and also calculates tax rules. Where should reusable tax calculation usually live?',['In a separate business-logic component','Only in the button color rule','In every page as copied code','In an image asset'],0],
  ['Q44','software_design','A','A form sends data to an API, which stores it in a database. Which sequence matches the data flow?',['Form, API, database','Database, form, API','API, database, form before input','Form, database, no API'],0],
  ['Q45','software_design','D','The same validation rule is copied across three pages and changes often. What is the most maintainable small change?',['Move the shared rule into one reusable function','Copy it to more pages','Delete validation','Change only one copy'],0],

  ['Q46','troubleshooting','F','Why record the exact error message?',['It provides a clue that can be checked','It guarantees the cause','It replaces a test','It increases bandwidth'],0],
  ['Q47','troubleshooting','F','What does a reproducible failure mean?',['The same steps can trigger it again','The problem is solved','Only one user can report it','Logs are unnecessary'],0],
  ['Q48','troubleshooting','A','A service error starts at 10:02, two minutes after a deployment. What should the investigator inspect first?',['Deployment changes and related logs','Yesterday’s weather','User profile photos','Unrelated printer settings'],0],
  ['Q49','troubleshooting','A','A site fails for one user but works for others. Which first test helps narrow scope?',['Try another browser or device for that user','Replace the database server','Delete every user account','Assume the site works for everyone'],0],
  ['Q50','troubleshooting','D','A fix appears to restore service. What best verifies resolution?',['Repeat the failing steps and monitor for recurrence','Close the incident without checking','Delete the original report','Change another setting'],0]
].map(([id, skill, level, stem, options, key], index) => {
  const offset = index % 4;
  return { id, skill, level, stem,
    options: [...options.slice(offset), ...options.slice(0, offset)],
    key: (key - offset + 4) % 4 };
});

// Draft prompts for low-stakes AI feedback.
const practicalVersion = 'practical_pilot_v0_1';
const tasks = [
  { id: 'P1', title: 'Software development', prompt: 'A function meant to return the larger of two numbers returns the smaller one when a = 8 and b = 3. Its logic is: if (a > b) return b; otherwise return a. Describe the defect, a correction, and one test you would run.' },
  { id: 'P2', title: 'Networking', prompt: 'A laptop has IP 192.168.10.25/24 and gateway 192.168.10.1. It can ping 192.168.10.1 but cannot open example.com. A second laptop on the same Wi-Fi can open it. Give one likely cause, a check that could confirm it, and a correction if confirmed.' },
  { id: 'P3', title: 'Cybersecurity', prompt: 'A sample alert shows ten failed sign-ins for one account, then a successful sign-in from a new location. You do not know whether the user is traveling. Explain what you would check, what evidence you would preserve, and when you would escalate. Do not assume compromise is certain.' },
  { id: 'P4', title: 'Data analytics', prompt: 'A club reports 80 sign-ups in June and 100 in July, then says its new poster caused a 25% increase. Calculate the percentage change and explain one reason the cause claim needs more evidence.' },
  { id: 'P5', title: 'Database administration', prompt: 'A report joins Orders(order_id, customer_id) with OrderItems(item_id, order_id). Order 42 has three items and appears three times. Explain why, describe a safe way to count orders, and name one check before changing a production query.' },
  { id: 'P6', title: 'UI/UX and web development', prompt: 'Two students using a mobile application form missed the Submit button because it was off-screen to the right. Describe a layout change, one accessibility check, and a quick test with users to see whether the change helps.' }
];


const key = 'astra-research-pilot-v0-1';
const codingVersion = 'javascript_larger_v0_1';
const starterCode = `function larger(a, b) {
  // Return the larger number.

}`;
let saved;
try { saved = JSON.parse((window.AstraStorage?.cache || sessionStorage).getItem(key)); } catch { /* Fresh pilot. */ }
const state = saved && saved.quizVersion === quizVersion ? saved : {
  participantCode: crypto.randomUUID(), quizVersion, practicalVersion,
  startedAt: new Date().toISOString(), answers: {}, practical: {}, unclear: '', feedback: ''
};
state.coding ??= { version: codingVersion, code: starterCode, runs: 0 };
state.answers = state.answers && typeof state.answers === 'object' && !Array.isArray(state.answers) ? state.answers : {};
state.practical = state.practical && typeof state.practical === 'object' && !Array.isArray(state.practical) ? state.practical : {};
tasks.forEach(task => { if (typeof state.practical[task.id] !== 'string') delete state.practical[task.id]; });
state.unclear = typeof state.unclear === 'string' ? state.unclear : '';
state.feedback = typeof state.feedback === 'string' ? state.feedback : '';
if (!state.coding || typeof state.coding !== 'object' || Array.isArray(state.coding)) state.coding = { version: codingVersion, code: starterCode, runs: 0 };
if (typeof state.coding.code !== 'string') state.coding.code = starterCode;
if (!Number.isInteger(state.coding.runs) || state.coding.runs < 0) state.coding.runs = 0;
state.grades ??= null;
const quiz = document.getElementById('quiz');
const tasksRoot = document.getElementById('tasks');
const evidenceSummary = document.getElementById('evidence-summary');
const practiceFeedback = document.getElementById('practice-feedback');
const domainNames = {
  programming: 'Programming', networks: 'Networking', security: 'Cybersecurity',
  data_analysis: 'Data analysis', databases: 'Databases', interface_design: 'Interface design',
  problem_solving: 'Problem solving', systems: 'Systems', software_design: 'Software design',
  troubleshooting: 'Troubleshooting'
};
const save = () => { (window.AstraStorage?.cache || sessionStorage).setItem(key, JSON.stringify(state)); window.dispatchEvent(new Event('astra-skill-progress')); };
function completion() {
  return {
    quizAnswered: items.filter(item => Number.isInteger(state.answers[item.id]) && state.answers[item.id] >= 0 && state.answers[item.id] <= 3).length,
    practicalCompleted: tasks.filter(task => typeof state.practical[task.id] === 'string' && state.practical[task.id].trim() && state.practical[task.id].length <= 2500).map(task => task.id),
    codingEdited: state.coding.code.trim() !== starterCode.trim(),
    codingRuns: state.coding.runs
  };
}
function updateEvidence() {
  const { quizAnswered, practicalCompleted, codingEdited, codingRuns } = completion();
  const entries = [
    `Knowledge questions: ${quizAnswered} of ${items.length} answered`,
    `Practical scenarios: ${practicalCompleted.length} of ${tasks.length} written${practicalCompleted.length ? ` (${practicalCompleted.join(', ')})` : ''}`,
    `Coding task: ${codingEdited ? 'code entered' : 'starter code only'}; ${codingRuns} ${codingRuns === 1 ? 'run' : 'runs'}${state.coding.lastRun ? `; latest run: ${state.coding.lastRun.status}` : ''}`,
    `Feedback: ${state.unclear.trim() || state.feedback.trim() ? 'added' : 'none added'}`
  ];
  evidenceSummary?.replaceChildren(...entries.map(entry => {
    const li = document.createElement('li');
    li.textContent = entry;
    return li;
  }));
  if (practiceFeedback && !practiceFeedback.hidden) updatePracticeFeedback();
}
let grading = false;
let gradingRetryAt = 0;
let objectiveScore = null;
let objectiveBusy = false;
let objectiveError = '';
const rubricVersion = 'written_rubric_v2_criterion_scores';
let gradingError = '';
const currentWrittenAnswers = () => tasks.map(task => ({ id: task.id, answer: state.practical[task.id] ?? '' }));
const writtenStamp = () => JSON.stringify(currentWrittenAnswers());
function renderWrittenFeedback() {
  const gradeList = document.getElementById('written-grades');
  const status = document.getElementById('written-feedback');
  const button = document.getElementById('grade-written');
  const scored = state.grades?.stamp === writtenStamp() && state.grades?.metadata?.rubricVersion === rubricVersion;
  button.disabled = grading || Date.now() < gradingRetryAt;
  button.textContent = Date.now() < gradingRetryAt ? `Retry in ${Math.ceil((gradingRetryAt-Date.now())/1000)}s` : 'Retry AI grading';
  button.hidden = scored || grading;
  gradeList.replaceChildren();
  const gradingRecord=document.getElementById('grading-record');if(gradingRecord)gradingRecord.hidden=!scored;
  if (scored) {
    const total = state.grades.items.reduce((sum, item) => sum + item.points, 0);
    document.getElementById('written-score').textContent = total;
    document.getElementById('written-summary').textContent = 'All six scenarios checked against their scoring criteria.';
    status.textContent = `${total} of 18 rubric points across six scenarios. Graded ${new Date(state.grades.metadata.gradedAt).toLocaleString()}.`;
    const provenance=document.getElementById('grading-provenance');
    if(provenance)provenance.textContent=`${state.grades.metadata.provider || 'AI'} · Model: ${state.grades.metadata.modelVersion} · Rubric: ${state.grades.metadata.rubricVersion} · Record: ${state.grades.metadata.recordId}`;
    gradeList.replaceChildren(...tasks.map(task => {
      const grade = state.grades.items.find(item => item.id === task.id);
      const li = document.createElement('li');
      const heading = document.createElement('div');
      heading.className = 'scenario-grade-heading';
      const title = document.createElement('strong');
      title.textContent = `${task.id} · ${task.title}`;
      const count = document.createElement('span');
      count.textContent = `${grade.points}/3`;
      heading.append(title, count);
      const feedback = document.createElement('p');
      feedback.textContent = grade.feedback;
      li.append(heading, feedback);
      return li;
    }));
  } else {
    document.getElementById('written-score').textContent = '—';
    document.getElementById('written-summary').textContent = grading ? 'Checking your six answers with AI…' : 'Six answers submitted. AI score unavailable.';
    status.textContent = grading ? 'Checking the required reasoning in each answer. This can take a moment.' : gradingError || 'Your written answers are ready for AI grading.';
  }
}
async function gradeWrittenAnswers() {
  if (grading || Date.now() < gradingRetryAt) return;
  const answers = currentWrittenAnswers();
  const stamp = JSON.stringify(answers);
  grading = true;
  gradingError = '';
  renderWrittenFeedback();
  try {
    const response = await fetch('/api/grade-scenarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(window.AstraStorage?.recordId ? {'X-Astra-Assessment':window.AstraStorage.recordId} : {}) },
      body: JSON.stringify({ answers }), signal: AbortSignal.timeout(35000)
    });
    if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('AI grading is unavailable on this server. Your answers are saved; try again later.');
    const data = await response.json();
    if (!response.ok) { const seconds = Math.min(3600, Math.max(0, Number(data.retryAfter || response.headers.get('retry-after')) || 0)); if (seconds) { gradingRetryAt = Date.now()+seconds*1000; const tick=()=>{renderWrittenFeedback();if(Date.now()<gradingRetryAt)setTimeout(tick,1000);};setTimeout(tick,1000); } throw new Error(data.error || 'AI grading is unavailable. Try again later.'); }
    if (!Array.isArray(data.grades) || data.grades.length !== tasks.length ||
      new Set(data.grades.map(item => item?.id)).size !== tasks.length ||
      data.grades.some(item => !item || !tasks.some(task => task.id === item.id) || !Number.isInteger(item.points) || item.points < 0 || item.points > 3 || typeof item.feedback !== 'string' || !Array.isArray(item.criteria) || item.criteria.length!==3 || item.criteria.some(value=>value!==0&&value!==1) || item.points!==item.criteria.reduce((sum,value)=>sum+value,0)) || data.metadata?.rubricVersion !== rubricVersion) {
      throw new Error('The AI returned an incomplete score. Please retry grading.');
    }
    if (writtenStamp() === stamp) {
      state.grades = { stamp, items: data.grades, metadata: data.metadata, at: data.metadata.gradedAt };
      save();
    }
  } catch (error) {
    gradingError = error.name === 'TimeoutError' ? 'AI grading took too long. Your answers are saved; retry grading.' : error.message;
  } finally {
    grading = false;
    renderWrittenFeedback();
  }
}
async function scoreObjective() {
  if(objectiveBusy)return;
  objectiveBusy=true;objectiveError='';objectiveScore=null;updatePracticeFeedback();
  try{
    const response=await fetch('/api/score-objective',{method:'POST',headers:{'Content-Type':'application/json',...(window.AstraStorage?.recordId?{'X-Astra-Assessment':window.AstraStorage.recordId}:{})},body:JSON.stringify({answers:state.answers,code:state.coding.code}),signal:AbortSignal.timeout(15000)});
    if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('Server scoring is unavailable. Start the updated Astra server and retry.');
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Server scoring failed.');
    if(!data.knowledge||data.knowledge.total!==50||!Number.isInteger(data.knowledge.correct)||!Array.isArray(data.knowledge.domains)||data.knowledge.domains.length!==10||!data.coding||!data.metadata?.recordId)throw new Error('The server returned incomplete assessment scores. Retry.');
    objectiveScore=data;state.objective=data;save();
  }catch(error){objectiveError=error.name==='TimeoutError'?'Server scoring timed out. Retry scoring.':error.message;}
  finally{objectiveBusy=false;updatePracticeFeedback();}
}
function updatePracticeFeedback() {
  const status=document.getElementById('objective-feedback');
  const retry=document.getElementById('score-objective');
  if(status)status.textContent=objectiveBusy?'Checking knowledge and coding on the server…':objectiveError|| (objectiveScore?'Knowledge and coding scores checked and saved on the server.':'Server scores unavailable.');
  if(retry){retry.hidden=!!objectiveScore||objectiveBusy;retry.disabled=objectiveBusy;}
  document.getElementById('knowledge-score').textContent=objectiveScore?.knowledge.correct??'—';
  document.getElementById('feedback-overview').textContent=objectiveScore?'50 answered. Server checked.':'Waiting for server validation.';
  const domains=objectiveScore?objectiveScore.knowledge.domains.map(item=>({...item,name:domainNames[item.id],count:item.correct})).sort((a,b)=>b.count-a.count):[];
  const highest=domains[0],lowest=domains.at(-1),varied=highest&&highest.count!==lowest.count;
  document.getElementById('results-highlight').textContent=!highest?'Your scores will appear after server validation.':varied?    'Highest knowledge score: '+highest.name+' ('+highest.count+'/5). Next to practice: '+lowest.name+' ('+lowest.count+'/5).':'Your knowledge scores are even across all ten areas.';
  document.getElementById('domain-feedback').replaceChildren(...domains.map(domain=>{
    const li=document.createElement('li'),row=document.createElement('div'),name=document.createElement('div'),heading=document.createElement('strong');row.className='domain-row';name.className='domain-name';heading.textContent=domain.name;name.append(heading);
    if(varied&&(domain.id===highest.id||domain.id===lowest.id)){const badge=document.createElement('span');badge.className=domain.id===lowest.id?'domain-badge practice':'domain-badge';badge.textContent=domain.id===lowest.id?'Next to practice':'Highest score';name.append(badge);}
    const count=document.createElement('span');count.className='domain-count';count.textContent=domain.count+' / '+domain.total;row.append(name,count);
    const bar=document.createElement('div'),fill=document.createElement('div');bar.className='domain-bar';bar.setAttribute('aria-hidden','true');fill.style.width=domain.count/domain.total*100+'%';bar.append(fill);li.append(row,bar);return li;
  }));
  const code=objectiveScore?.coding;
  document.getElementById('coding-score').textContent=code?.passed??'—';document.getElementById('coding-total').textContent=' / 8 checks passed';
  document.getElementById('coding-feedback').textContent=!code?'Waiting for server validation.':code.status==='unscored'?code.error:code.passed===code.total?'Your function returned the expected output for every server check.':'Some outputs differed from the expected result. Review your code and try again.';
  renderWrittenFeedback();
}
if (document.body.dataset.page === 'skills-results') {
  const complete = completion();
  const ready = complete.quizAnswered === items.length && complete.practicalCompleted.length === tasks.length && !!state.coding.lastRun;
  document.getElementById('results-empty').hidden = ready;
  document.getElementById('results-content').hidden = !ready;
  if (ready) {
    state.completedAt ??= new Date().toISOString();
    save();
    state.grades=null;
    updatePracticeFeedback();
    scoreObjective();
    // Always ask the server; its cache is authoritative, browser grades are not.
    state.grades=null;gradeWrittenAnswers();
    document.getElementById('score-objective').addEventListener('click',scoreObjective);
    document.getElementById('grade-written').addEventListener('click', gradeWrittenAnswers);
    const certificateName = document.getElementById('certificate-name');
    certificateName.value = state.certificate?.name ?? '';
    document.getElementById('certificate-form').addEventListener('submit', event => {
      event.preventDefault();
      const name = certificateName.value.trim();
      if (!name) {
        certificateName.setCustomValidity('Enter the name you want on your certificate.');
        certificateName.reportValidity();
        return;
      }
      state.certificate = { name, issuedAt: state.completedAt, recordId: state.participantCode };
      save();
      window.AstraStorage.navigate('certificate.html');
    });
    certificateName.addEventListener('input', () => certificateName.setCustomValidity(''));
for (const id of ['unclear', 'feedback']) {
  const field = document.getElementById(id);
  field.value = state[id] ?? '';
  field.addEventListener('input', () => { state[id] = field.value; save(); updateEvidence(); });
}
document.getElementById('download').addEventListener('click', () => {
  const output = {
    ...state, completion: completion(), exportedAt: new Date().toISOString(),
    elapsedMinutes: Math.round((Date.now() - Date.parse(state.startedAt)) / 60000)
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `astra-skills-${state.participantCode}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

  }
  return;
}
const shuffle = (values, seed) => [...values].sort((a, b) => {
  const hash = value => [...`${seed}:${value}`].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 0);
  return hash(a) - hash(b);
});

let currentSkill;
for (const item of items) {
  if (item.skill !== currentSkill) {
    currentSkill = item.skill;
    const heading = document.createElement('h3');
    heading.id = `skill-${currentSkill}`;
    heading.className = 'skill-group-heading';
    heading.textContent = domainNames[currentSkill];
    quiz.append(heading);
  }
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = `${item.id} · ${item.stem}`;
  fieldset.append(legend);
  const choices = document.createElement('div');
  choices.className = 'quiz-options';
  for (const optionIndex of shuffle([0, 1, 2, 3], `${state.participantCode}:${item.id}`)) {
    const label = document.createElement('label');
    label.className = 'option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = item.id;
    input.value = String(optionIndex);
    input.checked = state.answers[item.id] === optionIndex;
    input.addEventListener('change', () => { state.answers[item.id] = optionIndex; save(); updateProgress(); updateEvidence(); });
    const span = document.createElement('span');
    span.textContent = item.options[optionIndex];
    label.append(input, span);
    choices.append(label);
  }
  fieldset.append(choices);
  quiz.append(fieldset);
}

for (const task of tasks) {
  const section = document.createElement('section');
  const heading = document.createElement('h3');
  heading.textContent = `${task.id} · ${task.title}`;
  const prompt = document.createElement('p');
  prompt.textContent = task.prompt;
  const label = document.createElement('label');
  label.textContent = `Your response to ${task.id}`;
  label.htmlFor = task.id;
  const textarea = document.createElement('textarea');
  textarea.id = task.id;
  textarea.maxLength = 2500;
  textarea.setAttribute('aria-describedby', `${task.id}-rubric ${task.id}-limit`);
  textarea.value = state.practical[task.id] ?? '';
  textarea.addEventListener('input', () => { state.practical[task.id] = textarea.value; save(); updateEvidence(); });
  const rubric = document.createElement('details');
  rubric.className = 'task-rubric';
  rubric.id = `${task.id}-rubric`;
  const criteria = {
    P1: ['Identify the logic defect.', 'Describe a correction that returns the larger number.', 'Give a test with its expected result.'],
    P2: ['Give a plausible cause consistent with the observations.', 'Describe a check that separates possible causes.', 'Give a correction conditional on the check.'],
    P3: ['Investigate sign-in context without assuming compromise.', 'Preserve relevant sign-in evidence.', 'Explain when to escalate under incident procedure.'],
    P4: ['Use the original month as the percentage-change baseline.', 'Calculate the percentage increase correctly.', 'Explain why the cause claim needs more evidence.'],
    P5: ['Explain how the join creates repeated order rows.', 'Describe a safe way to count unique orders.', 'Name a check before changing a production query.'],
    P6: ['Describe a layout that keeps the submit action accessible.', 'Include a specific accessibility check.', 'Describe a user test to check whether the change helps.']
  };
  const summary = document.createElement('summary');
  summary.textContent = 'How this answer is scored · 3 points';
  const list = document.createElement('ul');
  criteria[task.id].forEach(criterion => { const li = document.createElement('li'); li.textContent = `1 point: ${criterion}`; list.append(li); });
  rubric.append(summary, list);
  const limit = document.createElement('p');
  limit.id = `${task.id}-limit`;
  limit.className = 'muted';
  limit.textContent = 'Maximum 2,500 characters. Explain your reasoning; exact wording is not required.';
  section.append(heading, prompt, rubric, label, textarea, limit);
  tasksRoot.append(section);
}

const editor = document.getElementById('code-editor');
const runButton = document.getElementById('run-code');
const resetButton = document.getElementById('reset-code');
const codeStatus = document.getElementById('code-status');
const codeOutput = document.getElementById('code-output');
editor.value = state.coding.code;
editor.addEventListener('input', () => { state.coding.code = editor.value; delete state.coding.lastRun; save(); updateEvidence(); });
resetButton.addEventListener('click', () => {
  editor.value = starterCode;
  state.coding.code = starterCode;
  delete state.coding.lastRun;
  save();
  updateEvidence();
  codeStatus.textContent = 'Starter code restored.';
  codeOutput.textContent = 'Run your code to see sample results.';
  editor.focus();
});
runButton.addEventListener('click', async () => {
  const codeAtRun=editor.value;
  if(!codeAtRun.trim()||codeAtRun.length>20000){codeStatus.textContent='Enter code within the 20,000-character limit.';editor.focus();return;}
  state.coding.code=codeAtRun;state.coding.runs+=1;delete state.coding.lastRun;save();updateEvidence();
  runButton.disabled=true;resetButton.disabled=true;editor.disabled=true;codeStatus.textContent='Running server checks…';codeOutput.textContent='';
  try{
    const response=await fetch('/api/score-objective',{method:'POST',headers:{'Content-Type':'application/json',...(window.AstraStorage?.recordId?{'X-Astra-Assessment':window.AstraStorage.recordId}:{})},body:JSON.stringify({answers:state.answers,code:codeAtRun}),signal:AbortSignal.timeout(15000)});
    if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('Server scoring is unavailable. Start the updated Astra server.');
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Code could not be checked.');
    if(data.coding?.status!=='scored')throw new Error(data.coding?.error||'This code could not be scored.');
    const code=data.coding;codeStatus.textContent=code.passed+' of '+code.total+' server checks passed.';
    state.objective=data;state.coding.lastRun={status:code.passed+' of '+code.total+' server checks passed',passed:code.passed,total:code.total,version:code.version,recordId:data.metadata.recordId,at:data.metadata.scoredAt};
    codeOutput.textContent=code.results.map(result=>(result.passed?'PASS':'TRY AGAIN')+'  larger('+result.input.join(', ')+') → '+(result.error??result.actual)+'; expected '+result.expected).join('\n');save();updateEvidence();
  }catch(error){codeStatus.textContent=error.name==='TimeoutError'?'Server checks timed out. Retry.':error.message;}
  finally{runButton.disabled=false;resetButton.disabled=false;editor.disabled=false;}
});

function updateProgress() {
  document.getElementById('quiz-progress').textContent = `${completion().quizAnswered} of ${items.length} questions answered`;
}
updateProgress();
updateEvidence();
save();
})();
