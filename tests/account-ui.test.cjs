const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync(require.resolve('../scripts/account.js'),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function dashboard(auth,record){
  const {window}=parseHTML(fs.readFileSync(require.resolve('../account.html'),'utf8')),location={replace(value){this.href=value;}};
  vm.runInNewContext(source,{document:window.document,location,sessionStorage:{getItem:()=>null},AbortSignal,fetch:async url=>({ok:true,json:async()=>url.endsWith('/status')?auth:record})});await settle();return {document:window.document,location};
}
test('dashboard sends signed-out students to sign in and treats account email as text',async()=>{
  const empty=await dashboard({enabled:true,user:null});assert.equal(empty.location.href,'login.html');
  const app=await dashboard({enabled:true,user:{email:'<img src=x onerror=alert(1)>'}},{state:{}});
  assert.equal(app.document.querySelector('#account-message img'),null);assert.match(app.document.querySelector('#account-message').textContent,/<img/);
  assert.equal(app.document.querySelector('.account-summary a').getAttribute('href'),'assessment.html');
});
test('submitted dashboard leads to results and describes the answer lock',async()=>{
  const app=await dashboard({enabled:true,user:{email:'test@example.test'}},{state:{'astra-item-bank-v4':JSON.stringify({submittedAt:'2026-10-18T12:00:00Z',responses:{'OB-SD01':'A'}})}});
  assert.equal(app.document.querySelector('.account-summary a').getAttribute('href'),'skills-results.html');assert.match(app.document.querySelector('.account-summary').textContent,/locked/);assert.ok(app.document.querySelector('#claim-form'));
});
test('production email setup notice hides registration rather than promising a verification email',async()=>{
  const {window}=parseHTML(fs.readFileSync(require.resolve('../register.html'),'utf8'));const form=window.document.querySelector('form');Object.defineProperty(form,'elements',{value:{}});
  vm.runInNewContext(source,{document:window.document,AbortSignal,fetch:async()=>({ok:true,json:async()=>({enabled:true,emailReady:false,user:null})})});await settle();assert.equal(form.hidden,true);assert.match(window.document.querySelector('#account-message').textContent,/being configured/);
});

test('password controls toggle independently without submitting the form',async()=>{const {window}=parseHTML(fs.readFileSync(require.resolve('../register.html'),'utf8'));const form=window.document.querySelector('form');Object.defineProperty(form,'elements',{value:{}});vm.runInNewContext(source,{document:window.document,AbortSignal,fetch:async()=>({ok:true,json:async()=>({enabled:true,emailReady:true,user:null})})});await settle();const input=window.document.querySelector('#password'),confirm=window.document.querySelector('#confirm'),toggle=window.document.querySelector('[data-password-toggle="password"]');assert.equal(toggle.type,'button');toggle.click();assert.equal(input.type,'text');assert.equal(confirm.type,'password');assert.equal(toggle.getAttribute('aria-label'),'Hide password');assert.equal(toggle.getAttribute('aria-pressed'),'true');toggle.click();assert.equal(input.type,'password');assert.equal(toggle.getAttribute('aria-pressed'),'false');});
