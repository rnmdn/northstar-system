const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
test('Vercel adapter accepts parsed JSON bodies and preserves secure server routes',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'northstar-vercel-')),old=process.env.ASTRA_DATA_DIR;
 process.env.ASTRA_DATA_DIR=dir;
 const handler=require('../api/index');
 const server=http.createServer(async(req,res)=>{let body='';for await(const part of req)body+=part;if(body)req.body=JSON.parse(body);await handler(req,res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const response=await fetch(base+'/api/storage/load',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,200);assert((await response.json()).recordId);
  assert.equal((await fetch(base+'/grading/bank-v4.json')).status,404);
  assert.equal((await fetch(base+'/healthz')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));if(old===undefined)delete process.env.ASTRA_DATA_DIR;else process.env.ASTRA_DATA_DIR=old;await fs.rm(dir,{recursive:true,force:true});}
});
test('static publication excludes backend, model and secret files',async()=>{
 const root=path.resolve(__dirname,'..'),output=path.join(root,'public');
 require('../scripts/build-vercel.cjs');
 for(const file of ['index.html','scripts/assessment-v3.js','assets/video.mp4'])assert((await fs.stat(path.join(output,file))).isFile());
 for(const file of ['server.js','grading/bank-v4.json','models/team-rf/forest.json','scripts/ai-config.cjs','scripts/read-ai-key.ps1','.env'])await assert.rejects(fs.stat(path.join(output,file)),{code:'ENOENT'});
});
