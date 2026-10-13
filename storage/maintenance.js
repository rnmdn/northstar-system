const fs = require('node:fs/promises');
const sync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
function isRunning(directory) {
  try { const {pid}=JSON.parse(sync.readFileSync(path.join(directory,'server.lock'),'utf8')); process.kill(pid,0); return true; }
  catch(error) { if(error.code==='ESRCH'||error.code==='ENOENT')return false; throw error; }
}
function lock(directory) {
  sync.mkdirSync(directory,{recursive:true,mode:0o700});
  const file=path.join(directory,'server.lock');
  const token=crypto.randomUUID();
  try { sync.writeFileSync(file,JSON.stringify({pid:process.pid,token}),{flag:'wx',mode:0o600}); }
  catch(error) {
    if(error.code!=='EEXIST')throw error;
    if(isRunning(directory))throw new Error('This storage directory is already in use. Stop the server before maintenance.');
    sync.unlinkSync(file);
    sync.writeFileSync(file,JSON.stringify({pid:process.pid,token}),{flag:'wx',mode:0o600});
  }
  return ()=>{try{if(JSON.parse(sync.readFileSync(file,'utf8')).token===token)sync.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}};
}
async function inventory(directory) {
  const files=[];
  async function walk(relative='') {
    for(const entry of await fs.readdir(path.join(directory,relative),{withFileTypes:true})) {
      const name=path.join(relative,entry.name);
      if(entry.isSymbolicLink())throw new Error('Storage must not contain symbolic links.');
      if(entry.isDirectory())await walk(name);
      else if(entry.isFile() && entry.name!=='server.lock' && !entry.name.endsWith('.tmp'))files.push(name);
    }
  }
  await walk(); return files.sort();
}
async function backup(directory, backupRoot) {
  const unlock=lock(directory);
  try {
  if(!sync.existsSync(path.join(directory,'storage.key')))throw new Error('No initialized assessment storage was found.');
  await fs.mkdir(backupRoot,{recursive:true,mode:0o700});
  const target=path.join(backupRoot,`backup-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomBytes(3).toString('hex')}`);
  await fs.mkdir(target,{mode:0o700});
  const manifest={version:1,createdAt:new Date().toISOString(),files:[]};
  for(const name of await inventory(directory)) {
    const data=await fs.readFile(path.join(directory,name));
    const file=path.join(target,name);await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});await fs.writeFile(file,data,{mode:0o600});
    manifest.files.push({name,sha256:digest(data)});
  }
  await fs.writeFile(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
  // No automatic deletion: researchers choose retention for student records.
  return target;
  } finally { unlock(); }
}
async function verify(snapshot) {
  const manifest=JSON.parse(await fs.readFile(path.join(snapshot,'manifest.json'),'utf8'));
  if(manifest.version!==1||!Array.isArray(manifest.files)||!manifest.files.some(file=>file.name==='storage.key'))throw new Error('Invalid backup manifest.');
  for(const file of manifest.files) {
    if(typeof file.name!=='string'||path.isAbsolute(file.name)||file.name.split(/[\\/]/).some(part=>!part||part==='.'||part==='..'||part.includes(':')))throw new Error('Unsafe backup path.');
    const resolved=path.join(snapshot,file.name);
    if(await fs.realpath(resolved)!==resolved)throw new Error('Backup contains a symbolic link.');
    if(digest(await fs.readFile(resolved))!==file.sha256)throw new Error(`Backup integrity check failed: ${file.name}`);
  }
  return manifest;
}
async function restore(snapshot, target) {
  const manifest=await verify(snapshot);
  // Restore never overwrites a live or existing directory.
  await fs.mkdir(target,{recursive:false,mode:0o700});
  for(const file of manifest.files) {
    const destination=path.join(target,file.name);await fs.mkdir(path.dirname(destination),{recursive:true,mode:0o700});await fs.copyFile(path.join(snapshot,file.name),destination);await fs.chmod(destination,0o600);
  }
  return target;
}
module.exports={lock,backup,verify,restore};
