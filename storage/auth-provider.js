// Supabase owns credentials. Only opaque session cookies reach the browser.
function authProvider({url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_SECRET_KEY,fetcher=fetch}={}) {
  if(!url||!key)return null;
  async function request(route,{method='POST',body,token,redirect}={}) {
    const endpoint=new URL(url+'/auth/v1/'+route);
    if(redirect)endpoint.searchParams.set('redirect_to',redirect);
    let response;
    try{response=await fetcher(endpoint,{method,headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});}
    catch{throw Object.assign(new Error('Account service is unavailable. Please retry.'),{status:503});}
    const result=await response.json().catch(()=>({}));
    if(!response.ok){
      const messages={invalid_credentials:'Email or password is incorrect.',email_not_confirmed:'Confirm your email before signing in.',weak_password:'Choose a stronger password with at least 10 characters.',over_email_send_rate_limit:'Too many emails requested. Please wait before retrying.',email_address_not_authorized:'Email delivery is not configured for student accounts yet.',flow_state_not_found:'This email link has expired. Request another link.',flow_state_expired:'This email link has expired. Request another link.'};
      throw Object.assign(new Error(messages[result.error_code||result.code]||(response.status===429?'Too many attempts. Please wait and retry.':response.status===401?'Your sign-in has expired. Sign in again.':'The account request could not be completed. Please retry.')),{status:response.status===429?429:response.status>=500?503:response.status===401?401:400});
    }
    return result;
  }
  return {request};
}
module.exports={authProvider};
