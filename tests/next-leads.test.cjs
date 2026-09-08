/* oxlint-disable typescript/no-require-imports -- Node test harness */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const next=require('../lib/next-leads.json');
const previous=[...require('../lib/leads.json'),...require('../lib/fresh-leads.json')];
function moduleFrom(path){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out});return out;}
const collections=moduleFrom('lib/collections.ts');
const bulk=moduleFrom('lib/bulk.ts');
test('8 September batch contains 50 India and 50 USA with no prior contact overlap',()=>{
 assert.equal(next.length,100);
 for(const country of ['India','USA'])assert.equal(next.filter(l=>l.country===country).length,50);
 const all=[...previous,...next];assert.equal(new Set(all.map(l=>l.id)).size,300);
 assert.equal(new Set(next.map(l=>l.email.toLowerCase())).size,100);
 const old=new Set(previous.map(l=>l.email.toLowerCase()));
 for(const l of next){assert.ok(!old.has(l.email.toLowerCase()));assert.match(l.source,/^https:\/\//);assert.equal(l.batch,collections.newestBatch);}
});
test('29 provisionally qualified contacts have evidence and drafts; 71 holds cannot send',()=>{
 assert.equal(bulk.readyEmails(next,{}).length,29);
 for(const l of next){
  if(l.status==='ready'){assert.ok(l.corroboration);assert.ok(l.evidence);assert.ok(l.body.includes(l.business));assert.ok(l.body.includes('https://aston-rodrigues.vercel.app/'));}
  else {assert.ok(l.reason);assert.ok(!l.body);}
 }
 assert.equal(bulk.readyEmails(next,Object.fromEntries(next.map(l=>[l.id,'sent']))).length,0);
});
test('batch picker separates all three collections and bulk cannot leak into earlier batches',()=>{
 const all=[...previous,...next];
 const options=collections.batchOptions(all);assert.equal(options.length,3);assert.equal(options[0].value,collections.newestBatch);
 for(const option of options)assert.equal(all.filter(l=>collections.inCollection(l,option.value)).length,100);
 const scoped=all.filter(l=>collections.inCollection(l,collections.newestBatch));
 assert.ok(bulk.readyEmails(scoped,{}).every(l=>l.id>=201));
});
