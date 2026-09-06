import type { Lead } from './lead-types';

export function readyEmails(leads: Lead[], states: Record<number,string>) {
 const addresses=new Set<string>();
 return leads.filter(l=>{
  const email=l.email.trim().toLowerCase();
  if(l.status!=='ready'||(states[l.id]||l.status)!=='ready'||!l.subject||!l.body||!email||addresses.has(email))return false;
  addresses.add(email);return true;
 });
}

// One request at a time; any failure stops the queue and is never retried.
export async function runQueue<T>(items:T[], send:(item:T)=>Promise<void>, stopped:()=>boolean, wait:()=>Promise<void>) {
 let sent=0;
 for(const item of items){
  if(stopped())break;
  if(sent){await wait();if(stopped())break;}
  await send(item);sent++;
 }
 return sent;
}
