// Operator-only: rebuild metadata from authenticated ciphertext and authoritative
// cached grades. The generated SQL contains no raw answers or authentication data.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {validate}=require('../storage/database-backup');
const {projectTechnical}=require('../storage/technical-report');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
async function main(){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Choose a private backup and a new SQL output file.');
 const snapshot=validate(JSON.parse(await fs.readFile(input,'utf8'))),key=Buffer.from(process.env.NORTHSTAR_STORAGE_KEY||'','base64');if(key.length!==32)throw Error('Load the private storage key before rebuilding reports.');
 const rows=new Map(snapshot.tables['public.northstar_records'].map(r=>[r.record_key,r.envelope]));
 function decrypt(e){if(!e)return null;const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(e.iv,'base64'));d.setAuthTag(Buffer.from(e.tag,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(e.body,'base64')),d.final()]).toString('utf8'));}
 const directory=path.resolve('report-source');const store={read:async file=>decrypt(rows.get(digest(path.relative(directory,file).split(path.sep).join('/'))))};
 const commands=[];
 for(const userId of snapshot.identityIds){
   const link=await store.read(path.join(directory,'account-users',digest(userId)+'.json'));if(!link?.owner)continue;
   const record=await store.read(path.join(directory,link.owner,'assessment.json'));if(!record||record.accountUserId!==userId)continue;
   for(const version of ['3.0','4.0']){
     const module=require('../storage/v3').forVersion(version);if(!record.state?.[module.key])continue;
     const assessment=module.validate(JSON.parse(record.state[module.key]));
     const scores=await module.scores(assessment,link.owner,store,directory,process.env.GEMINI_MODEL||'gemini-flash-lite-latest');
     const payload=projectTechnical(record,version,scores);
     commands.push("select public.northstar_sync_technical('"+JSON.stringify(payload).replaceAll("'","''")+"'::jsonb);");
   }
 }
 await fs.writeFile(output,'-- Rebuild of reporting metadata from the verified snapshot.\nbegin;\n'+commands.join('\n')+'\ncommit;\nselect count(*) as indexed_attempts from public.northstar_technical_report;\n',{flag:'wx',mode:0o600});
 console.log('Reporting projections prepared:',commands.length);
}
main().catch(()=>{console.error('Report rebuild failed. Check the private backup, storage key and output path. No student data was printed.');process.exitCode=1;});
