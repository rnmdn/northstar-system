const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// One server process owns this directory. All files are replaced atomically.
function privateStore(directory) {
  let keyPromise;
  async function key() {
    if (!keyPromise) keyPromise = (async () => {
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const file = path.join(directory, 'storage.key');
      try { await fs.writeFile(file, crypto.randomBytes(32), { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      const value = await fs.readFile(file);
      if (value.length !== 32) throw new Error('Invalid storage encryption key.');
      return value;
    })();
    return keyPromise;
  }
  async function read(file) {
    let data;
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    // Read older grading records during migration; subsequent writes encrypt them.
    if (data.format !== 'astra-aes-gcm-v1') { await write(file,data); return data; }
    const decipher = crypto.createDecipheriv('aes-256-gcm', await key(), Buffer.from(data.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.body, 'base64')), decipher.final()]).toString('utf8'));
  }
  async function write(file, value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', await key(), iv);
    const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    const envelope = { format: 'astra-aes-gcm-v1', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), body: body.toString('base64') };
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    const temp = `${file}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(envelope), { mode: 0o600 });
    await fs.rename(temp, file);
  }
  let queue = Promise.resolve();
  function exclusive(action) {
    const result = queue.then(action);
    queue = result.catch(() => {});
    return result;
  }
  return { read, write, exclusive };
}
module.exports = { privateStore };
