const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const backup=require('../storage/database-backup');
test('application snapshot restores tables and decrypts records without restoring live Auth credentials',async()=>{
 const {PGlite}=require(process.env.NORTHSTAR_PGLITE_PATH||'@electric-sql/pglite');const db=new PGlite();
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;");
  const root=path.resolve(__dirname,'..');
  for(const name of ['202610130001_storage.sql','202610210001_soft_skills_bank.sql','202610220001_history_reporting.sql'])await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/seeds/soft-skills-draft.sql'),'utf8'));
  const key=crypto.randomBytes(32),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify({answer:'TEST PRIVATE ANSWER'})),cipher.final()]);
  const envelope={format:'astra-aes-gcm-v1',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),body:encrypted.toString('base64')};
  await db.query('insert into public.northstar_records(record_key,envelope) values($1,$2::jsonb)',['a'.repeat(64),JSON.stringify(envelope)]);
  const results=await db.exec(backup.exportSQL());const raw=results.at(-1).rows[0].snapshot;
  const snapshot=await backup.pack(raw,root);assert.ok(!JSON.stringify(snapshot).includes('TEST PRIVATE ANSWER'));
  const restored=await backup.restoreCheck(snapshot,PGlite,key.toString('base64'));assert.equal(restored.decryptedRecords,1);assert.equal(restored.counts['public.northstar_questions'],12);assert.equal(restored.authCredentialsRestored,false);
  assert.throws(()=>backup.verifyDecryption(snapshot.tables['public.northstar_records'],crypto.randomBytes(32).toString('base64')),/recovery check failed/);
  const corrupted=structuredClone(snapshot);corrupted.tables['public.northstar_questions'][0].title='changed';assert.throws(()=>backup.validate(corrupted),/integrity/);
 }finally{await db.close();}
});
