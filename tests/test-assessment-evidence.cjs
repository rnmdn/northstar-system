const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const context = { window: {}, URL };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/assessment-evidence.js'), 'utf8'), context);
const evidence = context.window.AstraEvidence;
assert.equal(evidence.validate([]).length, 0);
assert.equal(evidence.validate([{}]).length, 0);
const course = { type: 'course', title: 'Programming 1', skill: 'Programming', earned: '85', maximum: '100', grading: 'higher' };
assert.equal(evidence.validate([course]).length, 0);
assert.equal(evidence.validate([{ ...course, earned: '1.5', maximum: '5', grading: 'lower' }]).length, 0);
for (const patch of [{ earned: '101' }, { earned: '-1' }, { earned: 'abc' }, { maximum: '0' }, { skill: '' }, { title: ' ' }, { reference: 'javascript:alert(1)' }, { reference: 'https://' }]) {
  assert.ok(evidence.validate([{ ...course, ...patch }]).length > 0, JSON.stringify(patch));
}
assert.equal(evidence.validate([{ type: 'project', title: 'Class app', skill: 'Programming' }]).length, 0);
assert.equal(evidence.normalize(Array(10).fill(course)).length, 8);
assert.match(evidence.summary([{ type: 'project', title: '<img onerror=alert(1)>', skill: 'Programming' }]), /&lt;img/);
assert.equal(evidence.summary([course]).includes('85 on a scale up to 100'), true);
assert.equal(evidence.summary([{ ...course, grading: 'lower' }]).includes('lower is better'), true);
console.log('PASS: optional evidence, grade scales, invalid grades, skill selection, URL safety, limits and escaped review.');
