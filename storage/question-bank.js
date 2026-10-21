// Requests carry the student's verified JWT. Postgres enforces ownership and editor membership.
function questionBank({url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_SECRET_KEY,fetcher=fetch}={}) {
  return {async request(scope,action,payload,token){
    if(!url||!key)throw Object.assign(new Error('Question database is not configured.'),{status:503});
    let response;
    try{response=await fetcher(url.replace(/\/$/,'')+'/rest/v1/rpc/'+(scope==='admin'?'northstar_bank_admin':'northstar_soft_student'),{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(15000)});}
    catch{throw Object.assign(new Error('Question database is unavailable. Retry without closing your draft.'),{status:503});}
    const result=await response.json().catch(()=>({}));
    if(!response.ok){
      const known=['Question editor access required.','Sign in to open your assessment.','Question version not found.','Create a draft copy to make changes.','A newer edit exists. Reload this draft.','Publication requires 12 questions, three per skill area.','Complete the reviewed scoring key and explanation for every question.','Record the completed faculty review before publishing.','Submitted answers are locked.','Newer answers exist. Reload before editing.','Answer every scenario before submitting.','Assessment not found for this account.','Invalid question or choice.'];
      const message=result.code==='PGRST202'?'Question tables are not installed yet.':known.includes(result.message)?result.message:'The question update could not be completed. Check the fields and retry.';
      throw Object.assign(new Error(message),{status:response.status>=500||result.code==='PGRST202'?503:result.code==='42501'?403:result.code==='40001'?409:400});
    }
    return result;
  }};
}
module.exports={questionBank};
