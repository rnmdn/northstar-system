// Operator-only application backup. No HTTP route imports this module.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const TABLES=[
  ['public','northstar_records'],['public','northstar_question_editors'],
  ['public','northstar_assessment_versions'],['public','northstar_questions'],
  ['northstar_private','soft_scoring'],['public','northstar_soft_attempts'],
  ['northstar_private','question_history'],['public','northstar_technical_attempts'],['public','northstar_technical_items']
];
const MIGRATIONS=['202610130001_storage.sql','202610210001_soft_skills_bank.sql','202610220001_history_reporting.sql'];
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
const tableDigest=rows=>hash(rows.map(canonical).sort().join('\n'));
function normalizeTimes(value,key=''){
  if(Array.isArray(value))return value.map(v=>normalizeTimes(v));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normalizeTimes(v,k)]));
  if(typeof value==='string'&&(/_at$/.test(key)||key==='createdAt')&&/^\d{4}-\d\d-\d\dT/.test(value)&&Number.isFinite(Date.parse(value))){
    const fraction=value.match(/\.(\d+)/)?.[1]||'';
    return new Date(value).toISOString().slice(0,19)+'.'+fraction.padEnd(6,'0')+'Z';
  }
  return value;
}

function exportSQL(){
  return `-- Read-only application snapshot. Auth credentials and active leases are excluded.
create or replace function pg_temp.northstar_application_snapshot() returns jsonb
language plpgsql stable set search_path='' as $$
declare name text; data jsonb='{}'; rows jsonb;
begin
  foreach name in array array[${TABLES.map(([s,t])=>"'"+s+'.'+t+"'").join(',')}] loop
    if to_regclass(name) is not null then
      execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) from %s r',to_regclass(name)) into rows;
      data=data||jsonb_build_object(name,rows);
    end if;
  end loop;
  return jsonb_build_object('format','northstar-application-export-v1','createdAt',now(),
    'project','mncmpsuwclksayfiayqv','tables',data,
    'identityIds',(select coalesce(jsonb_agg(id),'[]') from auth.users));
end $$;
select pg_temp.northstar_application_snapshot() as snapshot;`;
}

async function pack(raw,root){
  if(Array.isArray(raw))raw=raw[0]?.snapshot;
  else if(raw.snapshot)raw=raw.snapshot;
  if(typeof raw==='string')raw=JSON.parse(raw);
  if(raw?.format!=='northstar-application-export-v1')throw Error('Choose the JSON export from the NorthStar backup query.');
  const hasHistory=Object.hasOwn(raw.tables,'northstar_private.question_history');
  const names=MIGRATIONS.slice(0,hasHistory?3:2),migrations=[];
  for(const name of names){const sql=await fs.readFile(path.join(root,'supabase/migrations',name),'utf8');migrations.push({name,sql,sha256:hash(sql)});}
  const result={...raw,format:'northstar-application-backup-v1',migrations,
    scope:'Application tables and Auth ID references only. Supabase Auth passwords, identity providers, project settings, Storage files, and the storage encryption key require separate recovery copies.',
    digests:Object.fromEntries(Object.entries(raw.tables).map(([name,rows])=>[name,tableDigest(rows)]))};
  result.sha256=hash(canonical(result));validate(result);return result;
}

function validate(snapshot){
  const {sha256,...body}=snapshot;
  if(snapshot.format!=='northstar-application-backup-v1'||hash(canonical(body))!==sha256)throw Error('Backup integrity check failed.');
  if(!Array.isArray(snapshot.identityIds)||snapshot.identityIds.some(id=>!/^[a-f0-9-]{36}$/i.test(id)))throw Error('Invalid identity references.');
  if(!Array.isArray(snapshot.migrations))throw Error('Invalid migration manifest.');
  const expected=MIGRATIONS.slice(0,snapshot.migrations.length);
  if(![2,3].includes(expected.length)||snapshot.migrations.some((m,i)=>m.name!==expected[i]||hash(m.sql)!==m.sha256))throw Error('Invalid migration manifest.');
  const allowed=TABLES.map(([s,t])=>s+'.'+t);
  for(const [name,rows]of Object.entries(snapshot.tables||{})){
    if(!allowed.includes(name)||!Array.isArray(rows)||tableDigest(rows)!==snapshot.digests[name])throw Error('Invalid table data or checksum.');
  }
  for(const name of allowed.slice(0,6))if(!Object.hasOwn(snapshot.tables,name))throw Error('A required application table is missing.');
  return snapshot;
}

function verifyDecryption(rows,key){
  const bytes=Buffer.from(key||'','base64');if(bytes.length!==32)throw Error('A valid private storage key is required for decryption verification.');
  try{for(const row of rows){const e=row.envelope;if(e.format!=='astra-aes-gcm-v1')throw Error();const decipher=crypto.createDecipheriv('aes-256-gcm',bytes,Buffer.from(e.iv,'base64'));decipher.setAuthTag(Buffer.from(e.tag,'base64'));JSON.parse(Buffer.concat([decipher.update(Buffer.from(e.body,'base64')),decipher.final()]).toString('utf8'));}}
  catch{throw Error('Encrypted-record recovery check failed. No record contents were printed.');}
  return rows.length;
}

async function restoreCheck(snapshot,PGlite,key){
  validate(snapshot);const db=new PGlite();
  try{
    await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;");
    for(const m of snapshot.migrations)await db.exec(m.sql);
    await db.query('insert into auth.users select value::uuid from jsonb_array_elements_text($1::jsonb)',[JSON.stringify(snapshot.identityIds)]);
    const order=[TABLES[0],TABLES[2],TABLES[1],...TABLES.slice(3)],counts={};
    for(const [schema,table]of order){const name=schema+'.'+table;if(!Object.hasOwn(snapshot.tables,name))continue;
      let rows=snapshot.tables[name];
      if(table==='northstar_assessment_versions')rows=rows.map(r=>({...r,status:'draft'}));
      await db.query(`insert into "${schema}"."${table}" select * from jsonb_populate_recordset(null::"${schema}"."${table}",$1::jsonb)`,[JSON.stringify(rows)]);
    }
    for(const row of snapshot.tables['public.northstar_assessment_versions'])if(row.status==='published')await db.query("update public.northstar_assessment_versions set status='published' where id=$1",[row.id]);
    for(const [schema,table]of TABLES){const name=schema+'.'+table;if(!Object.hasOwn(snapshot.tables,name))continue;
      const rows=(await db.query(`select to_jsonb(r) as value from "${schema}"."${table}" r`)).rows.map(r=>r.value);
      // Postgres versions can spell UTC offsets differently; retain microseconds
      // while comparing equivalent timestamps. File integrity still uses raw bytes.
      if(tableDigest(normalizeTimes(rows))!==tableDigest(normalizeTimes(snapshot.tables[name]))){
        const original=snapshot.tables[name][0],restored=rows.find(r=>table==='northstar_records'?r.record_key===original.record_key:canonical(r)===canonical(original));
        const fields=restored?Object.keys(original).filter(k=>canonical(original[k])!==canonical(restored[k])):[];
        throw Error('Restored table differs: '+name+(fields.length?' ('+fields.join(', ')+')':''));
      }counts[name]=rows.length;
    }
    const decrypted=key?verifyDecryption(snapshot.tables['public.northstar_records'],key):null;
    return {verified:true,isolatedRestore:true,counts,decryptedRecords:decrypted,authCredentialsRestored:false};
  }finally{await db.close();}
}

module.exports={TABLES,exportSQL,pack,validate,restoreCheck,verifyDecryption,tableDigest};
