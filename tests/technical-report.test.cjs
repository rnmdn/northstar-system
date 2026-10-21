const test=require('node:test'),assert=require('node:assert/strict');
const {projectTechnical}=require('../storage/technical-report');
test('reporting excludes responses and client grades and keeps pending scores null',()=>{
 const record={recordId:'40000000-0000-4000-8000-000000000001',accountUserId:'20000000-0000-4000-8000-000000000001',revision:3,state:{'astra-item-bank-v4':JSON.stringify({bankVersion:'4.0',stage:0,profile:{},responses:{'OB-SD01':'A','OB-SD04':'PRIVATE WRITTEN CONTENT'},scores:{grades:{'OB-SD01':{status:'graded',points:1}}}})}};
 const report=projectTechnical(record,'4.0',{});assert.equal(report.items.length,48);assert.equal(report.items[0].points,null);assert.ok(!JSON.stringify(report).includes('PRIVATE WRITTEN CONTENT'));assert.ok(!Object.hasOwn(report,'responses'));
 const scored=projectTechnical(record,'4.0',{grades:{'OB-SD01':{status:'graded',points:0}}});assert.equal(scored.items[0].points,0);assert.equal(scored.items[0].gradingStatus,'graded');
});
