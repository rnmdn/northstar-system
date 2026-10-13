(() => {
const menu = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  links.classList.toggle('open', open);
});
const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); links.classList.remove('open'); };
links.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && links.classList.contains('open')) { closeMenu(); menu.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
matchMedia('(max-width:650px)').addEventListener('change', closeMenu);

const form = document.getElementById('pilot-form');
const invalidateResults = () => {
  (window.AstraStorage?.cache || sessionStorage).removeItem('astra-skills-complete');
  (window.AstraStorage?.cache || sessionStorage).removeItem('astra-results-complete');
  window.updateJourney?.();
};
form.addEventListener('input', invalidateResults);
form.addEventListener('change', invalidateResults);
const [quizSection, tasksSection, codingSection] = form.querySelectorAll(':scope > section');
const quiz = document.getElementById('quiz');
const skillHeadings = [...quiz.querySelectorAll('.skill-group-heading')];
const questions = [...quiz.querySelectorAll('fieldset')];
const scenarios = [...document.querySelectorAll('#tasks > section')];
const pager = document.getElementById('assessment-pager');
const back = document.getElementById('stage-back');
const next = document.getElementById('stage-next');
const stageLabel = document.getElementById('stage-label');
const stageFill = document.getElementById('stage-fill');
const shortcuts = document.getElementById('stage-shortcuts');
const reviewMenu = document.getElementById('stage-review-menu');
const jumpSelect = document.getElementById('stage-jump');
const jumpButton = document.getElementById('stage-jump-go');
const returnButton = document.getElementById('stage-return');
const returnHint = document.getElementById('stage-return-hint');
const feedbackPanel = document.getElementById('practice-feedback');
const reviewParts = [...form.children].filter(element => ![quizSection, tasksSection, codingSection, pager, feedbackPanel].includes(element));
const stages = [
  ...questions.map((_, index) => ({ kind: 'quiz', title: `Knowledge check · ${skillHeadings[Math.floor(index / 5)].textContent}`, index })),
  ...scenarios.map((_, index) => ({ kind: 'scenarios', title: 'Practical scenario', index })),
  { kind: 'coding', title: 'JavaScript coding task' },
  { kind: 'review', title: 'Review your work' }
];
const stageKey = 'astra-skills-stage-v3';
const returnKey = 'astra-skills-return-v1';
const storedStage = new URLSearchParams(location.search).get('stage') === 'coding' ? 56 : Number((window.AstraStorage?.cache || sessionStorage).getItem(stageKey));
const stageError = document.createElement('p');
stageError.className = 'error';
stageError.setAttribute('role', 'alert');
stageError.hidden = true;
function missingForStage(index) {
  const stage = stages[index];
  if (stage.kind === 'quiz') return questions[stage.index].querySelector('input:checked') ? [] : [questions[stage.index]];
  if (stage.kind === 'scenarios') { const answer = scenarios[stage.index].querySelector('textarea').value; return answer.trim() && answer.length <= 2500 ? [] : [scenarios[stage.index]]; }
  if (stage.kind === 'coding') {
    let saved = {};
    try { saved = JSON.parse((window.AstraStorage?.cache || sessionStorage).getItem('astra-research-pilot-v0-1')) || {}; } catch { /* Invalid saved work remains incomplete. */ }
    return saved.coding?.lastRun?.version === 'larger_checks_v2_ast_v1' && saved.coding.code?.trim() ? [] : [document.getElementById('code-editor')];
  }
  return [];
}
const firstIncomplete = stages.findIndex((_, index) => missingForStage(index).length);
let currentStage = Number.isInteger(storedStage) && storedStage >= 0 && storedStage < stages.length ? Math.min(storedStage, firstIncomplete < 0 ? stages.length - 1 : firstIncomplete) : 0;
const storedReturn = (window.AstraStorage?.cache || sessionStorage).getItem(returnKey);
let returnStage = storedReturn === null ? null : Number(storedReturn);
if (!Number.isInteger(returnStage) || returnStage <= currentStage || returnStage >= stages.length) {
  returnStage = null;
  (window.AstraStorage?.cache || sessionStorage).removeItem(returnKey);
}

function stageName(index) {
  const stage = stages[index];
  if (stage.kind === 'quiz') return `question ${stage.index + 1}`;
  if (stage.kind === 'scenarios') return `scenario ${stage.index + 1}`;
  return stage.kind === 'coding' ? 'the coding task' : 'review';
}

function updateReturnButton() {
  if (returnStage === null) return;
  returnButton.disabled = stages.slice(currentStage, returnStage).some((_, offset) => missingForStage(currentStage + offset).length);
  returnHint.hidden = !returnButton.disabled;
}

function updateShortcuts() {
  const previous = stages.slice(0, currentStage).map((stage, index) => ({ stage, index })).filter(({ index }) => !missingForStage(index).length);
  shortcuts.hidden = !previous.length && returnStage === null;
  reviewMenu.hidden = !previous.length;
  jumpSelect.replaceChildren(new Option('Choose a completed step', '', true, true));
  jumpSelect.firstChild.disabled = true;
  let group;
  let groupName;
  previous.forEach(({ stage, index }) => {
    const name = stage.kind === 'quiz' ? stage.title.replace('Knowledge check · ', '') : stage.kind === 'scenarios' ? 'Written scenarios' : 'Coding task';
    if (name !== groupName) {
      group = document.createElement('optgroup');
      group.label = name;
      jumpSelect.append(group);
      groupName = name;
    }
    const detail = stage.kind === 'quiz' ? questions[stage.index].querySelector('legend').textContent : stage.kind === 'scenarios' ? scenarios[stage.index].querySelector('h3').textContent : 'JavaScript coding task';
    group.append(new Option(detail, String(index)));
  });
  returnButton.hidden = returnStage === null;
  if (returnStage !== null) {
    returnButton.textContent = `Return to ${stageName(returnStage)} →`;
    updateReturnButton();
  } else returnHint.hidden = true;
}

function showStage(index, moveFocus = false) {
  currentStage = index;
  if (index === returnStage) {
    returnStage = null;
    (window.AstraStorage?.cache || sessionStorage).removeItem(returnKey);
  }
  (window.AstraStorage?.cache || sessionStorage).setItem(stageKey, String(index));
  const stage = stages[index];
  quizSection.hidden = stage.kind !== 'quiz';
  tasksSection.hidden = stage.kind !== 'scenarios';
  codingSection.hidden = stage.kind !== 'coding';
  reviewParts.forEach(part => { part.hidden = stage.kind !== 'review'; });
  if (feedbackPanel) feedbackPanel.hidden = stage.kind !== 'review' || feedbackPanel.dataset.opened !== 'true';
  skillHeadings.forEach(heading => { heading.hidden = true; });
  questions.forEach((question, questionIndex) => { question.hidden = stage.kind !== 'quiz' || questionIndex !== stage.index; });
  scenarios.forEach((scenario, scenarioIndex) => { scenario.hidden = stage.kind !== 'scenarios' || scenarioIndex !== stage.index; });
  if (stage.kind === 'quiz') updateQuizProgress();
  stageLabel.textContent = stage.title;
  document.getElementById('stage-count').textContent = stage.kind === 'quiz' ? `Question ${stage.index + 1} of ${questions.length}` : stage.kind === 'scenarios' ? `Scenario ${stage.index + 1} of ${scenarios.length}` : `Step ${index + 1} of ${stages.length}`;
  stageFill.style.transform = `scaleX(${(index + 1) / stages.length})`;
  stageFill.parentElement.setAttribute('aria-valuemax', String(stages.length));
  stageFill.parentElement.setAttribute('aria-valuenow', String(index + 1));
  back.hidden = index === 0;
  next.hidden = index === stages.length - 1;
  next.textContent = index === stages.length - 2 ? 'Review your work →' : 'Next →';
  if (stage.kind === 'review') form.append(pager);
  else (stage.kind === 'quiz' ? quizSection : stage.kind === 'scenarios' ? tasksSection : codingSection).after(pager);
  form.prepend(stageError);
  stageError.hidden = true;
  reviewMenu.open = false;
  updateShortcuts();
  if (moveFocus) {
    stageLabel.scrollIntoView({ block: 'start', behavior: 'auto' });
    stageLabel.focus({ preventScroll: true });
  }
}

function updateQuizProgress() {
  const answered = questions.filter(question => question.querySelector('input:checked')).length;
  document.getElementById('quiz-progress').textContent = `${answered} of ${questions.length} knowledge questions answered`;
}

stageLabel.tabIndex = -1;
quiz.addEventListener('change', updateQuizProgress);
window.addEventListener('astra-skill-progress', updateReturnButton);
jumpButton.addEventListener('click', () => {
  if (jumpSelect.value === '') return;
  const target = Number(jumpSelect.value);
  if (!Number.isInteger(target) || target < 0 || target >= currentStage || missingForStage(target).length) return;
  if (returnStage === null) returnStage = currentStage;
  (window.AstraStorage?.cache || sessionStorage).setItem(returnKey, String(returnStage));
  showStage(target, true);
});
returnButton.addEventListener('click', () => {
  if (returnStage !== null && !returnButton.disabled) showStage(returnStage, true);
});
back.addEventListener('click', () => showStage(currentStage - 1, true));
next.addEventListener('click', () => {
  const missing = missingForStage(currentStage);
  if (missing.length) {
    stageError.textContent = stages[currentStage].kind === 'quiz' ? 'Choose an answer before continuing.' : stages[currentStage].kind === 'scenarios' ? 'Write a response of 1–2,500 characters before continuing.' : 'Edit your code and run the sample checks before continuing.';
    stageError.hidden = false;
    (missing[0].querySelector('input,textarea') || missing[0]).focus();
    return;
  }
  showStage(currentStage + 1, true);
});
showStage(currentStage);
})();
