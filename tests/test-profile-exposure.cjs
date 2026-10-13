const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/student.js'), 'utf8');
const modelSource = source.slice(0, source.indexOf('let answers=read();')) + '\nglobalThis.profile = read();';
const read = value => {
  const context = { window: { AstraEvidence: { normalize: value => value || [] } }, sessionStorage: { getItem: () => JSON.stringify(value) } };
  vm.runInNewContext(modelSource, context);
  return context.profile;
};
assert.equal(read(null).exposureStatus, null);
assert.equal(read({ exposure: [] }).exposureStatus, null, 'Legacy empty answers must remain unanswered');
assert.equal(read({ exposure: [], exposureStatus: 'none' }).exposureStatus, 'none');
assert.equal(read({ exposure: [2] }).exposureStatus, 'selected');
assert.equal(read({ exposure: [2], exposureStatus: 'none' }).exposureStatus, 'selected');
assert.equal(read({ exposure: [99] }).exposure.length, 0);
const luminance = hex => {
  const channels = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
for (const background of ['e8e1ef', 'f6f2fa', 'e0cfee', 'ded3e9']) {
  assert.ok((luminance(background) + .05) / (luminance('584966') + .05) >= 4.5);
}
console.log('PASS: unanswered/none/selected states, legacy data and secondary text contrast.');
