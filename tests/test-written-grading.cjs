const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/skills-assessment.js'), 'utf8');
const gradingSource = source.slice(source.indexOf('let grading = false;'), source.indexOf('function updatePracticeFeedback()'));
class Element {
  constructor() { this.children = []; }
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
}
const elements = {};
const tasks = Array.from({ length: 6 }, (_, i) => ({ id: `P${i + 1}`, title: `Scenario ${i + 1}` }));
const state = { practical: Object.fromEntries(tasks.map(task => [task.id, 'Test answer'])) };
let calls = 0;
let respond;
let now = Date.now();
const timers = [];
class TestDate extends Date { static now() { return now; } }
const context = vm.createContext({
  window: {},
  tasks, state, Date: TestDate, Set, AbortSignal, save() {}, setTimeout: fn => timers.push(fn),
  document: { getElementById: id => elements[id] ??= new Element(), createElement: () => new Element() },
  fetch: () => { calls++; return new Promise(resolve => { respond = resolve; }); }
});
vm.runInContext(gradingSource + '\nglobalThis.grade = gradeWrittenAnswers;', context);
const response = (data, ok = true, type = 'application/json') => ({ ok, headers: { get: () => type }, json: async () => data });
(async () => {
  let pending = context.grade();
  await context.grade();
  assert.equal(calls, 1, 'Concurrent grading must issue only one request');
  assert.equal(elements['written-score'].textContent, '—');
  assert.equal(elements['grade-written'].disabled, true);
  respond(response({}, true, 'text/html'));
  await pending;
  assert.match(elements['written-feedback'].textContent, /unavailable on this server/);
  assert.equal(elements['grade-written'].hidden, false);
  assert.equal(state.grades, undefined, 'A failed request must not invent a score');
  pending = context.grade();
  respond(response({ grades: tasks.map(task => ({ id: task.id, points: 2, criteria: [1,1,0], feedback: 'Test feedback' })), metadata: {rubricVersion:'written_rubric_v2_criterion_scores',modelVersion:'test-version',provider:'Test double',gradedAt:new Date().toISOString()} }));
  await pending;
  assert.equal(elements['written-score'].textContent, 12);
  assert.equal(elements['written-grades'].children.length, 6);
  assert.equal(elements['grade-written'].hidden, true);
  assert.equal(state.grades.items.length, 6);
  state.practical.P1 = 'Changed answer';
  pending = context.grade();
  respond(response({error:'Quota reached',retryAfter:60},false));
  await pending;
  const previousCalls = calls;
  await context.grade();
  assert.equal(calls,previousCalls,'Cooldown must prevent immediate retries');
  assert.equal(elements['grade-written'].disabled,true);
  now += 61000;
  timers.shift()();
  assert.equal(elements['grade-written'].disabled,false);
  console.log('PASS: single request, pending score, non-JSON error, six graded responses and quota cooldown.');
})().catch(error => { console.error(error); process.exitCode = 1; });
