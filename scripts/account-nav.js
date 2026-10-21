(() => {
  const link=document.getElementById('nav-account');
  const logout=document.getElementById('nav-logout');
  if(!link)return;
  async function refresh(){
    try{
      const response=await fetch('/api/auth/status',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
      if(!response.ok)return;
      const auth=await response.json();
      link.textContent=auth.user?'My assessment':'Sign in';
      link.href=auth.user?'account.html':'login.html';
      if(logout)logout.hidden=!auth.user;
    }catch{/* Navigation remains usable when the account service is unavailable. */}
  }
  refresh();
  logout?.addEventListener('click',async()=>{
    if(sessionStorage.getItem('astra-pending-draft')){alert('You have unsaved answers in this tab. Save or download them from your assessment before signing out.');return;}
    logout.disabled=true;
    try{
      const response=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Sign out failed');
      for(const key of Object.keys(sessionStorage))if(key.startsWith('astra-'))sessionStorage.removeItem(key);
      location.reload();
    }catch{alert('Couldn’t sign out. Please retry.');logout.disabled=false;}
  });
  window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
  window.addEventListener('focus',refresh);
})();
