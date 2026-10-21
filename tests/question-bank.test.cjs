const test=require('node:test'),assert=require('node:assert/strict');
const {questionBank}=require('../storage/question-bank');

test('question RPC uses the verified JWT and preserves revision conflicts',async()=>{
  let sent;
  const bank=questionBank({url:'https://example.supabase.co',key:'public-test-key',fetcher:async(url,options)=>{sent={url,options};return {ok:false,status:400,json:async()=>({code:'40001',message:'A newer edit exists. Reload this draft.'})};}});
  await assert.rejects(bank.request('admin','save',{revision:1},'verified-test-jwt'),e=>e.status===409);
  assert.equal(sent.url,'https://example.supabase.co/rest/v1/rpc/northstar_bank_admin');
  assert.equal(sent.options.headers.Authorization,'Bearer verified-test-jwt');
  assert.deepEqual(JSON.parse(sent.options.body),{action:'save',payload:{revision:1}});
});

test('question RPC rejects unavailable configuration and sanitizes upstream errors',async()=>{
  await assert.rejects(questionBank({url:'',key:''}).request('student','load',{},'test'),e=>e.status===503);
  const bank=questionBank({url:'https://example.supabase.co',key:'test',fetcher:async()=>({ok:false,status:500,json:async()=>({message:'PRIVATE DATABASE DETAILS'})})});
  await assert.rejects(bank.request('student','load',{},'test'),e=>e.status===503&&!e.message.includes('PRIVATE'));
});

test('database permission failures remain forbidden',async()=>{
  const bank=questionBank({url:'https://example.supabase.co',key:'test',fetcher:async()=>({ok:false,status:403,json:async()=>({code:'42501',message:'Question editor access required.'})})});
  await assert.rejects(bank.request('admin','list',{},'test'),e=>e.status===403&&e.message==='Question editor access required.');
});
