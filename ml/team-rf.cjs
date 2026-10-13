const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {domains} = require('./student-mapping.cjs');
let cached;
function loadModel() {
  if (cached) return cached;
  const raw = fs.readFileSync(path.join(__dirname, '../models/team-rf/forest.json'));
  const model = JSON.parse(raw);
  const expected = domains.map(d => d[0]);
  if (model.version !== 'team-domain-rf-v1' || JSON.stringify(model.features) !== JSON.stringify(expected) ||
      !Array.isArray(model.classes) || model.classes.length !== 6 || new Set(model.classes).size !== 6 ||
      model.classes.some(c => !expected.includes(c)) || model.trees?.length !== 200) throw Error('Invalid RF schema.');
  for (const tree of model.trees) {
    const size = tree.left.length;
    for (const key of ['right', 'feature', 'threshold', 'probabilities']) if (tree[key]?.length !== size) throw Error('Invalid RF tree.');
    for (let n = 0; n < size; n++) {
      const p = tree.probabilities[n];
      if (p?.length !== 6 || p.some(v => !Number.isFinite(v) || v < 0 || v > 1) || Math.abs(p.reduce((s, v) => s + v, 0) - 1) > 1e-9) throw Error('Invalid RF leaf probabilities.');
      if (tree.left[n] === -1) {if (tree.right[n] !== -1) throw Error('Invalid RF leaf.');}
      else if (!Number.isInteger(tree.feature[n]) || tree.feature[n] < 0 || tree.feature[n] >= 6 ||
        !Number.isFinite(tree.threshold[n]) || ![tree.left[n], tree.right[n]].every(child => Number.isInteger(child) && child > n && child < size)) throw Error('Invalid RF split.');
    }
  }
  cached = {...model, sha256: crypto.createHash('sha256').update(raw).digest('hex')};
  return cached;
}
function predict(values) {
  if (!Array.isArray(values) || values.length !== 6 || values.some(v => !Number.isFinite(v) || v < 0 || v > 1) ||
      Math.abs(values.reduce((s, v) => s + v, 0) - 1) > 1e-9) throw Error('RF requires six nonnegative shares summing to one.');
  const model = loadModel(), input = values.map(Math.fround), probabilities = Array(6).fill(0);
  for (const tree of model.trees) {
    let node = 0;
    while (tree.left[node] !== -1) node = input[tree.feature[node]] <= tree.threshold[node] ? tree.left[node] : tree.right[node];
    tree.probabilities[node].forEach((p, index) => probabilities[index] += p / model.trees.length);
  }
  const ranking = model.classes.map((feature, i) => ({career: domains.find(d => d[0] === feature)[1], probability: probabilities[i]}))
    .sort((a, b) => b.probability - a.probability || a.career.localeCompare(b.career));
  return {modelVersion: model.version, modelSha256: model.sha256, sourceArtifactSha256: model.metadata.sourceSha256,
    validation: 'Experimental; pending adviser review', probabilities, classes: model.classes, ranking, topThree: ranking.slice(0, 3)};
}
module.exports = {predict, loadModel};
