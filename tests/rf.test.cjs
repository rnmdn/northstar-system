const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {mapStudent, domains} = require('../ml/student-mapping.cjs');
const {predict, loadModel} = require('../ml/team-rf.cjs');
function scores(points = [6, 4, 4]) {
  return {careers: domains.map(([, career]) => ({career, ...Object.fromEntries(['knowledge', 'practical', 'written'].map((name, i) =>
    [name, {points: points[i], maximum: [6, 4, 4][i], graded: i ? 1 : 6, total: i ? 1 : 6}]))}))};
}
test('Exported RF matches sklearn on one-hot, uniform, random and split-boundary vectors', () => {
  const reference = JSON.parse(fs.readFileSync(path.join(__dirname, '../models/team-rf/prediction-reference.json')));
  assert.equal(loadModel().sha256, reference.modelSha256);
  reference.vectors.forEach((vector, n) => {
    const result = predict(vector);
    assert.deepEqual(result.classes, reference.classes);
    result.probabilities.forEach((p, i) => assert(Math.abs(p - reference.probabilities[n][i]) < 1e-12, `vector ${n}, class ${i}`));
    assert.equal(result.topThree.length, 3);
    assert(Math.abs(result.ranking.reduce((s, c) => s + c.probability, 0) - 1) < 1e-12);
  });
});
test('Mapping retains graded zero, blocks missing grades and exposure, and excludes preference inputs', () => {
  const a = {profile: {exposure: ['EX-NONE']}};
  assert.equal(mapStudent(a, scores([0, 0, 0])).status, 'insufficient_evidence');
  assert.equal(mapStudent({profile: {exposure: null}}, scores()).status, 'incomplete');
  assert.equal(mapStudent({profile: {exposure: ['EX-NONE', 'EX-SD']}}, scores()).status, 'incomplete');
  const pending = scores(); pending.careers[0].written.points = null;
  assert.equal(mapStudent(a, pending).status, 'incomplete');
  const forged = scores(); forged.careers[0].knowledge.points = 7;
  assert.equal(mapStudent(a, forged).status, 'incomplete');
  const uniform = mapStudent(a, scores());
  assert.deepEqual(uniform.features, loadModel().features);
  assert(uniform.values.every(v => Math.abs(v - 1 / 6) < 1e-12));
  const exposed = mapStudent({profile: {exposure: ['EX-SD']}}, scores([4, 3, 3]));
  assert.equal(exposed.evidence[0].value, 3 * 10 / 14 + 0.5);
  assert(exposed.values[0] > exposed.values[1]);
  assert.deepEqual(mapStudent({profile: {exposure: ['EX-NONE'], interests: {fake: 5}, styles: {fake: 'B'}}}, scores()).values, uniform.values);
  assert.throws(() => predict([0, 0, 0, 0, 0, 0]));
  assert.throws(() => predict([NaN, 0, 0, 0, 0, 1]));
});
test('RF endpoint stays gated and uses saved server grades, ownership and encrypted result caching', async () => {
  const fsp = require('node:fs/promises'), os = require('node:os');
  const v3 = require('../grading/v3'), storage = require('../storage/v3'), {createServer} = require('../server');
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'northstar-rf-'));
  const server = createServer({dataDir: dir, rfTesting: true, gradeV3: async a => ({
    grades: Object.keys(storage.writtenAnswers(a)).map(id => ({id, rubricVersion: v3.bank.rubricVersion,
      criteria: [1, 1, 1, 1], points: 4, feedback: 'Synthetic test grade', evidence: ['', '', '', '']})), metadata: {model: 'mock'}})});
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  let cookie = '', record;
  const post = async (route, body) => {
    const r = await fetch(base + route, {method: 'POST', headers: {'Content-Type': 'application/json', Cookie: cookie,
      'X-Astra-Assessment': record?.recordId || ''}, body: JSON.stringify(body)});
    cookie = r.headers.get('set-cookie')?.split(';')[0] || cookie;
    return {status: r.status, data: await r.json()};
  };
  try {
    record = (await post('/api/storage/load', {})).data;
    assert.equal((await post('/api/v3/recommend', {})).status, 422);
    const responses = Object.fromEntries(v3.bank.items.map(i => [i.id, i.type === 'Knowledge MCQ' ? v3.bank.keys[i.id].reference[0] : v3.bank.keys[i.id].reference.split(/\r?\n/)[0]]));
    Object.assign(responses, {
      'OB-NW09': {ipv4_address: '10.20.30.20', subnet_mask: '255.255.255.0', default_gateway: '10.20.30.1', dns_server: '10.20.30.53'},
      'OB-CS09': {student_own_draft: ['read', 'update'], student_other_draft: [], student_own_submitted: ['read'], researcher_any_submitted: ['read']},
      'OB-DA09': {cleaned_rows: [{id: 'A', minutes: 10}, {id: 'B', minutes: 20}], duplicates_removed: 1, missing_rows_removed: 1, mean_minutes: 15}
    });
    // The complete HTML reference has several lines.
    responses['OB-UX03'] = v3.bank.keys['OB-UX03'].reference;
    const a = {bankVersion: v3.version, responses, profile: {exposure: ['EX-NONE'],
      interests: Object.fromEntries(v3.bank.interests.map(i => [i.id, 3])), styles: Object.fromEntries(v3.bank.styles.map(i => [i.id, 'A']))},
      stage: 48, reviewed: true, selected: [], reflections: {}};
    const save = async () => {const r = await post('/api/storage/save', {recordId: record.recordId, revision: record.revision, state: {[storage.key]: JSON.stringify(a)}}); assert.equal(r.status, 200); record.revision = r.data.revision;};
    await save();
    assert.equal((await post('/api/v3/recommend', {})).status, 422);
    const input = {bankVersion: v3.version, responses};
    assert.equal((await post('/api/v3/score', input)).status, 200);
    assert.equal((await post('/api/v3/recommend', {})).status, 422); // Written still pending.
    assert.equal((await post('/api/v3/grade', input)).status, 200);
    const first = await post('/api/v3/recommend', {values: [1, 0, 0, 0, 0, 0], scores: {forged: 999}});
    assert.equal(first.status, 200);
    assert(first.data.mapping.values.every(n => Math.abs(n - 1 / 6) < 1e-12));
    assert.deepEqual((await post('/api/v3/recommend', {})).data, first.data);
    const other = await fetch(base + '/api/v3/recommend', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Astra-Assessment': record.recordId}, body: '{}'});
    assert.equal(other.status, 409);
    a.profile.exposure = ['EX-SD']; await save();
    const changed = await post('/api/v3/recommend', {});
    assert.equal(changed.status, 200);
    assert.notEqual(changed.data.assessmentFingerprint, first.data.assessmentFingerprint);
    assert(changed.data.mapping.values[0] > changed.data.mapping.values[1]);
    const mcq = v3.bank.items.find(i => i.type === 'Knowledge MCQ');
    a.responses[mcq.id] = a.responses[mcq.id] === 'A' ? 'B' : 'A'; await save();
    assert.equal((await post('/api/v3/recommend', {})).status, 422);
    assert.equal((await fetch(base + '/models/team-rf/forest.json')).status, 404);
    const ownerDirs = (await fsp.readdir(dir, {withFileTypes: true})).filter(d => d.isDirectory() && /^[a-f0-9]{64}$/.test(d.name));
    const results = (await fsp.readdir(path.join(dir, ownerDirs[0].name))).filter(n => n.startsWith('rf-'));
    assert.equal(results.length, 2);
    assert(!(await fsp.readFile(path.join(dir, ownerDirs[0].name, results[0]), 'utf8')).includes('Experimental'));
  } finally {await new Promise(r => server.close(r)); await fsp.rm(dir, {recursive: true, force: true});}
  const gatedDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'northstar-rf-gated-'));
  const gated = createServer({dataDir: gatedDir, rfTesting: false});
  await new Promise(r => gated.listen(0, '127.0.0.1', r));
  try {
    const r = await fetch('http://127.0.0.1:' + gated.address().port + '/api/v3/recommend', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
    assert.equal(r.status, 503); assert.equal((await r.json()).code, 'RF_TESTING_DISABLED');
  } finally {await new Promise(r => gated.close(r)); await fsp.rm(gatedDir, {recursive: true, force: true});}
});
