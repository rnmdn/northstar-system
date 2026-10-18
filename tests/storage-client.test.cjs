const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../scripts/storage.js'),'utf8');
const profileKey='astra-student-profile-v1';
function browser(values,fetchImpl){
  const elements=new Map();let loads=0;
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,value:'',textContent:'',remove(){this.removed=true;},append(){},setAttribute(){},classList:{add(){}}});return elements.get(id);};
  const panel={innerHTML:'',classList:{add(){},remove(){}},setAttribute(){},append(){},querySelector(selector){return element(selector);}};
  const listeners={};const location={href:'http://localhost/assessment.html'};
  const context={window:{},location,sessionStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)},fetch:fetchImpl,AbortSignal,URL,JSON,console,confirm:()=>true,addEventListener:(type,listener)=>listeners[type]=listener,setTimeout:()=>1,clearTimeout(){},document:{head:{append(){}},documentElement:{classList:{remove(){}}},currentScript:{dataset:{modules:'scripts/student.js'}},body:{dataset:{page:'assessment'},append(script){loads++;queueMicrotask(()=>script.onload());}},querySelector:selector=>selector==='.site-header nav'?null:({prepend(){}}),createElement:tag=>tag==='section'?panel:{},addEventListener:(type,listener)=>listeners[type]=listener}};
  vm.runInNewContext(source,context);
  return {context,elements,listeners,loads:()=>loads};
}
const response=record=>({ok:true,json:async()=>record});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('A failed save preserves the draft and still opens Review; the large panel is absent',async()=>{
  const values=new Map([[profileKey,'{"skills":{}}'],['astra-record-id','record-a']]);let saves=0;
  const app=browser(values,async(url,options)=>{if(url.endsWith('/load'))return response({recordId:'record-a',revision:2,state:{[profileKey]:'{"skills":{}}'}});saves++;assert.equal(JSON.parse(options.body).recordId,'record-a');throw new TypeError('Failed to fetch');});
  await settle();app.context.window.AstraStorage.cache.setItem(profileKey,'{"skills":{"0":3}}');
  await app.context.window.AstraStorage.navigate('review.html');
  assert.equal(app.context.location.href,'review.html');assert.equal(saves,1);assert.equal(values.get(profileKey),'{"skills":{"0":3}}');assert.equal(JSON.parse(values.get('astra-pending-draft')).revision,2);
  assert.equal(app.elements.get('#storage-tools').removed,true);assert.equal(app.elements.get('#storage-open').removed,true);
  let warned=false;app.listeners.beforeunload({preventDefault(){warned=true;}});assert.equal(warned,false,'Internal navigation preserves the draft without a blocking close-tab warning');
  const next=browser(values,async()=>{throw new TypeError('Failed to fetch');});await settle();assert.equal(next.loads(),1,'Review script still loads when the storage API is unavailable');assert.equal(values.get(profileKey),'{"skills":{"0":3}}');
});
test('A matching pending draft is uploaded after reconnection; newer server work is not overwritten',async()=>{
  const values=new Map([[profileKey,'{"skills":{"0":3}}'],['astra-record-id','record-a'],['astra-pending-draft',JSON.stringify({recordId:'record-a',revision:2})]]);let uploaded;
  const app=browser(values,async(url,options)=>url.endsWith('/load')?response({recordId:'record-a',revision:2,state:{[profileKey]:'{"skills":{}}'}}):(uploaded=JSON.parse(options.body),response({recordId:'record-a',revision:3})));
  await settle();assert.equal(uploaded.state[profileKey],'{"skills":{"0":3}}');assert.equal(values.has('astra-pending-draft'),false);assert.equal(app.loads(),1);
  values.set('astra-pending-draft',JSON.stringify({recordId:'record-a',revision:2}));let calls=0;
  const conflict=browser(values,async()=>{calls++;return response({recordId:'record-a',revision:4,state:{[profileKey]:'{"skills":{"0":1}}'}});});await settle();
  assert.equal(calls,1);assert.equal(values.get(profileKey),'{"skills":{"0":3}}');assert.equal(conflict.loads(),1);assert.equal(conflict.elements.get('#storage-reload').hidden,false);
});
test('Older tab-only answers survive upgrading the storage client',async()=>{
  const values=new Map([[profileKey,'{"skills":{"0":3}}'],['astra-record-id','record-a']]);
  const app=browser(values,async()=>response({recordId:'record-a',revision:4,state:{[profileKey]:'{"skills":{"0":1}}'}}));
  await settle();assert.equal(values.get(profileKey),'{"skills":{"0":3}}');assert.equal(app.loads(),1);assert.equal(app.elements.get('#storage-reload').hidden,false);
});
