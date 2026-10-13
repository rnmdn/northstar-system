// Researcher-only local maintenance. No dataset/model/backup HTTP endpoints exist.
const path=require('node:path');
const {backup,verify,restore}=require('../storage/maintenance');
const {lock}=require('../storage/maintenance');
const {privateStore}=require('../storage/private-store');
const fs=require('node:fs/promises');
const root=path.resolve(__dirname,'..');
const dataDir=process.env.ASTRA_DATA_DIR?path.resolve(process.env.ASTRA_DATA_DIR):path.join(root,'.astra-data');
const backupRoot=path.join(root,'.astra-backups');
async function main(){
  const [command,argument]=process.argv.slice(2);
  if(command==='initialize'){
    const unlock=lock(dataDir);
    try{
      const store=privateStore(dataDir);await store.write(path.join(dataDir,'storage-info.json'),{schemaVersion:1,initializedAt:new Date().toISOString()});
      let count=0;
      async function migrate(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isSymbolicLink())throw new Error('Storage must not contain links.');if(entry.isDirectory())await migrate(file);else if(entry.isFile()&&entry.name.endsWith('.json')){await store.read(file);count++;}}}
      await migrate(dataDir);console.log(`Private storage initialized; ${count} records checked and encrypted.`);
    }finally{unlock();}
    return;
  }
  if(command==='backup'){console.log('Backup saved:',await backup(dataDir,backupRoot));return;}
  const snapshot=argument&&path.resolve(argument);
  if(!snapshot||!snapshot.startsWith(backupRoot+path.sep))throw new Error('Choose a snapshot directory inside .astra-backups.');
  if(command==='verify'){const manifest=await verify(snapshot);console.log(`Backup verified: ${manifest.files.length} files.`);return;}
  if(command==='restore'){console.log('Restored into:',await restore(snapshot,path.join(root,'.astra-restored')));console.log('Set ASTRA_DATA_DIR to that path before starting the server.');return;}
  throw new Error('Usage: node scripts/storage-admin.cjs initialize | backup | verify <snapshot> | restore <snapshot>');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
