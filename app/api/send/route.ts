import { getLeads } from '@/lib/catalog';
import { guard, json, failure } from '@/lib/server';
import { deliveries } from '@/lib/database';
export const maxDuration=60;
import { makeRaw, sender } from '@/lib/mail';
export async function POST(req:Request) {
 let reserved=false; let id:number|undefined;
 try {
 await guard(req);
 const input=await req.json() as {id:number;token:string}; id=input.id;
 const lead=getLeads().find(l=>l.id===id);
 if(!lead || lead.status!=='ready' || !lead.subject || !lead.body) return json({error:'This business is not eligible for sending.'},400);
 if(typeof input.token!=='string'||input.token.length>4096) return json({error:'Reconnect Gmail.'},401);
 const auth={Authorization:`Bearer ${input.token}`};
 const identityResponse=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:auth,signal:AbortSignal.timeout(15000)});
 if(!identityResponse.ok) return json({error:'Gmail connection expired. Reconnect and try again.'},401);
 const identity=await identityResponse.json() as {email?:string;verified_email?:boolean};
 if(identity.email?.toLowerCase()!==sender||identity.verified_email!==true) return json({error:`Connect ${sender} to send.`},403);
 const reservation=await deliveries.reserve(id!);
 if(!reservation) return json({error:'Already attempted or blocked. Check the saved status; no email was resent.'},409);
 reserved=true;
 // Reserve durably BEFORE sending. No automatic retry: a lost response could still mean Gmail sent it.
 const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({raw:makeRaw(lead.email,lead.subject,lead.body)}),signal:AbortSignal.timeout(25000)});
 if(!response.ok) {
 const definiteFailure=response.status>=400&&response.status<500&&response.status!==408;
 const status=definiteFailure?'failed':'uncertain';
 await deliveries.complete(id!,status);
 return json({status,error:definiteFailure?'Gmail rejected the request. Check your permissions or sending limits; it will not retry automatically.':'Gmail returned an uncertain result. Check Sent before any further action.'},502);
 }
 const result=await response.json() as {id?:string};
 if(!result.id) throw new Error('No message confirmation');
 await deliveries.complete(id!,'sent',result.id);
 return json({status:'sent',messageId:result.id});
 } catch(e) { if(!reserved)return failure(e,'Could not connect. No send was started.');return json({status:reserved?'uncertain':undefined,error:reserved?'The result could not be confirmed. Check Gmail Sent; resending is blocked to avoid duplicates.':'Could not connect. No send was started.'},503); }
}
