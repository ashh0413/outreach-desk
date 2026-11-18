'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, ArrowUpRight, Send, Check, Copy } from 'lucide-react';
import type { Lead } from '@/lib/lead-types';
import { sender } from '@/lib/mail';
import { readyEmails, runQueue } from '@/lib/bulk';
import { newestBatch, inCollection, batchOptions, batchLabel } from '@/lib/collections';
import { FilterBar } from '@/components/filter-bar';
import { Overview } from '@/components/overview';
import { countryLabel, countryOptions, countrySummary, dateChoices, filterLeads, leadStatus, overviewCounts, statusLabel, type Filters, type HistoryRow } from '@/lib/overview';

type ApiResponse={error?:string;status?:string;states?:HistoryRow[];clientId?:string;messageId?:string};
type TokenResponse={access_token?:string;expires_in?:number;error?:string;scope?:string};
type GoogleAPI={accounts:{id:{initialize(config:Record<string,unknown>):void;renderButton(element:HTMLElement,config:Record<string,unknown>):void};oauth2:{initTokenClient(config:Record<string,unknown>):{requestAccessToken():void};hasGrantedAllScopes(token:TokenResponse,...scopes:string[]):boolean}}};
declare global { interface Window { google?:GoogleAPI } }
const scopes=['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/userinfo.email'];
const EMPTY:Filters={batch:'all',country:'all',status:'all',since:'all'};

