const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { supabaseStore } = require('../storage/supabase-store');
const directory = path.resolve('cloud-test-data');
function fixture() {
  const rows = new Map(), requests = [];
  let lease;
  const options = { url: 'https://testproject.supabase.co', secret: 'sb_secret_test', encryptionKey: crypto.randomBytes(32).toString('base64'),
    fetch: async (url, input) => {
      const body = input.body && JSON.parse(input.body); requests.push({ url, input });
      let result;
      if (url.endsWith('northstar_acquire')) { result = !lease || lease === body.p_token; if (result) lease = body.p_token; }
      else if (url.endsWith('northstar_release')) { result = lease === body.p_token; if (result) lease = null; }
      else if (url.endsWith('northstar_write')) { if (body.p_token && lease !== body.p_token) return new Response('', { status: 409 }); rows.set(body.p_key, body.p_envelope); result = true; }
      else { const key = new URL(url).searchParams.get('record_key')?.slice(3); result = rows.has(key) ? [{ envelope: rows.get(key) }] : []; }
      return Response.json(result);
    } };
  return { options, rows, requests };
}
test('cloud records survive a new store and only ciphertext crosses the API', async () => {
  const f = fixture(), file = path.join(directory, 'owner', 'assessment.json');
  const first = supabaseStore(directory, f.options);
  assert.equal(await first.read(file), null);
  await first.exclusive(() => first.write(file, { answer: 'private-student-answer', revision: 1 }));
  const second = supabaseStore(directory, f.options);
  assert.deepEqual(await second.read(file), { answer: 'private-student-answer', revision: 1 });
  assert.ok(!JSON.stringify([...f.rows]).includes('private-student-answer'));
  assert.ok(!JSON.stringify(f.requests).includes(f.options.encryptionKey));
  assert.ok(f.requests.every(r => !r.input.headers.Authorization));
  await assert.rejects(supabaseStore(directory, { ...f.options, encryptionKey: crypto.randomBytes(32).toString('base64') }).read(file));
});
test('multiple server stores serialize mutations with a shared database lease', async () => {
  const f = fixture(), a = supabaseStore(directory, f.options), b = supabaseStore(directory, f.options), file = path.join(directory, 'record.json');
  await a.write(file, { revision: 0 });
  async function increment(store) { return store.exclusive(async () => { const record = await store.read(file); await new Promise(resolve => setTimeout(resolve, 30)); await store.write(file, { revision: record.revision + 1 }); }); }
  await Promise.all([increment(a), increment(b)]);
  assert.equal((await a.read(file)).revision, 2);
});
test('configuration and provider failures fail closed', async () => {
  const f = fixture(), file = path.resolve(directory, '..', 'outside.json');
  assert.throws(() => supabaseStore(directory, { ...f.options, encryptionKey: '' }));
  assert.throws(() => supabaseStore(directory, { ...f.options, secret: 'sb_publishable_test' }));
  await assert.rejects(supabaseStore(directory, f.options).read(file), /outside/);
  await assert.rejects(supabaseStore(directory, { ...f.options, fetch: async () => { throw new Error('secret provider detail'); } }).ping(), error => error.status === 503 && !error.message.includes('secret'));
});
test('production refuses local storage and the health endpoint works locally', async () => {
  const { createServer } = require('../server');
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { assert.throws(() => createServer(), /Production requires/); }
  finally { if (old === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = old; }
  const fs = require('node:fs/promises'), os = require('node:os');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'northstar-cloud-test-'));
  const server = createServer({ dataDir: dir });
  try { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const result = await fetch(`http://127.0.0.1:${server.address().port}/healthz`); assert.equal(result.status, 200); assert.deepEqual(await result.json(), { status: 'ok' }); }
  finally { await new Promise(resolve => server.close(resolve)); await fs.rm(dir, { recursive: true, force: true }); }
});
