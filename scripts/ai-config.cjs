// Windows DPAPI protects the saved key for the current Windows account.
// The decrypted child output is captured internally, never logged.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
function loadAIKey({env=process.env,platform=process.platform,exists=fs.existsSync,run=execFileSync}={}){
  if(env.GEMINI_API_KEY?.trim())return 'environment';
  const directory=env.ASTRA_DATA_DIR?path.resolve(env.ASTRA_DATA_DIR):path.join(__dirname,'../.astra-data');
  const file=path.join(directory,'gemini-key.dpapi');
  if(platform!=='win32'||!exists(file))return 'missing';
  let key;
  try { key=run([path.join(process.env.ProgramFiles||'C:/Program Files','PowerShell/7/pwsh.exe'),path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe')].find(file=>fs.existsSync(file))||'powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'read-ai-key.ps1')],{env:{...env,ASTRA_AI_KEY_FILE:file},encoding:'utf8',windowsHide:true,timeout:10000,maxBuffer:8192,stdio:['ignore','pipe','pipe']}).trim(); }
  catch { throw Error('The saved Gemini key could not be unlocked. Run scripts/start-ai.ps1 under the Windows account that saved it.'); }
  if(!key)throw Error('The saved Gemini key is empty. Run scripts/start-ai.ps1 again.');
  env.GEMINI_API_KEY=key;
  return 'encrypted';
}
module.exports={loadAIKey};
