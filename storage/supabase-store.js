const path = require('node:path');
const crypto = require('node:crypto');
const { AsyncLocalStorage } = require('node:async_hooks');

function supabaseStore(directory, { url = process.env.SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY,
  encryptionKey = process.env.NORTHSTAR_STORAGE_KEY, fetch: request = global.fetch } = {}) {
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) throw new Error('Set SUPABASE_URL to the project HTTPS URL.');
  if (!secret || !(secret.startsWith('sb_secret_') || secret.startsWith('eyJ'))) throw new Error('Set a server-only Supabase secret key.');
  const key = Buffer.from(encryptionKey || '', 'base64');
  if (key.length !== 32 || key.toString('base64') !== encryptionKey) throw new Error('NORTHSTAR_STORAGE_KEY must be a base64 encoded 32-byte key.');
  const base = url.replace(/\/$/, '') + '/rest/v1/';
  const context = new AsyncLocalStorage();
  function recordKey(file) {
    const relative = path.relative(directory, file);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Record path is outside storage.');
    return crypto.createHash('sha256').update(relative.split(path.sep).join('/')).digest('hex');
  }
  async function api(route, body) {
    let response;
    try { response = await request(base + route, { method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: secret, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) }); }
    catch { throw Object.assign(new Error('Assessment storage is unavailable. Please retry.'), { status: 503 }); }
    if (!response.ok) throw Object.assign(new Error('Assessment storage is unavailable. Please retry.'), { status: 503 });
    return response.json();
  }
  async function read(file) {
    const rows = await api(`northstar_records?record_key=eq.${recordKey(file)}&select=envelope&limit=1`);
    if (!rows.length) return null;
    const data = rows[0].envelope;
    if (data.format !== 'astra-aes-gcm-v1') throw new Error('Invalid encrypted record.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.body, 'base64')), decipher.final()]).toString('utf8'));
  }
  async function write(file, value) {
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    const envelope = { format: 'astra-aes-gcm-v1', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), body: body.toString('base64') };
    await api('rpc/northstar_write', { p_key: recordKey(file), p_envelope: envelope, p_token: context.getStore() || null });
  }
  let queue = Promise.resolve();
  function exclusive(action) {
    const result = queue.then(async () => {
      const token = crypto.randomUUID(), deadline = Date.now() + 8000;
      while (!await api('rpc/northstar_acquire', { p_token: token })) {
        if (Date.now() >= deadline) throw Object.assign(new Error('Assessment storage is busy. Please retry.'), { status: 503 });
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      // Every write verifies the lease in the same database transaction.
      const renewal = setInterval(() => { api('rpc/northstar_acquire', { p_token: token }).catch(() => {}); }, 30000);
      renewal.unref();
      try { return await context.run(token, action); }
      finally { clearInterval(renewal); await api('rpc/northstar_release', { p_token: token }).catch(() => {}); }
    });
    queue = result.catch(() => {});
    return result;
  }
  async function syncTechnical(payload) {
    const response=await request(base+'rpc/northstar_sync_technical',{method:'POST',headers:{apikey:secret,'Content-Type':'application/json'},body:JSON.stringify({payload}),signal:AbortSignal.timeout(3000)});
    if(!response.ok)throw new Error('Technical reporting sync deferred.');
    return response.json();
  }
  return { read, write, exclusive, syncTechnical, ping: () => api('northstar_records?select=record_key&limit=1') };
}
module.exports = { supabaseStore };
