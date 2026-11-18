/* oxlint-disable typescript/no-require-imports -- Node test harness */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const next=require('../lib/next-leads.json');
const wide=require('../lib/wide-leads.json');
const worldwide=require('../lib/worldwide-leads.json');
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
 for(const l of next){assert.ok(!old.has(l.email.toLowerCase()));assert.match(l.source,/^https:\/\//);assert.equal(l.batch,'india-usa-2026-09-08');}
});
test('29 provisionally qualified contacts have evidence and drafts; 71 holds cannot send',()=>{
 assert.equal(bulk.readyEmails(next,{}).length,29);
 for(const l of next){
  if(l.status==='ready'){assert.ok(l.corroboration);assert.ok(l.evidence);assert.ok(l.body.includes(l.business));assert.ok(l.body.includes('https://aston-rodrigues.vercel.app/'));}
  else {assert.ok(l.reason);assert.ok(!l.body);}
 }
 assert.equal(bulk.readyEmails(next,Object.fromEntries(next.map(l=>[l.id,'sent']))).length,0);
});
test('18 November previous batch is deduped and keeps four unverified records held',()=>{
 assert.equal(wide.length,8);
 assert.equal(wide.filter(l=>l.status==='ready').length,4);
 assert.equal(wide.filter(l=>l.status!=='ready').length,4);
 const all=[...previous,...next,...wide];
 assert.equal(new Set(all.map(l=>l.id)).size,308);
 const publicEmails=all.map(l=>l.email.toLowerCase()).filter(e=>e!=='not found');
 assert.equal(new Set(publicEmails).size,publicEmails.length);
 assert.equal(bulk.readyEmails(wide,{}).length,4);
 for(const l of wide){
  assert.match(l.source,/^https:\/\//);
  if(l.status==='ready'){assert.ok(l.evidence);assert.ok(l.body?.includes(l.business));assert.ok(l.body?.includes('https://aston-rodrigues.vercel.app/'));}
  else {assert.ok(l.reason);assert.ok(!l.body);}
 }
 const options=collections.batchOptions([...all,...worldwide]);assert.equal(options.length,5);assert.equal(options[0].value,collections.newestBatch);
 assert.equal(all.filter(l=>collections.inCollection(l,'india-usa-2026-11-18')).length,8);
 const scoped=all.filter(l=>collections.inCollection(l,'india-usa-2026-11-18'));
 assert.ok(bulk.readyEmails(scoped,{}).every(l=>l.id>=301&&l.id<=304));
});
