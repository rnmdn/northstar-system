const crypto=require('node:crypto');
const path=require('node:path');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const random=()=>crypto.randomBytes(32).toString('hex');
const fail=(message,status=401)=>Object.assign(new Error(message),{status});
function accounts({provider,store,dataDir,secure=false,origin,emailReady=process.env.NODE_ENV!=='production'||process.env.NORTHSTAR_AUTH_EMAIL_READY==='true'}) {
  const file=(type,id)=>path.join(dataDir,type,digest(id)+'.json');
  const readCookie=(req,name)=>req.headers.cookie?.match(new RegExp('(?:^|;\\s*)'+name+'=([a-f0-9]{64})(?:;|$)'))?.[1];
  function cookie(res,name,value,age=2592000){const previous=res.getHeader('Set-Cookie')||[];res.setHeader('Set-Cookie',[...(Array.isArray(previous)?previous:[previous]),`${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure?'; Secure':''}`]);}
  async function userSession(req){
    if(req.northstarAccount)return req.northstarAccount;
    const token=readCookie(req,'northstar_account');if(!token)return null;
    const location=file('account-sessions',token);let session=await store.read(location);
    if(!session||session.expiresAt<Date.now())throw fail('Your sign-in has expired. Sign in again.');
    if(session.tokenExpiresAt<Date.now()+30000){
      const refreshed=await provider.request('token?grant_type=refresh_token',{body:{refresh_token:session.refreshToken}});
      session={...session,accessToken:refreshed.access_token,refreshToken:refreshed.refresh_token,tokenExpiresAt:Date.now()+refreshed.expires_in*1000};
      await store.write(location,session);
    }
    const user=await provider.request('user',{method:'GET',token:session.accessToken});
    if(user.id!==session.userId||!user.email_confirmed_at)throw fail('Confirm your email and sign in again.');
    req.northstarAccount={...session,user:{id:user.id,email:user.email},location};return req.northstarAccount;
  }
  async function owner(req){const session=await userSession(req);if(!session)return null;const link=await store.read(file('account-users',session.userId));return link?.owner||null;}
  async function link(userId,owner){await store.write(file('account-users',userId),{owner});}
  async function establish(req,res,result,recovery=false){
    const user=await provider.request('user',{method:'GET',token:result.access_token});
    if(!user?.id||!user.email_confirmed_at||!result.refresh_token)throw fail('Confirm your email before signing in.');
    if(!await store.read(file('account-users',user.id)))await link(user.id,random());
    const token=random();await store.write(file('account-sessions',token),{userId:user.id,accessToken:result.access_token,refreshToken:result.refresh_token,tokenExpiresAt:Date.now()+result.expires_in*1000,expiresAt:Date.now()+2592000000,recoveryUntil:recovery?Date.now()+900000:0});
    cookie(res,'northstar_account',token);delete req.northstarAccount;
    return {user:{id:user.id,email:user.email},recovery};
  }
  async function route(req,res,name,input){
    if(name==='status'){let session;try{session=await userSession(req);}catch(error){if(error.status===503)throw error;cookie(res,'northstar_account','',0);return {enabled:true,emailReady,user:null};}return {enabled:true,emailReady,user:session?.user||null};}
    if(name==='logout'){
      const token=readCookie(req,'northstar_account');if(token){const location=file('account-sessions',token),session=await store.read(location);if(session){await store.write(location,{...session,expiresAt:0});await provider.request('logout?scope=local',{token:session.accessToken}).catch(()=>{});}}
      cookie(res,'northstar_account','',0);cookie(res,'astra_grading','',0);return {signedOut:true};
    }
    if(name==='exchange'){
      const nonce=readCookie(req,'northstar_flow'),location=nonce&&file('auth-flows',nonce),flow=location&&await store.read(location);
      if(!flow||flow.expiresAt<Date.now()||typeof input.code!=='string'||input.code.length>2048)throw fail('Open this link in the browser that requested it, or request a new email.',400);
      const result=await provider.request('token?grant_type=pkce',{body:{auth_code:input.code,code_verifier:flow.verifier}});
      const resultSession=await establish(req,res,result,flow.type==='recover');await store.write(location,{expiresAt:0});cookie(res,'northstar_flow','',0);return resultSession;
    }
    if(name==='password'){
      const session=await userSession(req);if(!session||!session.recoveryUntil||session.recoveryUntil<Date.now())throw fail('Request a new password-reset email first.',403);
      password(input.password);await provider.request('user',{method:'PUT',token:session.accessToken,body:{password:input.password}});
      await store.write(session.location,{...session,recoveryUntil:0});return {updated:true};
    }
    const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw fail('Enter a valid email address.',400);
    if(name==='login'){password(input.password,false);return establish(req,res,await provider.request('token?grant_type=password',{body:{email,password:input.password}}));}
    if(name==='register'||name==='recover'){
      if(!emailReady)throw fail('Account emails are being configured. Please use Recovery options for your existing assessment.',503);
      if(name==='register')password(input.password);
      const nonce=random(),verifier=crypto.randomBytes(48).toString('base64url');
      await store.write(file('auth-flows',nonce),{verifier,type:name,expiresAt:Date.now()+3600000});cookie(res,'northstar_flow',nonce,3600);
      await provider.request(name==='register'?'signup':'recover',{body:{email,...(name==='register'?{password:input.password}:{}),code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'s256'},redirect:origin+'/auth-callback.html'});
      return {message:name==='register'?'If this address can be registered, a confirmation email is on its way. Open it in this browser, then sign in.':'If an account exists for this address, a reset email is on its way. Open it in this browser.'};
    }
    throw fail('Account action was not found.',404);
  }
  return {route,userSession,owner,link,readCookie};
}
function password(value,strong=true){if(typeof value!=='string'||value.length>(1024)||value.length<(strong?10:1))throw fail(strong?'Use a password with at least 10 characters.':'Enter your password.',400);}
module.exports={accounts};
