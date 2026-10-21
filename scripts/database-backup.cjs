const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const backup=require('../storage/database-backup');
const root=path.resolve(__dirname,'..');
async function main(){
  const [command,input,output]=process.argv.slice(2);
  if(command==='export-sql'){
    const destination=path.resolve(input||path.join(os.tmpdir(),'northstar-backup-export.sql'));
    await fs.writeFile(destination,backup.exportSQL(),{flag:'wx',mode:0o600});console.log('Read-only export query prepared:',destination);return;
  }
  if(!input)throw Error('Choose a backup input file.');
  const source=JSON.parse(await fs.readFile(path.resolve(input),'utf8'));
  if(command==='pack'){
    if(!output)throw Error('Choose a new private backup destination outside the repository.');
    const destination=path.resolve(output);
    if(destination===root||destination.startsWith(root+path.sep))throw Error('Keep database backups outside the repository and OneDrive.');
    const snapshot=await backup.pack(source,root);await fs.writeFile(destination,JSON.stringify(snapshot),{flag:'wx',mode:0o600});console.log('Application backup saved:',destination);return;
  }
  backup.validate(source);
  if(command==='verify'){console.log('Backup checksums verified. Tables:',Object.keys(source.tables).length);return;}
  if(command==='restore-check'){
    const {PGlite}=require(process.env.NORTHSTAR_PGLITE_PATH||'@electric-sql/pglite');
    console.log(JSON.stringify(await backup.restoreCheck(source,PGlite,process.env.NORTHSTAR_STORAGE_KEY),null,2));return;
  }
  throw Error('Usage: node scripts/database-backup.cjs export-sql <new.sql> | pack <export.json> <private-backup.json> | verify <backup.json> | restore-check <backup.json>');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