export default function Desk({leads}:{leads:Lead[]}) {
 const [view,setView]=useState<'overview'|'leads'>('overview');
 const [selected,setSelected]=useState((leads.find(l=>l.batch===newestBatch&&l.status==='ready')||leads.find(l=>l.batch===newestBatch)||leads[0]).id);
 const [f,setF]=useState<Filters>(EMPTY);
 const [search,setSearch]=useState('');
 const [states,setStates]=useState<Record<number,string>>({});
 const [history,setHistory]=useState<HistoryRow[]>([]);
 const [loaded,setLoaded]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [clientId,setClientId]=useState(''),[setup,setSetup]=useState(false),[gisReady,setGisReady]=useState(false);
 const [connected,setConnected]=useState(false);
 const [batch,setBatch]=useState(false),[progress,setProgress]=useState({sent:0,total:0});
 const stopBatch=useRef(false);
 const token=useRef(''),expires=useRef(0),sending=useRef(false);
 const collections=batchOptions(leads);
 const batchScoped=f.batch==='all'?leads:leads.filter(l=>inCollection(l,f.batch));
 const eligible=readyEmails(batchScoped,states);
 const q=search.trim().toLowerCase();
 const filtered=filterLeads(leads,states,f).filter(l=>!q||(`${l.business} ${l.email} ${l.country||''} ${l.location||''}`).toLowerCase().includes(q));
 const lead=leads.find(l=>l.id===selected)!;
 const current=leadStatus(lead,states);
 const totals=overviewCounts(leads,states);
 useEffect(()=>{
  // oxlint-disable-next-line typescript/no-deprecated -- Legacy fallback keeps the unsaved-send warning in older browsers.
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  if(batch)window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[batch]);
 useEffect(()=>()=>{stopBatch.current=true;},[]);
 async function sendAll() {
  if(sending.current||busy||!loaded||!eligible.length)return;
  if(!token.current||Date.now()>=expires.current){setConnected(false);setNotice('Reconnect Gmail before sending all.');return;}
  if(!window.confirm(`Send all ${eligible.length} ready emails from ${sender}?\n\nThis includes ready businesses in ${f.batch==='all'?'all batches':batchLabel(f.batch)}, regardless of the other filters. Each receives its own prepared message with your portfolio link. Sent, blocked and review-needed entries are excluded.\n\nOnly proceed after reviewing the messages and confirming these contacts are appropriate for outreach. Keep this tab open. Sending is paced 10 seconds apart and stops on any error.`))return;
  sending.current=true;stopBatch.current=false;setBusy(true);setBatch(true);setProgress({sent:0,total:eligible.length});setNotice('Checking saved history…');
  let accepted=0;
  try {
   const r=await fetch('/api/state',{cache:'no-store'});
   const data=await r.json() as ApiResponse;
   if(!r.ok)throw Error(data.error||'Could not load saved history. Nothing sent.');
   const savedStates=data.states??[];
   const latest=Object.fromEntries(savedStates.map(s=>[s.id,s.status]));setStates(latest);setHistory(savedStates);
   const confirmed=new Set(eligible.map(l=>l.id));
   const queue=readyEmails(leads,latest).filter(l=>confirmed.has(l.id));
   setProgress({sent:0,total:queue.length});
   await runQueue(queue,async(item)=>{
    if(!token.current||Date.now()>=expires.current){setConnected(false);throw Error('Gmail connection expired. Reconnect before continuing.');}
    setSelected(item.id);setNotice(`Sending to ${item.business}…`);
    const s=await fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,token:token.current}),signal:AbortSignal.timeout(60000)});
    const d=await s.json() as ApiResponse;
    if(d.status)setStates(v=>({...v,[item.id]:d.status!}));
    if(!s.ok||d.status!=='sent')throw Error(d.error||'Send result could not be confirmed. Check Gmail Sent.');
    accepted++;setProgress({sent:accepted,total:queue.length});
    setNotice(`Gmail accepted ${accepted} of ${queue.length}. Waiting before the next email…`);
   },()=>stopBatch.current,()=>new Promise(resolve=>setTimeout(resolve,10000)));
   const refreshed=await refresh();
   setNotice(`${stopBatch.current?'Stopped':'Finished'}: Gmail accepted ${accepted} of ${queue.length} emails. Acceptance does not guarantee delivery.${refreshed?'':' Saved activity could not be refreshed; reload history.'}`);
  } catch(e){await refresh();setNotice(`Batch stopped after ${accepted} accepted emails. ${e instanceof Error?e.message:'Connection lost. Check Gmail Sent.'} No automatic retry was made.`);}
  finally{sending.current=false;setBusy(false);setBatch(false);}
 }
 async function refresh():Promise<boolean> {
  setLoaded(false);
  try {const r=await fetch('/api/state',{cache:'no-store'});const d=await r.json() as ApiResponse;if(r.status===401){window.location.replace('/');return false;}if(!r.ok)throw Error(d.error);const savedStates=d.states??[];setStates(Object.fromEntries(savedStates.map(s=>[s.id,s.status])));setHistory(savedStates);setClientId(d.clientId??'');setLoaded(true);return true;}
  catch(e){setNotice(e instanceof Error?e.message:'History unavailable.');return false;}
 }
 useEffect(()=>{void refresh();const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=()=>setGisReady(true);s.onerror=()=>setNotice('Google connection could not load. Reload to try again.');document.head.appendChild(s);return()=>{s.remove();};},[]);
 useEffect(()=>{
  const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;
  if(!context)return;const controller=new AbortController();
  const tool={name:'preview_business_email',description:'Select a business and preview its prepared email. Does not send.',inputSchema:{type:'object',properties:{id:{type:'integer'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async(input:{id:number})=>{const item=leads.find(l=>l.id===input?.id);if(!item)throw Error('Unknown business');setView('leads');setSelected(item.id);setSearch('');setF({...EMPTY,batch:item.batch||'historical'});return{id:item.id,business:item.business,subject:item.subject||null,status:states[item.id]||item.status};}};
  try{void Promise.resolve(context.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}
  return()=>controller.abort();
 },[states,leads]);
 function openLead(id:number){setSelected(id);setView('leads');}
 function resetFilters(){setF(EMPTY);setSearch('');}
 function connect() {
  if(!clientId){setSetup(true);return;}
  if(!window.google||!gisReady){setNotice('Google connection is still loading. Please try again.');return;}
  window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:scopes.join(' '),hint:sender,include_granted_scopes:false,error_callback:()=>setNotice('Google sign-in was not completed.'),callback:async(r:TokenResponse)=>{
   if(r.error||!r.access_token||!window.google?.accounts.oauth2.hasGrantedAllScopes(r,...scopes)){setNotice('Please approve email sending and account identification.');return;}
   try{const response=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:`Bearer ${r.access_token}`}});const profile=await response.json() as {email?:string};if(!response.ok||profile.email?.toLowerCase()!==sender)throw Error(`Please connect ${sender}.`);token.current=r.access_token;expires.current=Date.now()+((r.expires_in||3600)-60)*1000;setConnected(true);setSetup(false);setNotice('Gmail connected. Review a message, then click Send email.');}
   catch(e){setNotice(e instanceof Error?e.message:'Could not connect Gmail.');}
  }}).requestAccessToken();
 }
 async function logout(){if(sending.current)return;const r=await fetch('/api/auth/logout',{method:'POST'});if(r.ok){token.current='';window.location.replace('/');}else setNotice('Could not sign out. Try again.');}
 async function send() {
  if(sending.current||current!=='ready'||!loaded)return;
  if(!token.current||Date.now()>=expires.current){setConnected(false);token.current='';setNotice('Reconnect Gmail, then click Send email again.');return;}
  sending.current=true;setBusy(true);setNotice('');
  const id=lead.id;
  try{const r=await fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,token:token.current})});const d=await r.json() as ApiResponse;if(d.status)setStates(s=>({...s,[id]:d.status!}));if(!r.ok)throw Error(d.error);setNotice(`Sent to ${lead.business}. Gmail accepted the email; delivery is not guaranteed.`);void refresh();}
  catch(e){setNotice(e instanceof Error?e.message:'Connection lost. Reload history and check Gmail Sent before continuing.');await refresh();}
  finally{sending.current=false;setBusy(false);}
 }
 async function suppress(status:string) {
  const id=lead.id;setBusy(true);
  try{const r=await fetch('/api/suppress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});if(!r.ok)throw Error('Could not save status.');setStates(s=>({...s,[id]:status}));setNotice('Saved. This business is blocked from sending.');void refresh();}
  catch(e){setNotice(e instanceof Error?e.message:'Could not save status.');}finally{setBusy(false);}
 }
 async function copy() {try{await navigator.clipboard.writeText(`Subject: ${lead.subject}\n\n${lead.body}`);setNotice('Email copied.');}catch{setNotice('Clipboard unavailable. You can select and copy the message text.');}}
 return <main className="desk">
 <header><div className="brand">a<span>Outreach desk<small>Aston Rodrigues</small></span></div><div className="actions"><span className="account">{sender}</span><Button className="h-10 px-4" onClick={connect} disabled={busy}>{connected?<Check/>:<Mail/>}{connected?'Reconnect Gmail':'Connect Gmail'}</Button><Button variant="ghost" onClick={()=>setSetup(!setup)}>Setup</Button><Button variant="ghost" onClick={logout}>Sign out</Button></div></header>
 <section className="intro"><div><p>{countrySummary(leads).toUpperCase()} / BUSINESS OUTREACH</p><h1>Your next conversation.</h1><span>Written for each business. Ready for your review.</span></div><div className="counts"><div><strong>{totals.ready}</strong><span>Ready</span></div><div><strong>{totals.sent}</strong><span>Sent</span></div><div><strong>{totals.bounced}</strong><span>Bounced</span></div></div></section>
 <div className="viewtabs" aria-label="View">
  <button aria-pressed={view==='overview'} onClick={()=>setView('overview')}>Overview</button>
  <button aria-pressed={view==='leads'} onClick={()=>setView('leads')}>Leads</button>
 </div>
 {setup?<section className="setup"><h2>Gmail connection</h2><p>The Google Web client ID is configured through <strong>GOOGLE_CLIENT_ID</strong> in Vercel. Enable Gmail API in that Google Cloud project, and add your deployed origin to its authorised JavaScript origins.</p><p>Click Connect Gmail and approve sending as {sender}. If the consent app is in Testing, add this email as a test user.</p><p className="fine">Access tokens stay in memory only. You may need to reconnect after a reload or expiration. No password or client secret is stored. <a href="https://developers.google.com/identity/oauth2/web/guides/use-token-model" target="_blank" rel="noreferrer">Google’s connection guide ↗</a></p></section>:null}
 {!clientId&&!setup?<div className="notice">Your messages are prepared. <button onClick={()=>setSetup(true)}>Complete the one-time Gmail setup</button> to enable sending.</div>:null}
 {notice?<output className="notice">{notice}</output>:null}
 <FilterBar batch={f.batch} batches={collections} country={f.country} countries={countryOptions(leads)} status={f.status} since={f.since} dates={dateChoices(leads)} search={search} onBatch={value=>setF(prev=>({...prev,batch:value}))} onCountry={value=>setF(prev=>({...prev,country:value}))} onStatus={value=>setF(prev=>({...prev,status:value}))} onSince={value=>setF(prev=>({...prev,since:value}))} onSearch={setSearch} onReset={resetFilters}/>
 {view==='overview'?
  <Overview leads={filtered} states={states} history={history} activeStatus={f.status} onFilterStatus={value=>setF(prev=>({...prev,status:value}))} onOpenLead={openLead}/>
  :<>
  <section className="setup" aria-label="Bulk email sending"><h2>Send all ready emails</h2><p>Each business receives its own prepared message. Sent, bounced, blocked and unverified contacts are excluded. Includes ready contacts in {f.batch==='all'?'all batches':batchLabel(f.batch)}, not just the other filters. Send scope: {countrySummary(batchScoped)}. {batchScoped.length-eligible.length} are excluded from sending. A directory listing does not prove that a business has no website. Public emails are not delivery-verified.</p><Button onClick={sendAll} disabled={busy||!loaded||!connected||!eligible.length}><Send/>Send all ({eligible.length})</Button>{batch?<><output className="batch-progress">{progress.sent} / {progress.total} accepted by Gmail. Keep this tab open.</output><Button variant="outline" onClick={()=>{stopBatch.current=true;setNotice('Stopping after the current request. Already accepted emails cannot be recalled.');}}>Stop sending</Button></>:null}</section>
  {!loaded?<div className="notice">Saved history is not loaded. <button onClick={refresh}>Reload history</button></div>:null}
  <div className="workspace"><section className="lead-list" aria-label="Businesses">{filtered.length?filtered.map(l=><button className={'lead '+(selected===l.id?'selected':'')} key={l.id} onClick={()=>setSelected(l.id)} aria-pressed={selected===l.id}><span className="badge">{statusLabel(leadStatus(l,states))}</span><h2>{l.business}</h2><p>{l.email}</p><small>{countryLabel(l)}</small></button>):<p>No businesses match this view.</p>}</section>
  <article className="message"><div className="message-top"><div className="eyebrow">EMAIL PREVIEW</div><span className="badge">{statusLabel(current)}</span></div><h2>{lead.business}</h2><div className="address">To: {lead.email}<br/>From: Aston Rodrigues · {sender}</div>
  {lead.reason?<div className="hold"><p>{lead.reason}</p></div>:null}
  {lead.body?<><h3>{lead.subject}</h3><p className="body-copy">{lead.body}</p></>:<div className="hold"><h3>Verification needed before outreach</h3><p>{lead.status.replace('skipped: ','')}</p><p>No send-ready message is shown because the contact or website finding needs to be checked first.</p></div>}
  <details className="evidence"><summary>Website finding &amp; source</summary><p>{lead.evidence||'The earlier finding could not be reconfirmed. Do not treat it as verified.'}</p><a href={lead.source} target="_blank" rel="noreferrer">View source page <ArrowUpRight size={14}/></a>{lead.corroboration?<p><a href={lead.corroboration} target="_blank" rel="noreferrer">Additional business listing ↗</a></p>:null}<p className="fine">Research checked {lead.checked||'date unavailable'}. A text excerpt can include hidden or alternate page content. Published email addresses are not a delivery guarantee.</p></details>
  <div className="sendbar"><Button className="h-11 px-5" onClick={send} disabled={busy||!loaded||!connected||current!=='ready'}><Send/>{busy?'Working…':'Send email'}</Button>{lead.body?<Button variant="outline" className="h-11 px-4" onClick={copy}><Copy/>Copy email</Button>:null}<a href="https://aston-rodrigues.vercel.app/" target="_blank" rel="noreferrer">Your portfolio ↗</a></div>
  <div className="secondary-actions"><Button variant="ghost" disabled={busy||!loaded||current==='do not contact'} onClick={()=>suppress('do not contact')}>Do not contact</Button>{current==='sent'||current==='uncertain'?<Button variant="ghost" disabled={busy||!loaded} onClick={()=>suppress('bounced')}>Mark as bounced</Button>:null}</div><p className="fine">One click sends only this email. Sent means accepted by Gmail, not delivered. Bounces and opt-outs are marked manually; your inbox is not read.</p>
  </article></div></>}</main>;
}
