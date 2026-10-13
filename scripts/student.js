const paths=[
  {name:'Software development',description:'Build applications and services by designing, writing, testing, and improving code.',skills:['Programming','Problem solving','Software design'],resources:['Build a small application and document your decisions','Practice version control and code review','Study testing fundamentals']},
  {name:'Networking',description:'Connect and maintain systems, diagnose connectivity issues, and design reliable infrastructure.',skills:['Networks','Troubleshooting','Systems'],resources:['Set up a small virtual network lab','Practice routing and subnetting exercises','Document a troubleshooting walkthrough']},
  {name:'Cybersecurity',description:'Protect systems and information through risk assessment, monitoring, and secure practices.',skills:['Security','Networks','Problem solving'],resources:['Work through a legal beginner security lab','Study secure configuration basics','Create a simple threat model']},
  {name:'Data science & analytics',description:'Prepare, explore, and interpret data to answer questions and support decisions.',skills:['Data analysis','Programming','Problem solving'],resources:['Analyze an open dataset and explain your findings','Practice SQL queries and data cleaning','Build a small visual analysis']},
  {name:'Database administration',description:'Organize, protect, and maintain data systems so information stays usable and reliable.',skills:['Databases','Systems','Problem solving'],resources:['Design and query a relational database','Practice backup and recovery in a sandbox','Study data modeling fundamentals']},
  {name:'UI/UX & web development',description:'Shape usable digital experiences through research, interface design, and web implementation.',skills:['Interface design','Programming','Problem solving'],resources:['Redesign a student workflow with user feedback','Build an accessible responsive page','Practice usability testing with peers']}
];
const skillNames=['Programming','Networks','Security','Data analysis','Databases','Interface design','Problem solving','Systems','Software design','Troubleshooting'];
const skillLevels=['Not yet','Getting started','Can apply','Confident'];
const interests=['Building useful applications','Solving network and system issues','Protecting digital systems','Finding patterns in data','Organizing reliable databases','Designing usable interfaces'];
const exposure=['Completed a programming project','Configured a network or server','Practiced security tasks in a lab','Analyzed a dataset','Designed or queried a database','Designed or built a web interface'];
const styles=[['When solving a new problem, I would rather…','Prototype and iterate','Investigate and diagnose'],['I prefer work that is…','Visual and user-facing','Technical and behind the scenes'],['In a project, I often enjoy…','Creating a new solution','Making an existing system dependable']];
const practiceByPath={
  'Software development':{
    'Programming':'Build a small feature in an application, add two tests, and record what you changed.',
    'Problem solving':'Find a bug in a small application, test two possible causes, and explain the fix.',
    'Software design':'Sketch a feature’s components and data flow, then implement one small part.'
  },
  'Networking':{
    'Networks':'Configure two connected subnets in a virtual lab and verify traffic between them.',
    'Troubleshooting':'Break a lab connection intentionally, trace the failure, and document the fix.',
    'Systems':'Set up a virtual server, document its network settings, and test recovery.'
  },
  'Cybersecurity':{
    'Security':'Complete a legal beginner security lab and write a mitigation for one finding.',
    'Networks':'Map traffic between two lab systems and explain one risk and a safe rule.',
    'Problem solving':'Threat-model a small student app and test one mitigation in a sandbox.'
  },
  'Data science & analytics':{
    'Data analysis':'Clean an open dataset, make one chart, and explain what it does not prove.',
    'Programming':'Use Python to clean a small CSV, write two checks, and explain one trend.',
    'Problem solving':'Frame one question for an open dataset, compare two explanations, and report the limits.'
  },
  'Database administration':{
    'Databases':'Design a three-table database, load sample data, and write two useful queries.',
    'Systems':'Back up and restore a sample database in a sandbox, then document the recovery.',
    'Problem solving':'Investigate a slow sample query, test an index, and explain the trade-off.'
  },
  'UI/UX & web development':{
    'Interface design':'Sketch two ways to complete a student task, test them with two peers, and revise the clearer one.',
    'Programming':'Build an accessible responsive form from one tested design and check keyboard use.',
    'Problem solving':'Observe two people using a page, identify a point of friction, and test one fix.'
  }
};
const practicePlanByPath={
  'Software development':{time:'45–60 minutes',deliverable:'A small code change or design sketch with a short note',done:{'Programming':'The feature works, two tests pass, and you can explain the change.','Problem solving':'You can reproduce the bug, explain its cause, and show the fix.','Software design':'Your sketch shows the components and data flow, and one part is implemented.'}},
  'Networking':{time:'60–90 minutes',deliverable:'A lab setup or network diagram with test notes',done:{'Networks':'Both subnets exchange traffic and your diagram records the setup.','Troubleshooting':'The connection works again and your notes show how you found the fault.','Systems':'The server settings are documented and the recovery test succeeds.'}},
  'Cybersecurity':{time:'45–60 minutes',deliverable:'Safe lab notes with one risk and one mitigation',done:{'Security':'The legal lab is complete and your note explains one finding and mitigation.','Networks':'Your traffic map shows two systems, one risk, and a safe rule.','Problem solving':'Your threat model identifies a risk and your sandbox test shows a mitigation.'}},
  'Data science & analytics':{time:'45–60 minutes',deliverable:'A short analysis note with data, code, or a chart',done:{'Data analysis':'The data is cleaned, the chart is labeled, and your note names one limitation.','Programming':'Your script runs on a CSV, two checks pass, and the trend is explained.','Problem solving':'You document the question, two possible explanations, and one limitation.'}},
  'Database administration':{time:'45–60 minutes',deliverable:'A SQL file or recovery note with a small sample database',done:{'Databases':'Three tables contain sample data and both queries return expected results.','Systems':'The backup restores in a sandbox and the recovery steps are documented.','Problem solving':'You compare the query before and after an index and explain the trade-off.'}},
  'UI/UX & web development':{time:'60–90 minutes',deliverable:'A sketch or working page with brief feedback notes',done:{'Interface design':'Two sketches, feedback from two peers, and one revised design are saved.','Programming':'The form works by keyboard and adapts to a narrow screen.','Problem solving':'You record two observations and show the tested fix.'}}
};
const storeKey='astra-student-profile-v1';
const empty=()=>({skills:{},exposure:[],exposureStatus:null,evidence:[],interest:{},style:{}});
function read(){try{const x=JSON.parse((window.AstraStorage?.cache || sessionStorage).getItem(storeKey));if(!x||typeof x!=='object')return empty();return {
  skills:x.skills&&typeof x.skills==='object'&&!Array.isArray(x.skills)?x.skills:{},
  exposure:Array.isArray(x.exposure)?x.exposure.filter(i=>Number.isInteger(i)&&i>=0&&i<exposure.length):[],
  exposureStatus:Array.isArray(x.exposure)&&x.exposure.some(i=>Number.isInteger(i)&&i>=0&&i<exposure.length)?'selected':x.exposureStatus==='none'?'none':null,
  evidence:window.AstraEvidence.normalize(x.evidence),
  interest:x.interest&&typeof x.interest==='object'&&!Array.isArray(x.interest)?x.interest:{},
  style:x.style&&typeof x.style==='object'&&!Array.isArray(x.style)?x.style:{}
}}catch{return empty()}}
let answers=read();const save=()=>(window.AstraStorage?.cache || sessionStorage).setItem(storeKey,JSON.stringify(answers));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const validRating=v=>Number.isInteger(v)&&v>=0&&v<=3;
const firstIncompleteStep=()=>!skillNames.every((_,i)=>validRating(answers.skills[i]))?0:!interests.every((_,i)=>validRating(answers.interest[i]))?2:!styles.every((_,i)=>Number.isInteger(answers.style[i])&&answers.style[i]>=0&&answers.style[i]<=1)?3:null;
const complete=()=>firstIncompleteStep()===null&&window.AstraEvidence.validate(answers.evidence).length===0;
const scores=()=>paths.map((p,i)=>({...p,index:i,score:p.skills.reduce((n,s)=>n+(answers.skills[skillNames.indexOf(s)]||0),0)+(answers.exposure.includes(i)?2:0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
const appPage=document.body.dataset.page;
const flowNav=document.querySelector('.flow-nav');
document.querySelector('.flow-nav .active')?.setAttribute('aria-current','step');
const navToggle=document.querySelector('.nav-toggle');
const navLinks=document.getElementById('nav-links');
const closeNav=()=>{navToggle?.setAttribute('aria-expanded','false');navLinks?.classList.remove('open')};
navToggle?.addEventListener('click',e=>{const open=e.currentTarget.getAttribute('aria-expanded')==='true';e.currentTarget.setAttribute('aria-expanded',String(!open));navLinks.classList.toggle('open',!open)});
navLinks?.addEventListener('click',e=>{if(e.target.closest('a'))closeNav()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&navLinks?.classList.contains('open')){closeNav();navToggle?.focus()}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeNav()});
matchMedia('(max-width:650px)').addEventListener('change',closeNav);
function choose(name,labels,selected){return `<div class="choices ${labels.length===2?'two':''}">${labels.map((label,i)=>`<label class="choice"><input type="radio" name="${name}" value="${i}" ${selected===i?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div>`}
function needsProfile(target){if(!complete()){const step=firstIncompleteStep()??0;target.innerHTML=`<div class="notice"><p>Finish your assessment to view this page. Your answers are saved in this browser tab.</p></div><a class="button button-dark" href="assessment.html?step=${step}">Continue assessment →</a>`;return true}return false}
if(appPage==='assessment'){
  const sections=[
    {title:'Skills today',lead:'Choose your current ability in each area. Answer based on what you can do today.'},
    {title:'Prior exposure',lead:'Select only experiences you have completed. It is okay if none apply.'},
    {title:'Your interests',lead:'Rate what appeals to you. These answers add context to your results but do not change the ranking.'},
    {title:'Work style',lead:'Choose the statement that feels closer to you in each pair. Both can fit; pick the stronger one. These answers add context without changing your ranking.'}
  ];
  const nextLabels=['Continue to prior exposure','Continue to interests','Continue to work style','Review answers'];
  const fromReview=new URLSearchParams(location.search).get('from')==='review'&&complete();
  const unlockKey='astra-assessment-unlocked-v1';
  const requestedStep=Math.max(0,Math.min(3,Number(new URLSearchParams(location.search).get('step'))||0));
  const savedStep=Number((window.AstraStorage?.cache || sessionStorage).getItem(unlockKey));
  let step=Math.min(requestedStep,complete()?3:Number.isInteger(savedStep)&&savedStep>=0&&savedStep<=3?savedStep:0);
  const root=document.getElementById('assessment-content');
  let evidenceEditor;
  function render(focusHeading=false){document.getElementById('step-lead').textContent=sections[step].lead;document.getElementById('page-heading').textContent=sections[step].title;let fields='';
    if(step===0)fields=`<div class="scale-guide"><div class="scale-guide-heading"><strong>Choose the level you can demonstrate today</strong><details class="skill-demo"><summary>Watch a 9-second example</summary><figure><video controls muted playsinline preload="none" poster="../assets/skill-slider-demo.png" width="800" height="450" aria-label="Example of choosing a skill level"><source src="../assets/skill-slider-demo.mp4" type="video/mp4">Your browser does not support this video.</video><figcaption>Move a slider to the level you can demonstrate. </figcaption></figure></details></div><dl><div><dt>Not yet</dt><dd>I have not tried it</dd></div><div><dt>Getting started</dt><dd>I need guidance</dd></div><div><dt>Can apply</dt><dd>I can do it independently</dd></div><div><dt>Confident</dt><dd>I can explain my approach</dd></div></dl></div>`+skillNames.map((s,i)=>{const rated=validRating(answers.skills[i]);const value=rated?answers.skills[i]:0;return `<fieldset class="question skill-slider-question" data-question="skill-${i}"><legend id="skill-${i}-label">${esc(s)}</legend><output class="skill-slider-value" id="skill-${i}-value" for="skill-${i}">${rated?skillLevels[value]:'Move slider to choose'}</output><input class="skill-slider" id="skill-${i}" name="skill-${i}" type="range" min="0" max="3" step="1" value="${value}" data-answered="${rated}" aria-labelledby="skill-${i}-label" aria-valuetext="${rated?skillLevels[value]:'Not answered'}" aria-describedby="skill-${i}-value" style="--slider-fill:${rated?value/3*100:0}%"><div class="skill-slider-labels" aria-hidden="true">${skillLevels.map(label=>`<span>${label}</span>`).join('')}</div><p class="question-error" id="skill-${i}-error" hidden>Choose one level for ${esc(s)}.</p></fieldset>`}).join('');
    if(step===0)fields+='<section class="supporting-evidence" id="supporting-evidence" aria-label="Supporting skill evidence"></section>';
    if(step===1){const hints=['Class, personal or work project','Physical equipment or a virtual lab','An authorized practice lab or course exercise','Used data to answer a question','Created tables or wrote database queries','A mockup, prototype or working website'];fields=`<fieldset class="exposure-fieldset"><legend>Which experiences have you completed?</legend><div class="check-list">${exposure.map((s,i)=>`<label class="exposure-option"><input type="checkbox" name="exposure" value="${i}" ${answers.exposure.includes(i)?'checked':''}><span><strong>${esc(s)}</strong><small>${hints[i]}</small></span></label>`).join('')}<label class="exposure-option exposure-none"><input type="checkbox" name="exposure-none" ${answers.exposureStatus==='none'?'checked':''}><span><strong>None of these</strong><small>I have not completed any of these experiences yet</small></span></label></div></fieldset>`;}
    if(step===2)fields=interests.map((s,i)=>`<fieldset class="question" data-question="interest-${i}"><legend>${esc(s)}</legend>${choose('interest-'+i,['Not interested','A little','Interested','Very interested'],answers.interest[i])}<p class="question-error" id="interest-${i}-error" hidden>Choose one level for ${esc(s)}.</p></fieldset>`).join('');
    if(step===3)fields=styles.map((q,i)=>`<fieldset class="question" data-question="style-${i}"><legend>${esc(q[0])}</legend>${choose('style-'+i,[q[1],q[2]],answers.style[i])}<p class="question-error" id="style-${i}-error" hidden>Choose one answer for this question.</p></fieldset>`).join('');
    root.classList.toggle('work-style-step',step===3);
    document.getElementById('profile-sections').innerHTML=sections.map((section,index)=>`<li class="${index===step?'current':index<step?'past':''}" ${index===step?'aria-current="step"':''}><span>${index+1}. ${['Skills','Experience','Interests','Work style'][index]}</span></li>`).join('');
    document.getElementById('why-ask').textContent=['Your current skill ratings help us compare the six career paths. Rate what you can demonstrate today.','Completed experiences contribute to your career suggestions alongside your skill ratings. Choose “None of these” if none apply, or leave this optional question unanswered.','Your interests add context for reflection. They do not currently change the career ranking.','Your work preferences add context to your results. They do not currently change the career ranking.'][step];
    root.innerHTML=`<div class="answer-status"><span id="answered-count" role="status"></span>${step===1?'<span class="optional-chip">Optional</span>':''}</div><div class="answer-track" aria-hidden="true" ${step===1?'hidden':''}><div id="answer-progress"></div></div><form id="assessment-form" class="${step===2?'interest-form':step===3?'work-style-form':''}" novalidate>${fields}<p class="error" id="form-error" role="alert" hidden></p><div class="actions"><button class="back-link" id="back" type="button" ${step===0&&!fromReview?'hidden':''}>← ${fromReview?'Back to review':'Back'}</button><button class="button button-dark" type="submit">${fromReview?'Save and return to review':nextLabels[step]} →</button></div></form>`;
    updateProgress();
    const form=document.getElementById('assessment-form');
    evidenceEditor=step===0?window.AstraEvidence.mount(document.getElementById('supporting-evidence'),answers.evidence,rows=>{answers.evidence=rows;save();['astra-review-complete','astra-skills-complete','astra-results-complete'].forEach(key=>(window.AstraStorage?.cache || sessionStorage).removeItem(key));window.updateJourney?.();}):null;
    const demo=form.querySelector('.skill-demo');
    demo?.addEventListener('toggle',()=>{const video=demo.querySelector('video');if(demo.open&&!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(()=>{});else{video.pause();video.currentTime=0}});
    function refreshFormError(){const error=document.getElementById('form-error');if(error.hidden)return;const count=missingAnswers().length;error.hidden=count===0;if(count)error.textContent=`Answer ${count} remaining ${count===1?'question':'questions'} before continuing.`}
    function recordAnswer(target){if(target.matches('.skill-slider')){target.dataset.answered='true';target.style.setProperty('--slider-fill',`${Number(target.value)/3*100}%`);target.setAttribute('aria-valuetext',skillLevels[Number(target.value)]);target.setAttribute('aria-describedby',target.id+'-value');document.getElementById(target.id+'-value').textContent=skillLevels[Number(target.value)]}if(target.name==='exposure-none'&&target.checked)form.querySelectorAll('input[name="exposure"]').forEach(input=>input.checked=false);if(target.name==='exposure'&&target.checked)form.querySelector('input[name="exposure-none"]').checked=false;collect();(window.AstraStorage?.cache || sessionStorage).removeItem('astra-review-complete');(window.AstraStorage?.cache || sessionStorage).removeItem('astra-skills-complete');(window.AstraStorage?.cache || sessionStorage).removeItem('astra-results-complete');window.updateJourney?.();updateProgress();if(target.matches('input[name="exposure"],input[name="exposure-none"]')){const card=target.closest('.exposure-option');const count=document.getElementById('answered-count');card.classList.remove('just-changed');count.classList.remove('just-changed');void card.offsetWidth;card.classList.add('just-changed');count.classList.add('just-changed')}refreshFormError();const field=target.closest('.question');if(field){field.classList.remove('needs-answer');field.querySelector('.question-error').hidden=true;if(!target.matches('.skill-slider'))target.removeAttribute('aria-describedby')}}
    form.addEventListener('change',e=>recordAnswer(e.target));
    form.addEventListener('input',e=>{if(e.target.matches('.skill-slider'))recordAnswer(e.target)});
    form.addEventListener('pointerup',e=>{if(e.target.matches('.skill-slider'))recordAnswer(e.target)});
    form.addEventListener('keydown',e=>{if(e.target.matches('.skill-slider')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))recordAnswer(e.target)});
    document.getElementById('back').addEventListener('click',()=>{collect();if(fromReview){if(evidenceEditor&&!evidenceEditor.check())return;window.AstraStorage.navigate('review.html');return}if(step>0){step--;history.replaceState(null,'','assessment.html?step='+step);render(true);scrollTo(0,0)}});
    document.getElementById('assessment-form').addEventListener('submit',e=>{e.preventDefault();collect();if(evidenceEditor&&!evidenceEditor.check())return;const missing=missingAnswers();if(missing.length){const err=document.getElementById('form-error');err.textContent=`Answer ${missing.length} remaining ${missing.length===1?'question':'questions'} before continuing.`;err.hidden=false;missing.forEach(i=>{const name=(step===0?'skill':step===2?'interest':'style')+'-'+i;const field=root.querySelector(`[data-question="${name}"]`);field.classList.add('needs-answer');field.querySelector('.question-error').hidden=false;field.querySelectorAll('input').forEach(input=>input.setAttribute('aria-describedby',name+'-error'))});root.querySelector(`[data-question="${step===0?'skill':step===2?'interest':'style'}-${missing[0]}"] input`)?.focus();return}if(fromReview){window.AstraStorage.navigate('review.html');return}if(step<3){step++;(window.AstraStorage?.cache || sessionStorage).setItem(unlockKey,String(Math.max(step,Number((window.AstraStorage?.cache || sessionStorage).getItem(unlockKey))||0)));history.replaceState(null,'','assessment.html?step='+step);render(true);scrollTo(0,0)}else window.AstraStorage.navigate('review.html')});
    if(focusHeading){const heading=document.getElementById('page-heading');heading.tabIndex=-1;heading.focus({preventScroll:true})}
  }
  function collect(){if(evidenceEditor)answers.evidence=evidenceEditor.collect();if(step===1){answers.exposure=[...document.querySelectorAll('input[name="exposure"]:checked')].map(x=>Number(x.value));answers.exposureStatus=answers.exposure.length?'selected':document.querySelector('input[name="exposure-none"]:checked')?'none':null;}else{const key=step===0?'skills':step===2?'interest':'style';const prefix=step===0?'skill':step===2?'interest':'style';const selector=step===0?'input.skill-slider[data-answered="true"]':`input[name^="${prefix}-"]:checked`;document.querySelectorAll(selector).forEach(x=>{answers[key][Number(x.name.split('-')[1])]=Number(x.value)})}save()}
  function updateProgress(){const key=step===0?'skills':step===2?'interest':'style';const total=step===0?skillNames.length:step===1?exposure.length:step===2?interests.length:styles.length;const done=step===1?answers.exposure.length:Array.from({length:total},(_,i)=>answers[key][i]).filter(v=>step===3?Number.isInteger(v)&&v>=0&&v<=1:validRating(v)).length;document.getElementById('answered-count').textContent=step===1?answers.exposureStatus==='none'?'None of these selected':`${done} of ${total} experiences selected`:`${done} of ${total} answered`;document.getElementById('answer-progress').style.width=`${Math.round(done/total*100)}%`}
  function missingAnswers(){if(step===1)return [];const key=step===0?'skills':step===2?'interest':'style';const count=step===0?skillNames.length:step===2?interests.length:styles.length;return Array.from({length:count},(_,i)=>i).filter(i=>step===3?!(Number.isInteger(answers[key][i])&&answers[key][i]>=0&&answers[key][i]<=1):!validRating(answers[key][i]))}
  render();
}
if(appPage==='review'){
  const root=document.getElementById('review-content');if(!needsProfile(root)){
    const levels=['Not yet','Getting started','Can apply','Confident'];const interestLevels=['Not interested','A little','Interested','Very interested'];
    const reviewLink=(step,label)=>`<a class="review-edit" href="assessment.html?step=${step}&from=review" aria-label="Edit ${label}">Edit</a>`;
    root.innerHTML=`<div class="review-sheet"><section class="review-section" aria-labelledby="review-skills"><div class="review-section-head"><h3 id="review-skills">Skill proficiency</h3>${reviewLink(0,'skills')}</div><dl class="review-answers review-skills">${skillNames.map((s,i)=>`<div><dt>${esc(s)}</dt><dd>${levels[answers.skills[i]]}</dd></div>`).join('')}</dl></section><section class="review-section" aria-labelledby="review-evidence"><div class="review-section-head"><h3 id="review-evidence">Supporting skill evidence</h3>${reviewLink(0,'supporting evidence')}</div>${window.AstraEvidence.summary(answers.evidence)}<p class="evidence-disclaimer">Self-declared evidence; shown separately from objective assessment scores.</p></section><section class="review-section" aria-labelledby="review-exposure"><div class="review-section-head"><h3 id="review-exposure">Prior exposure</h3>${reviewLink(1,'prior exposure')}</div><ul class="review-simple-list">${answers.exposure.length?answers.exposure.map(i=>`<li>${esc(exposure[i])}</li>`).join(''):answers.exposureStatus==='none'?'<li>None of these experiences completed yet</li>':'<li>Not answered</li>'}</ul></section><section class="review-section" aria-labelledby="review-interests"><div class="review-section-head"><h3 id="review-interests">Interests</h3>${reviewLink(2,'interests')}</div><dl class="review-answers review-interests">${interests.map((s,i)=>`<div><dt>${esc(s)}</dt><dd>${interestLevels[answers.interest[i]]}</dd></div>`).join('')}</dl></section><section class="review-section" aria-labelledby="review-style"><div class="review-section-head"><h3 id="review-style">Work style</h3>${reviewLink(3,'work style')}</div><ul class="review-simple-list">${styles.map((q,i)=>`<li>${esc(q[1+answers.style[i]])}</li>`).join('')}</ul></section><div class="review-sheet-footer"><a class="button button-dark" href="skills-assessment.html">Continue to skills assessment →</a></div></div>`;
  }
}
if(appPage==='results'){
  const root=document.getElementById('results-content');if(!needsProfile(root)){
    const top=scores().slice(0,3);
    const levels=['Not yet','Getting started','Can apply','Confident'];
    const fav=Object.entries(answers.interest).filter(([,rating])=>rating>=2).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([i])=>interests[i]).join(' and ')||'No strong interests selected yet';
    const topTies=top.filter(p=>p.score===top[0].score);
    const tiedNames=topTies.map(p=>p.name);
    const tieNames=tiedNames.length===2?tiedNames.join(' and '):`${tiedNames.slice(0,-1).join(', ')}, and ${tiedNames.at(-1)}`;
    const ranking=top.map(p=>{
      const rank=top.findIndex(item=>item.score===p.score);
      const tied=top.filter(item=>item.score===p.score).length>1;
      const rankLabel=tied?`Joint ${['1st','2nd','3rd'][rank]}`:`0${rank+1}`;
      const skillEvidence=p.skills.map(s=>`<span>${esc(s)}: ${levels[answers.skills[skillNames.indexOf(s)]]}</span>`).join('');
      const exposureEvidence=answers.exposure.includes(p.index)?'Related completed experience included (+2).':'No related experience selected.';
      return `<li class="evidence-item"><span class="evidence-number">${rankLabel}</span><div><div class="evidence-title"><h4>${esc(p.name)}</h4><div class="evidence-score"><small>Profile score</small><strong>${p.score}<span> / 11</span></strong></div></div><div class="evidence-skills">${skillEvidence}</div><small>${exposureEvidence}</small></div></li>`;
    }).join('');
    const heroLabel=topTies.length>1?'Joint top paths':'First direction to explore';
    const heroTitle=topTies.length>1?`${topTies.length} paths share your top score.`:top[0].name;
    const heroText=topTies.length>1?`${tieNames} have the same profile score. Explore ${topTies.length===2?'either':'any of them'} first; their displayed order only breaks the tie.`:'See how all three paths compare below. This ranking reflects your self-rated skills and completed experiences.';
    root.innerHTML=`<div class="result-hero result-hero-compact"><small>${heroLabel}</small><h2>${esc(heroTitle)}</h2><p>${esc(heroText)}</p></div><p class="ranking-context">This profile ranking uses your skill ratings and completed experiences. Skills assessment answers are shown separately.</p><div class="result-grid"><article class="card results-ranking"><h3>Compare your top three</h3><ol class="evidence-list">${ranking}</ol><details class="score-method"><summary>How profile scores work</summary><p>Each path adds three related skill ratings (0–3 each) and 2 points for a matching completed experience. The maximum is 11. Equal scores are equally supported by your answers; the path list only sets their display order.</p></details></article><article class="card"><h3>Read the result</h3><p>A higher profile score reflects a closer match to what you reported today. Use these paths to guide exploration, not to limit what you can learn.</p><h3 class="context-heading">Your wider context</h3><p><strong>Interests:</strong> ${esc(fav)}</p><p class="context-line"><strong>Work style:</strong> ${esc(styles.map((q,i)=>q[1+answers.style[i]]).join('; '))}</p><p class="context-line">These preferences did not change the ranking.</p></article></div><div class="notice"><p>Use these paths to guide exploration and adviser conversations. You can revisit your answers as your skills and experience grow.</p></div><div class="actions"><a class="button button-outline" href="review.html">← Review answers</a><a class="button button-dark" href="next-steps.html">Plan your next steps →</a></div>`;
    let skillAnswerCount=0;
    try{const skillRecord=JSON.parse((window.AstraStorage?.cache || sessionStorage).getItem('astra-research-pilot-v0-1'));skillAnswerCount=Math.min(50,Object.values(skillRecord?.answers||{}).filter(value=>Number.isInteger(value)&&value>=0&&value<4).length)}catch{}
    const skillCard=document.createElement('article');skillCard.className='card skill-evidence';
    const skillHeading=document.createElement('h3');skillHeading.textContent='Skills assessment';
    const skillText=document.createElement('p');skillText.textContent=`${skillAnswerCount} of 50 knowledge questions answered. See your knowledge counts and practical responses on the skills results page. This career order currently uses your profile ratings and completed experiences.`;
    const skillLink=document.createElement('a');skillLink.href='skills-results.html';skillLink.textContent='View skill results →';
    skillCard.append(skillHeading,skillText,skillLink);root.querySelector('.notice')?.before(skillCard);
  }
}
if(appPage==='next'){
  const root=document.getElementById('next-content');if(!needsProfile(root)){
    const top=scores().slice(0,3);
    const topTieCount=top.filter(p=>p.score===top[0].score).length;
    const planKey='astra-exploration-plan-v1';
    const profileSnapshot=JSON.stringify(answers);
    let progress={profile:profileSnapshot,selected:top[0].name,tasks:{}};
    try {
      const saved=JSON.parse((window.AstraStorage?.cache || sessionStorage).getItem(planKey));
      if(saved?.profile===profileSnapshot && saved.tasks && typeof saved.tasks==='object') progress=saved;
    } catch { /* An invalid plan starts with empty progress. */ }
    let selected=Math.max(0,top.findIndex(p=>p.name===progress.selected));
    const savePlan=()=>(window.AstraStorage?.cache || sessionStorage).setItem(planKey,JSON.stringify(progress));
    function render(focusTab=false){
      const p=top[selected];
      const rating=s=>answers.skills[skillNames.indexOf(s)]||0;
      const focus=p.skills.slice().sort((a,b)=>rating(a)-rating(b))[0];
      const plan=practicePlanByPath[p.name];
      const taskKey=p.name+':'+focus;
      if(!progress.tasks[taskKey] || typeof progress.tasks[taskKey]!=='object') progress.tasks[taskKey]={};
      const task=progress.tasks[taskKey];
      task.complete=task.complete===true;
      task.reflection=typeof task.reflection==='string'?task.reflection.slice(0,2000):'';
      const levels=['Not yet','Getting started','Can apply','Confident'];
      document.getElementById('page-heading').textContent='Explore '+(p.name.startsWith('UI/UX')?p.name:p.name.charAt(0).toLowerCase()+p.name.slice(1))+'.';
      document.getElementById('plan-description').textContent=p.description;
      progress.selected=p.name;
      savePlan();
      root.innerHTML=`<section class="plan-switcher" aria-labelledby="path-choice-heading"><h3 id="path-choice-heading">Compare your three paths</h3><p>${topTieCount>1?`${topTieCount} paths share your top profile score. Their order only breaks the tie; choose any of them to explore first.`:'These paths reflect your self-rated skills and completed experiences. You can switch plans at any time.'}</p><div class="path-tabs" role="group" aria-labelledby="path-choice-heading">${top.map((x,i)=>`<button type="button" data-path="${i}" aria-pressed="${i===selected}" aria-controls="path-plan">${esc(x.name)}</button>`).join('')}</div><p class="plan-announcement" role="status">${esc(p.name)} plan selected.</p></section>
      <div id="path-plan">
        <section class="plan-evidence" aria-labelledby="plan-why-heading"><h3 id="plan-why-heading">Why this path appeared</h3><p>These self-reported inputs contributed to your profile score.</p><dl>${p.skills.map(s=>`<div><dt>${esc(s)}</dt><dd>${levels[rating(s)]}<span>Self-rating</span></dd></div>`).join('')}<div><dt>Related experience</dt><dd>${answers.exposure.includes(p.index)?esc(exposure[p.index]):'None selected'}<span>Self-reported</span></dd></div></dl></section>
        <section class="plan-practice" aria-labelledby="practice-heading"><div class="practice-heading-row"><h3 id="practice-heading">Your first practice task</h3><span id="practice-state">${task.complete?'Marked complete':'Ready to try'}</span></div><h4 class="practice-task-title">${esc(practiceByPath[p.name][focus])}</h4><p class="practice-reason">Focus on ${esc(focus)}: you rated it “${levels[rating(focus)]}”. This task gives you a concrete way to practise.</p><dl class="plan-task-meta"><div><dt>Time</dt><dd>${esc(plan.time)}</dd></div><div><dt>What you’ll make</dt><dd>${esc(plan.deliverable)}</dd></div></dl><div class="plan-done"><h4>Done when</h4><ul><li>${esc(plan.done[focus])}</li><li>You save your work and note one thing to improve next time.</li></ul></div><div class="plan-tracking"><label class="plan-complete"><input type="checkbox" id="practice-complete" ${task.complete?'checked':''}><span>I completed this practice task</span></label><p class="plan-attestation">Your own progress record; this does not change your assessment score.</p><label for="practice-reflection">What did you learn, and what will you try next? <span>Optional</span></label><textarea id="practice-reflection" rows="3" maxlength="2000">${esc(task.reflection||'')}</textarea><p id="plan-save-status" role="status">Progress and reflection are saved with your assessment.</p></div></section>
        <section class="plan-more" aria-labelledby="plan-more-heading"><h3 id="plan-more-heading">More ways to explore</h3><ul>${p.resources.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></section>
      </div><p class="plan-footnote">These practice ideas are starting points. Check current role requirements and discuss your plan with an adviser.</p><div class="actions plan-actions"><a class="button button-outline" href="results.html">← Compare career results</a><button class="plan-restart" id="restart" type="button">Start a new assessment</button></div><div class="restart-confirm" id="restart-confirm" hidden><p>Starting again creates a separate assessment. Keep your recovery code if you want to return to this one.</p><button class="button button-outline" id="cancel-restart" type="button">Keep my answers</button><button class="button button-dark" id="confirm-restart" type="button">Start a separate assessment</button></div>`;
      document.getElementById('practice-complete').addEventListener('change',event=>{
        task.complete=event.target.checked;
        savePlan();
        document.getElementById('practice-state').textContent=task.complete?'Marked complete':'Ready to try';
        document.getElementById('plan-save-status').textContent=task.complete?'Task marked complete. Waiting to save. See the save status above.':'Task marked incomplete. Waiting to save. See the save status above.';
      });
      document.getElementById('practice-reflection').addEventListener('input',event=>{
        task.reflection=event.target.value;
        savePlan();
        document.getElementById('plan-save-status').textContent='Reflection updated. See the save status above.';
      });
      root.querySelectorAll('[data-path]').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.path);render(true)}));if(focusTab)root.querySelector(`[data-path="${selected}"]`).focus({preventScroll:true});document.getElementById('restart').addEventListener('click',()=>{const confirm=document.getElementById('restart-confirm');confirm.hidden=false;document.getElementById('cancel-restart').focus()});document.getElementById('cancel-restart').addEventListener('click',()=>{document.getElementById('restart-confirm').hidden=true;document.getElementById('restart').focus()});document.getElementById('confirm-restart').addEventListener('click',()=>window.AstraStorage.fresh().catch(error=>{document.querySelector('#restart-confirm p').textContent=error.message}));
    }render();
  }
}


