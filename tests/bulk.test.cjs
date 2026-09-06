const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const exported={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/bulk.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported});
test('bulk excludes saved blocks, sent records, unprepared and duplicate addresses',()=>{
 const lead={status:'ready',email:'a@example.com',subject:'Hi',body:'Hello'};
 const items=[{...lead,id:1},{...lead,id:2,email:'A@example.com'},{...lead,id:3,email:'b@example.com'},{...lead,id:4,status:'sent'},{...lead,id:5,body:''}];
 assert.equal(JSON.stringify(exported.readyEmails(items,{3:'do not contact'}).map(l=>l.id)),'[1]');
});
test('queue sends sequentially with pacing between requests',async()=>{const events=[];assert.equal(await exported.runQueue([1,2,3],async id=>{events.push(id)},()=>false,async()=>{events.push('wait')}),3);assert.deepEqual(events,[1,'wait',2,'wait',3]);});
test('failure stops queue without retry',async()=>{const events=[];await assert.rejects(exported.runQueue([1,2,3],async id=>{events.push(id);if(id===2)throw Error('limit')},()=>false,async()=>{}),/limit/);assert.deepEqual(events,[1,2]);});
test('stop during pacing prevents next request',async()=>{let stop=false;const events=[];assert.equal(await exported.runQueue([1,2],async id=>events.push(id),()=>stop,async()=>{stop=true}),1);assert.deepEqual(events,[1]);});
