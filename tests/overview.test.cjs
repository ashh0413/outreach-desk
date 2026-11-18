/* oxlint-disable typescript/no-require-imports -- Node test harness */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function moduleFrom(path){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out});return out;}
const o=moduleFrom('lib/overview.ts');
const L=(id,overrides={})=>({id,business:'Business '+id,email:id+'@example.com',source:'https://x.example/'+id,status:'ready',...overrides});
const leads=[
 L(1,{batch:'b2',country:'USA',checked:'2026-11-18T00:00:00Z'}),
 L(2,{batch:'b1',country:'India',checked:'2026-09-08T00:00:00Z',status:'skipped: verification needed',reason:'held'}),
 L(3,{status:'sent'}),
];
const empty={batch:'all',country:'all',status:'all',since:'all'};
// The module is transpiled into a fresh vm realm, so arrays it builds are not
// deep-equal to host arrays across realms. Compare via JSON.stringify, the
// same way bulk.test.cjs does, instead of assert.deepEqual on whole arrays.
test('filters combine with AND across batch, country, status, date',()=>{
 assert.equal(o.filterLeads(leads,{},empty).length,3);
 assert.equal(JSON.stringify(o.filterLeads(leads,{},{...empty,status:'ready'}).map(l=>l.id)),'[1]');
 assert.equal(JSON.stringify(o.filterLeads(leads,{},{...empty,status:'needs review'}).map(l=>l.id)),'[2]');
 assert.equal(JSON.stringify(o.filterLeads(leads,{},{...empty,batch:'b2',status:'ready'}).map(l=>l.id)),'[1]');
 assert.equal(JSON.stringify(o.filterLeads(leads,{1:'do not contact'},{...empty,status:'do not contact'}).map(l=>l.id)),'[1]');
 assert.equal(JSON.stringify(o.filterLeads(leads,{},{...empty,since:'2026-11-01'}).map(l=>l.id)),'[1]');
 assert.equal(o.filterLeads(leads,{},{...empty,batch:'b1',since:'2026-11-01'}).length,0);
});
test('saved statuses win; unknown source statuses read as needs review',()=>{
 assert.equal(o.leadStatus(leads[0],{1:'sent'}),'sent');
 assert.equal(o.leadStatus(leads[1]),'needs review');
 assert.equal(o.leadStatus(leads[2]),'sent');
 const c=o.overviewCounts(leads);
 assert.equal(c.ready,1);assert.equal(c.needsReview,1);assert.equal(c.sent,1);
});
test('activity keeps only timestamped rows for known leads, newest first',()=>{
 const history=[
  {id:1,status:'sent',updated:'2026-11-18T10:00:00Z',message_id:'m1'},
  {id:99,status:'sent',updated:'2026-11-18T09:00:00Z'},
  {id:2,status:'uncertain'},
 ];
 const rows=o.activityRows(history,leads);
 assert.equal(JSON.stringify(rows.map(r=>[r.id,r.status])),'[[1,"sent"]]');
 assert.equal(rows[0].messageId,'m1');
 assert.equal(o.activityRows(history,leads,0).length,0);
});
test('group and date helpers summarize without inventing values',()=>{
 const g=o.groupCounts(leads,{},o.batchKey);
 assert.equal(JSON.stringify(g.map(r=>[r.key,r.total])),'[["b1",1],["b2",1],["historical",1]]');
 assert.equal(JSON.stringify(o.dateChoices(leads).map(d=>d.value)),'["2026-11-18","2026-09-08"]');
 assert.match(o.countrySummary(leads),/Earlier batch 1/);
});
