/* oxlint-disable typescript/no-require-imports -- Node test runner CommonJS harness */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const fresh=require('../lib/fresh-leads.json');
const old=require('../lib/leads.json');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/prepare-lead.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject});
test('new batch has 50 per country, unique IDs and emails, no overlap with history',()=>{
 assert.equal(fresh.length,100);
 for(const country of ['India','USA'])assert.equal(fresh.filter(x=>x.country===country).length,50);
 assert.equal(new Set([...old,...fresh].map(x=>x.id)).size,200);
 assert.equal(new Set(fresh.map(x=>x.email.toLowerCase())).size,100);
 const prior=new Set(old.map(x=>x.email.toLowerCase()));
 for(const lead of fresh)assert.equal(prior.has(lead.email.toLowerCase()),false);
 for(const lead of fresh){assert.match(lead.email,/^\S+@\S+\.\S+$/);assert.ok(lead.source.startsWith('https://'));assert.ok(lead.body.includes(lead.business.replace(/\.$/,'')));assert.ok(lead.body.includes('https://aston-rodrigues.vercel.app/'));}
});
test('54 stronger prospects and 46 held; ready records have corroborating sources',()=>{
 assert.equal(fresh.filter(x=>x.status==='ready').length,54);
 for(const lead of fresh.filter(x=>x.status==='ready'))assert.ok(lead.corroboration);
 for(const lead of fresh.filter(x=>x.status!=='ready'))assert.ok(lead.reason);
});
test('sender postal address is required and footer does not release held leads',()=>{
 const lead=fresh.find(x=>x.status==='ready');
 assert.notEqual(exportsObject.prepareLead(lead,undefined).status,'ready');
 const prepared=exportsObject.prepareLead(lead,'Test postal address');
 assert.equal(prepared.status,'ready');assert.ok(prepared.body.includes('Test postal address'));assert.ok(prepared.body.includes('no thanks'));
 const held=fresh.find(x=>x.status!=='ready');assert.equal(exportsObject.prepareLead(held,'Test address').status,held.status);
 assert.equal(exportsObject.prepareLead(old[0],undefined),old[0]);
});
