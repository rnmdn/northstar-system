(() => {
  const loader = document.currentScript;
  const modules = (loader.dataset.modules || '').split(',').filter(Boolean);
  // Fetch together while preserving the existing execution order below.
  for (const src of modules) { const link=document.createElement('link');link.rel='preload';link.as='script';link.href=src;document.head.append(link); }
  const recoveryPage = document.body.dataset.page === 'resume';
  const keys = ['astra-item-bank-v4','astra-item-bank-v3','astra-student-profile-v1','astra-research-pilot-v0-1','astra-exploration-plan-v1','astra-assessment-unlocked-v1','astra-skills-stage-v3','astra-skills-return-v1','astra-review-complete','astra-skills-complete','astra-results-complete'];
  let accountLinked=false;
  let revision = 0, dirty = false, saving = null, timer, conflict = false, ready = false, loadedModules = 0, navigating = false;
  const accountLink=document.createElement('a');accountLink.href='account.html';accountLink.textContent='My assessment';accountLink.className='account-access';const nav=document.querySelector('.site-header nav');if(nav)nav.append(accountLink);
  const panel = document.createElement('section');
  panel.className = 'storage-panel';
  panel.setAttribute('aria-label','Assessment storage');
  panel.innerHTML = `<div class="storage-summary"><span id="storage-status" role="status">Connecting to your saved assessment…</span><button type="button" id="storage-open">Save &amp; resume</button></div><div id="storage-tools" hidden><h2>Your assessment, saved privately</h2><p>Answers, supporting evidence, scores and your career suggestions are saved on this server. Keep a recovery code to return from another browser. Anyone with your code can access this assessment.</p><button type="button" id="storage-code">Create a new recovery code</button><p id="recovery-output" hidden><label for="recovery-code">Keep this code somewhere private. Creating another code replaces it.</label><input id="recovery-code" readonly autocomplete="off"><button id="copy-recovery" type="button">Copy code</button></p><form id="storage-resume"><label for="resume-code">Resume with your recovery code</label><input id="resume-code" required autocomplete="off" spellcheck="false" maxlength="80"><button type="submit">Resume assessment</button></form><div class="storage-actions"><button id="storage-retry" type="button">Retry saving</button><button id="storage-reload" type="button">Load saved answers</button><button id="storage-download" type="button">Download this tab’s answers</button><button id="storage-signout" type="button">Leave this assessment</button></div><p id="storage-message" role="status"></p></div>`;
  (document.querySelector('main') || document.body).prepend(panel);
  const $ = id => panel.querySelector('#'+id);
  if(!recoveryPage) {
    $('storage-open').remove();
    const tools=$('storage-tools');
    const retry=$('storage-retry'),download=$('storage-download'),reload=$('storage-reload'),message=$('storage-message');
    panel.querySelector('.storage-summary').append(retry,download,reload);
    panel.append(message);tools.remove();
    retry.hidden=true;download.hidden=true;reload.hidden=true;message.hidden=true;
    panel.classList.add('storage-compact');
    const recoveryLink=document.createElement('a');recoveryLink.href='resume.html';recoveryLink.textContent='Recovery options';panel.querySelector('.storage-summary').append(recoveryLink);
  }
  function note(message) { const field=$('storage-message');field.textContent=message;field.hidden=!message; }
  function failure(error) {
    panel.classList.add('is-error');
    $('storage-retry').hidden=false;$('storage-download').hidden=false;$('storage-reload').hidden=!conflict;
    note(conflict?error.message:'');
  }
  function pendingDraft() { try{return JSON.parse(sessionStorage.getItem('astra-pending-draft'));}catch{return null;} }
  function sameProfile(left,right) {
    const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
    try {return JSON.stringify(sorted(JSON.parse(left)))===JSON.stringify(sorted(JSON.parse(right)));}catch{return left===right;}
  }
  function markDraft() { sessionStorage.setItem('astra-pending-draft',JSON.stringify({recordId:sessionStorage.getItem('astra-record-id'),revision})); }
  function status(message) { $('storage-status').textContent = message; }
  function snapshot() { return Object.fromEntries(keys.filter(key => sessionStorage.getItem(key) !== null).map(key => [key,sessionStorage.getItem(key)])); }
  function clear() { keys.forEach(key => sessionStorage.removeItem(key)); sessionStorage.removeItem('astra-record-id');sessionStorage.removeItem('astra-pending-draft'); }
  function hydrate(record) {
    panel.classList.remove('is-error');note('');
    clear();
    for (const [key,value] of Object.entries(record.state)) if(keys.includes(key)) sessionStorage.setItem(key,value);
    sessionStorage.setItem('astra-record-id',record.recordId);
    revision = record.revision; dirty = false; conflict = false;
  }
  async function post(route, data = {}) {
    const response = await fetch('/api/storage/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
    let value; try { value = await response.json(); } catch { throw new Error('We couldn’t connect to your saved assessment. Keep this tab open and retry.'); }
    if(!response.ok) throw Object.assign(new Error(value.error || 'Your assessment could not be saved.'),{status:response.status});
    return value;
  }
  async function flush() {
    clearTimeout(timer);
    if(!ready || conflict) throw new Error(conflict?'Another tab has newer answers. Download this tab’s answers, then load the saved assessment.':'Server storage is not connected.');
    if(saving) { await saving; if(dirty) return flush(); return; }
    if(!dirty) return;
    const state = snapshot(); dirty = false; status('Saving your assessment…');
    saving = post('save',{revision,state,recordId:sessionStorage.getItem('astra-record-id')}).then(record => { revision = record.revision; if(dirty)markDraft();else sessionStorage.removeItem('astra-pending-draft'); status(accountLinked?'Saved to your account':'Saved on this server');note('');panel.classList.remove('is-error');if(!recoveryPage){$('storage-retry').hidden=true;$('storage-download').hidden=true;$('storage-reload').hidden=true;} }).catch(error => {
      dirty = true; conflict = error.status === 409;
      status(conflict?'Newer answers exist in another tab — saving paused.':'Not saved to the server — keep this tab open and retry.');
      markDraft();failure(error);
      throw error;
    }).finally(() => { saving = null; });
    await saving;
    if(dirty) return flush();
  }
  function changed() { dirty = true;markDraft(); status(ready?'Changes waiting to save…':'Draft kept in this tab — server saving unavailable'); clearTimeout(timer); if(ready&&!conflict) timer = setTimeout(() => flush().catch(() => {}),450); }
  const cache = {getItem:key=>sessionStorage.getItem(key),setItem(key,value){sessionStorage.setItem(key,value);if(keys.includes(key))changed();},removeItem(key){sessionStorage.removeItem(key);if(keys.includes(key))changed();}};
  async function navigate(url) {
    try { await flush(); }
    catch(error) {
      markDraft();failure(error);
      // Review reads this tab's draft; conflicts remain paused until resolved.
    }
    navigating=true;location.href=url;
  }
  async function fresh() { await flush(); const record = await post('new'); hydrate(record); location.href = 'assessment.html'; }
  function resumeTarget(state) {
    if(state['astra-item-bank-v4']){const a=JSON.parse(state['astra-item-bank-v4']);sessionStorage.setItem('astra-bank-mode','v4');return a.selected?.length?'next-steps.html':a.stage===48?(a.submittedAt?'skills-results.html':'skills-assessment.html?review=1'):a.reviewed?'skills-assessment.html':'assessment.html';}
    if(state['astra-item-bank-v3']){const a=JSON.parse(state['astra-item-bank-v3']);sessionStorage.setItem('astra-bank-mode','v3');return a.selected?.length?'next-steps.html':a.stage===48?(a.submittedAt?'skills-results.html':'skills-assessment.html?review=1'):a.reviewed?'skills-assessment.html':'assessment.html';}
    if(state['astra-student-profile-v1'])sessionStorage.setItem('astra-bank-mode','legacy');
    if(state['astra-results-complete']==='true')return 'next-steps.html';
    if(state['astra-skills-complete']==='true')return 'skills-results.html';
    if(state['astra-review-complete']==='true')return 'skills-assessment.html';
    return 'assessment.html?step='+(state['astra-assessment-unlocked-v1']||'0');
  }
  window.AstraStorage = {cache,flush,navigate,fresh,async createRecovery(){await flush();return (await post('recovery')).code;},acceptRevision(value){if(Number.isInteger(value)&&value>=revision)revision=value;},get recordId(){return sessionStorage.getItem('astra-record-id');}};
  if(recoveryPage) {
  $('storage-tools').hidden=false;
  $('storage-open').hidden=true;
  $('storage-open').onclick = () => { $('storage-tools').hidden = !$('storage-tools').hidden; };
  $('storage-code').onclick = async () => { try { await flush(); const result=await post('recovery'); $('recovery-code').value=result.code; $('recovery-output').hidden=false; $('storage-message').textContent='Recovery code created. Copy it now; it is not shown again.'; } catch(error) { $('storage-message').textContent=error.message; } };
  $('copy-recovery').onclick = async () => { try { await navigator.clipboard.writeText($('recovery-code').value); $('storage-message').textContent='Recovery code copied.'; } catch { $('recovery-code').select(); $('storage-message').textContent='Select and copy the code manually.'; } };
  $('storage-resume').onsubmit = async event => {
    event.preventDefault();
    try { if(ready)await flush(); const record=await post('resume',{code:$('resume-code').value}); hydrate(record); location.href=resumeTarget(record.state); }
    catch(error) { $('storage-message').textContent=error.message; }
  };
  $('storage-signout').onclick = async () => { try { await flush();await post('logout');clear();location.href='index.html'; } catch(error) { note(error.message); } };
  }
  $('storage-retry').onclick = async () => { try { if(!ready)await boot(); else await flush(); } catch(error) { failure(error); } };
  $('storage-reload').onclick = async () => { try { if(dirty&&!confirm('Load the server’s answers? Unsaved changes in this tab will be replaced. You can download them first.'))return; hydrate(await post('load'));location.reload(); } catch(error) { $('storage-message').textContent=error.message; } };
  $('storage-download').onclick = () => { const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='astra-tab-answers.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); };
  document.addEventListener('click',event => {
    const link=event.target.closest('a[href]');
    if(event.defaultPrevented||!link||link.download||link.target||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin||!url.pathname.endsWith('.html')||link.getAttribute('href').startsWith('#'))return;
    event.preventDefault(); navigate(url.href);
  });
  addEventListener('beforeunload',event => { if(!navigating&&(dirty||saving)){event.preventDefault();event.returnValue='';} });
  async function boot() {
    if(!recoveryPage){
      const response=await fetch('/api/auth/status',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Sign-in could not be checked. Retry loading.');
      const auth=await response.json();
      if(auth.enabled&&!auth.user){navigating=true;location.href='login.html';throw new Error('Sign in to continue your assessment.');}
    }
    const local = snapshot(), previousId=sessionStorage.getItem('astra-record-id'),draft=pendingDraft();
    let record;
    try {record=await post('load');}
    catch(error){if(error.status===401){location.href='login.html';throw error;}ready=false;dirty=Object.keys(local).length>0;if(draft)revision=draft.revision;status('Draft kept in this tab — server saving unavailable');failure(error);await loadModules();return;}
    accountLinked=!!record.accountLinked;
    if(accountLinked&&previousId&&previousId!==record.recordId){if(draft){ready=false;conflict=true;failure(new Error('This tab has answers from another assessment. Download them before loading this account’s saved answers.'));throw new Error('Download this tab’s draft from Recovery options before opening another account.');}clear();}
    if(!accountLinked && !draft && previousId && local['astra-student-profile-v1'] && !sameProfile(local['astra-student-profile-v1'],record.state['astra-student-profile-v1'])) {
      ready=true;dirty=true;conflict=true;revision=-1;markDraft();
      status('Draft kept in this tab — saving paused');failure(new Error('This tab has profile answers that differ from the server copy. Download the draft before loading saved answers.'));await loadModules();return;
    }
    if(draft && draft.recordId && (draft.recordId!==record.recordId || draft.revision!==record.revision)) {
      ready=true;dirty=true;conflict=true;revision=draft.revision;
      status('Draft kept in this tab — saving paused');failure(new Error('The server has a newer or different assessment. Download this draft before loading saved answers.'));await loadModules();return;
    }
    // Import only an existing tab's legacy draft into a completely empty record.
    const importDraft=(!accountLinked&&!previousId&&record.revision===0&&Object.keys(record.state).length===0&&Object.keys(local).length>0)||(draft && (!draft.recordId || draft.recordId===record.recordId) && draft.revision===record.revision);
    hydrate(record); ready=true;
    if(importDraft) { for(const [key,value]of Object.entries(local))sessionStorage.setItem(key,value);dirty=true;markDraft();try{await flush();}catch{/* Draft is still usable when saving fails. */} }
    else status('Saved on this server');
    await loadModules();
  }
  async function loadModules() {
    for(;loadedModules<modules.length;loadedModules++) { const src=modules[loadedModules];if(window.AstraV3?.active && /scripts\/(student|skills-assessment|skills-results|skills-navigation|journey|certificate)\.js/.test(src))continue;await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;const timer=setTimeout(()=>reject(new Error('Loading timed out.')),15000);const failed=()=>{clearTimeout(timer);reject(new Error('An assessment script could not load.'));};const runtimeError=e=>{if(e.filename&&new URL(e.filename,location.href).pathname===new URL(src,location.href).pathname)failed();};window.addEventListener?.('error',runtimeError);script.onload=()=>{clearTimeout(timer);window.removeEventListener?.('error',runtimeError);resolve();};script.onerror=()=>{window.removeEventListener?.('error',runtimeError);failed();};document.body.append(script);}); }
  }
  const loading=document.getElementById?.('assessment-loading'),main=document.querySelector('main');
  boot().then(()=>{document.documentElement.classList.remove('assessment-loading');main?.setAttribute?.('aria-busy','false');if(loading)loading.hidden=true;}).catch(()=>{
    if(!loading){status('Couldn’t load your assessment. Reload this page to retry.');return;}
    loading.querySelector('p').textContent='Couldn’t load your assessment. Your saved answers have not been changed.';
    const retry=loading.querySelector('button');retry.hidden=false;retry.onclick=()=>location.reload();
  });
})();
