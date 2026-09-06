const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
function load(file,mocks={},extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>mocks[n],URL,Response,...extra});return exports;}
test('Google signatures, issuer, audience, expiry and owner are verified',async()=>{
 const jose=await import('jose');const {privateKey,publicKey}=await jose.generateKeyPair('RS256');const jwk=await jose.exportJWK(publicKey);jwk.kid='test-key';const keys=jose.createLocalJWKSet({keys:[jwk]});const email='astonajoy77@gmail.com';
 const auth=load('lib/auth.ts',{'next/headers':{cookies:async()=>({get:()=>undefined})},'jose':{createRemoteJWKSet:()=>keys,jwtVerify:jose.jwtVerify},'./mail':{sender:email}},{process:{env:{GOOGLE_CLIENT_ID:'test-client'}}});
 async function token(overrides={}){return new jose.SignJWT({email,email_verified:true,...overrides}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('owner-123').setIssuedAt().setIssuer(overrides.iss||'https://accounts.google.com').setAudience(overrides.aud||'test-client').setExpirationTime(overrides.exp||'1h').sign(privateKey);}
 assert.equal((await auth.verifyIdentity(await token())).email,email);
 for(const claims of [{email:'someone@gmail.com'},{email_verified:false},{aud:'other-client'},{iss:'https://evil.example'},{exp:Math.floor(Date.now()/1000)-30}])await assert.rejects(auth.verifyIdentity(await token(claims)));
 const valid=await token();await assert.rejects(auth.verifyIdentity(valid.slice(0,-10)+'0000000000'));
 assert.equal(await auth.getUser(),null);
});
test('API guard rejects spoofed identity headers and cross-origin POST',async()=>{
 let signedIn=false;const server=load('lib/server.ts',{'@/lib/auth':{getUser:async()=>signedIn?{email:'astonajoy77@gmail.com'}:null}},{process:{env:{}}});
 const request=(origin)=>new Request('https://desk.example/api/send',{method:'POST',headers:{origin,'oai-authenticated-user-id':'spoof','oai-authenticated-user-email':'astonajoy77@gmail.com'}});
 await assert.rejects(server.guard(request('https://desk.example')),e=>e.status===401);
 signedIn=true;await assert.rejects(server.guard(request('https://evil.example')),e=>e.status===403);await server.guard(request('https://desk.example'));
});
test('login enforces nonce before issuing session cookie',async()=>{
 const values=new Map([['outreach_nonce','expected']]);let written=false;const jar={get:n=>values.has(n)?{value:values.get(n)}:undefined,set:()=>{written=true;},delete:n=>values.delete(n)};
 let nonce='wrong';class HttpError extends Error{constructor(m,s){super(m);this.status=s;}}
 const server={checkOrigin:()=>{},json:Response.json,HttpError,failure:e=>Response.json({error:e.message},{status:e.status||503})};
 const route=load('app/api/auth/login/route.ts',{'next/headers':{cookies:async()=>jar},'@/lib/auth':{nonceCookie:'outreach_nonce',sessionCookie:'outreach_session',verifyIdentity:async()=>({nonce,exp:Math.floor(Date.now()/1000)+3600})},'@/lib/server':server},{process:{env:{NODE_ENV:'production'}}});
 const req={json:async()=>({credential:'signed-test-token'})};assert.equal((await route.POST(req)).status,403);assert.equal(written,false);nonce='expected';assert.equal((await route.POST(req)).status,200);assert.equal(written,true);assert.equal(values.has('outreach_nonce'),false);
});
