(() => {
  const mode=document.body.dataset.account,message=document.getElementById('account-message'),content=document.getElementById('account-content'),form=document.getElementById('account-form');
  function note(text,error=false){message.textContent=text;message.classList.toggle('error',error);}
  async function post(route,data={}){const response=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please retry.');return result;}
  function clearCache(){for(const key of Object.keys(sessionStorage))if(key.startsWith('astra-'))sessionStorage.removeItem(key);}
  // Keep an existing unsaved tab recoverable; never import it into another account.
  function canSwitch(){if(sessionStorage.getItem('astra-pending-draft')){note('This tab has unsaved answers. Open your assessment and save or download them before switching accounts.',true);return false;}return true;}
  form?.addEventListener('submit',async event=>{
    event.preventDefault();const button=form.querySelector('button'),email=form.elements.email?.value,password=form.elements.password?.value;
    if(form.elements.confirm&&password!==form.elements.confirm.value){form.elements.confirm.setCustomValidity('The passwords do not match.');form.elements.confirm.reportValidity();return;}
    if(mode==='login'&&!canSwitch())return;
    button.disabled=true;note('Please wait…');
    try{const result=await post('auth/'+mode,{email,password});form.reset();
      if(mode==='login'){clearCache();location.href='account.html';}
      else if(mode==='password'){note('Password updated. You can return to My assessment.');content.innerHTML='<a class="button button-dark" href="account.html">My assessment</a>';form.hidden=true;}
      else{note(result.message);form.hidden=true;}
    }catch(error){note(error.name==='TimeoutError'?'The request timed out. Please retry.':error.message,true);}finally{button.disabled=false;}
  });
  form?.elements.confirm?.addEventListener('input',()=>form.elements.confirm.setCustomValidity(''));
  form?.elements.password?.addEventListener('input',()=>form.elements.confirm?.setCustomValidity(''));
  async function start(){
    if(mode==='exchange'){
      const params=new URLSearchParams(location.search),code=params.get('code');history.replaceState(null,'','auth-callback.html');
      if(!code)throw new Error('This email link is invalid or expired. Request a new email.');
      if(!canSwitch())return;
      const result=await post('auth/exchange',{code});clearCache();location.replace(result.recovery?'reset-password.html':'account.html');return;
    }
    const auth=await post('auth/status');
    if(!auth.enabled){note('Account sign-in is being set up. Your existing assessment is still available through Recovery options.',true);if(form)form.hidden=true;return;}
    if((mode==='register'||mode==='recover')&&!auth.emailReady){note('Account emails are being configured. You can still open your existing assessment through Recovery options.');form.hidden=true;return;}
    if(mode!=='dashboard')return;
    if(!auth.user){location.replace('login.html');return;}
    note('Signed in as '+auth.user.email);
    const record=await post('storage/load');
    const saved=record.state['astra-item-bank-v4']||record.state['astra-item-bank-v3'];let assessment;try{assessment=JSON.parse(saved||'{}');}catch{assessment={};}
    const total=Object.keys(assessment.responses||{}).length;
    const target=assessment.submittedAt?'skills-results.html':assessment.reviewed?'skills-assessment.html':'assessment.html';
    const summary=document.createElement('section');summary.className='account-summary';
    const heading=document.createElement('h2');heading.textContent=assessment.submittedAt?'Assessment submitted':total?'Assessment in progress':'Ready when you are';
    const status=document.createElement('p');status.textContent=assessment.submittedAt?'Your submitted answers are locked. You can review scores and grading status.':`${total} of 48 skill items answered. Your progress saves to this account.`;
    const resume=document.createElement('a');resume.className='button button-dark';resume.href=target;resume.textContent=assessment.submittedAt?'View my results':total?'Continue assessment':'Start assessment';summary.append(heading,status,resume);content.append(summary);
    content.insertAdjacentHTML('beforeend','<details><summary>Link an earlier assessment</summary><p>Enter its recovery code. This keeps the original answers, grades and submission lock. An assessment can belong to only one account.</p><form id="claim-form"><label for="claim-code">Recovery code</label><input id="claim-code" name="code" required maxlength="80" autocomplete="off" spellcheck="false"><button type="submit" class="button button-dark">Link assessment</button></form></details><button type="button" class="signout" id="account-signout">Sign out</button>');
    document.getElementById('claim-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{await post('auth/claim',{code:event.target.elements.code.value});clearCache();location.reload();}catch(error){note(error.message,true);}finally{button.disabled=false;}});
    document.getElementById('account-signout').addEventListener('click',async event=>{if(!canSwitch())return;event.target.disabled=true;try{await post('auth/logout');clearCache();location.replace('login.html');}catch(error){event.target.disabled=false;note(error.message,true);}});
  }
  start().catch(error=>note(error.message||'Couldn’t load your account. Reload to retry.',true));
})();
