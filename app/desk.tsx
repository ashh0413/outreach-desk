'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Mail, ArrowUpRight, Send, Check, Copy } from 'lucide-react';
import leads from '@/lib/leads.json';
import { sender } from '@/lib/mail';

type ApiResponse={error?:string;status?:string;states:Array<{id:number;status:string}>;clientId:string};
type TokenResponse={access_token?:string;expires_in?:number;error?:string;scope?:string};
type GoogleAPI={accounts:{oauth2:{initTokenClient(config:Record<string,unknown>):{requestAccessToken():void};hasGrantedAllScopes(token:TokenResponse,...scopes:string[]):boolean}}};
declare global { interface Window { google?:GoogleAPI } }
const scopes=['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/userinfo.email'];
const statusLabel=(s:string)=>s.startsWith('skipped')?'Needs review':s==='uncertain'?'Check Gmail':s;

export default function Desk() {
 const [selected,setSelected]=useState(leads.find(l=>l.status==='ready')!.id);
 const [states,setStates]=useState<Record<number,string>>({});
 const [loaded,setLoaded]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [filter,setFilter]=useState('ready'),[search,setSearch]=useState('');
 const [clientId,setClientId]=useState(''),[draftId,setDraftId]=useState(''),[setup,setSetup]=useState(false),[gisReady,setGisReady]=useState(false);
 const [connected,setConnected]=useState(false);
 const token=useRef(''),expires=useRef(0),sending=useRef(false);
 const lead=leads.find(l=>l.id===selected)!;
 const state=(l:typeof lead)=>states[l.id]||l.status;
 const current=state(lead);
 async function refresh() {
  setLoaded(false);
  try {const r=await fetch('/api/state',{cache:'no-store'});const d=await r.json() as ApiResponse;if(!r.ok)throw Error(d.error);setStates(Object.fromEntries(d.states.map((s:{id:number;status:string})=>[s.id,s.status])));setClientId(d.clientId);setDraftId(d.clientId);setLoaded(true);}
  catch(e){setNotice(e instanceof Error?e.message:'History unavailable.');}
 }
 useEffect(()=>{void refresh();const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=()=>setGisReady(true);s.onerror=()=>setNotice('Google connection could not load. Reload to try again.');document.head.appendChild(s);return()=>{s.remove();};},[]);
 useEffect(()=>{
  const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;
  if(!context)return;const controller=new AbortController();
  const tool={name:'preview_business_email',description:'Select a business and preview its prepared email. Does not send.',inputSchema:{type:'object',properties:{id:{type:'integer'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async(input:{id:number})=>{const item=leads.find(l=>l.id===input?.id);if(!item)throw Error('Unknown business');setSelected(item.id);setFilter('all');setSearch('');return{id:item.id,business:item.business,subject:item.subject||null,status:states[item.id]||item.status};}};
  try{void Promise.resolve(context.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}
  return()=>controller.abort();
 },[states]);
 const visible=leads.filter(l=>(filter==='all'||(filter==='review'?state(l)!=='ready'&&state(l)!=='sent':state(l)===filter))&&(`${l.business} ${l.email}`).toLowerCase().includes(search.toLowerCase()));
 function connect() {
  if(!clientId){setSetup(true);return;}
  if(!window.google||!gisReady){setNotice('Google connection is still loading. Please try again.');return;}
  window.google.accounts.oauth2.initTokenClient({client_id:clientId,scope:scopes.join(' '),hint:sender,include_granted_scopes:false,error_callback:()=>setNotice('Google sign-in was not completed.'),callback:async(r:TokenResponse)=>{
   if(r.error||!r.access_token||!window.google?.accounts.oauth2.hasGrantedAllScopes(r,...scopes)){setNotice('Please approve email sending and account identification.');return;}
   try{const response=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:`Bearer ${r.access_token}`}});const profile=await response.json() as {email?:string};if(!response.ok||profile.email?.toLowerCase()!==sender)throw Error(`Please connect ${sender}.`);token.current=r.access_token;expires.current=Date.now()+((r.expires_in||3600)-60)*1000;setConnected(true);setSetup(false);setNotice('Gmail connected. Review a message, then click Send email.');}
   catch(e){setNotice(e instanceof Error?e.message:'Could not connect Gmail.');}
  }}).requestAccessToken();
 }
 async function saveSetup() {
  try{const r=await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:draftId.trim()})});const d=await r.json() as ApiResponse;if(!r.ok)throw Error(d.error);setClientId(draftId.trim());setNotice('Connection settings saved. Click Connect Gmail.');}
  catch(e){setNotice(e instanceof Error?e.message:'Could not save settings.');}
 }
 async function send() {
  if(sending.current||current!=='ready'||!loaded)return;
  if(!token.current||Date.now()>=expires.current){setConnected(false);token.current='';setNotice('Reconnect Gmail, then click Send email again.');return;}
  sending.current=true;setBusy(true);setNotice('');
  const id=lead.id;
  try{const r=await fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,token:token.current})});const d=await r.json() as ApiResponse;if(d.status)setStates(s=>({...s,[id]:d.status!}));if(!r.ok)throw Error(d.error);setNotice(`Sent to ${lead.business}. Gmail accepted the email; delivery is not guaranteed.`);}
  catch(e){setNotice(e instanceof Error?e.message:'Connection lost. Reload history and check Gmail Sent before continuing.');await refresh();}
  finally{sending.current=false;setBusy(false);}
 }
 async function suppress(status:string) {
  const id=lead.id;setBusy(true);
  try{const r=await fetch('/api/suppress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});if(!r.ok)throw Error('Could not save status.');setStates(s=>({...s,[id]:status}));setNotice('Saved. This business is blocked from sending.');}
  catch(e){setNotice(e instanceof Error?e.message:'Could not save status.');}finally{setBusy(false);}
 }
 async function copy() {try{await navigator.clipboard.writeText(`Subject: ${lead.subject}\n\n${lead.body}`);setNotice('Email copied.');}catch{setNotice('Clipboard unavailable. You can select and copy the message text.');}}
 return <main className="desk">
 <header><div className="brand">a<span>Outreach desk<small>Aston Rodrigues</small></span></div><div className="actions"><span className="account">{sender}</span><Button className="h-10 px-4" onClick={connect} disabled={busy}>{connected?<Check/>:<Mail/>}{connected?'Reconnect Gmail':'Connect Gmail'}</Button><Button variant="ghost" onClick={()=>setSetup(!setup)}>Setup</Button></div></header>
 <section className="intro"><div><p>BENGALURU / BUSINESS OUTREACH</p><h1>Your next conversation.</h1><span>Written for each business. Ready for your review.</span></div><div className="counts"><div><strong>{leads.filter(l=>state(l)==='ready').length}</strong><span>Ready</span></div><div><strong>{leads.filter(l=>state(l)==='sent').length}</strong><span>Sent</span></div><div><strong>{leads.filter(l=>state(l)==='bounced').length}</strong><span>Bounced</span></div></div></section>
 {setup?<section className="setup"><h2>Connect your Gmail once</h2><p>Google requires an OAuth Web client before this dashboard can send. No password or client secret is needed here.</p><ol><li>In <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noreferrer">Google Cloud</a>, enable Gmail API for your project.</li><li>Configure the OAuth consent screen. If the app is in Testing, add <strong>{sender}</strong> as a test user.</li><li>Create a Web application OAuth client. Add this page’s origin as an authorised JavaScript origin: <code>{typeof window==='undefined'?'The deployed site address':window.location.origin}</code>.</li><li>Paste the client ID below, save, then choose Connect Gmail and approve sending.</li></ol><label htmlFor="clientid">Google Web client ID</label><div className="actions"><Input id="clientid" value={draftId} onChange={e=>setDraftId(e.target.value)} placeholder="123…apps.googleusercontent.com"/><Button onClick={saveSetup} disabled={!loaded}>Save setup</Button></div><p className="fine">Access tokens stay in memory only. Google may ask you to reconnect when they expire. <a href="https://developers.google.com/identity/oauth2/web/guides/use-token-model" target="_blank" rel="noreferrer">Google’s connection guide ↗</a></p></section>:null}
 {!clientId&&!setup?<div className="notice">Your messages are prepared. <button onClick={()=>setSetup(true)}>Complete the one-time Gmail setup</button> to enable sending.</div>:null}
 {notice?<div className="notice" role="status">{notice}</div>:null}
 {!loaded?<div className="notice">Saved history is not loaded. <button onClick={refresh}>Reload history</button></div>:null}
<div className="toolbar"><Input aria-label="Find a business" placeholder="Find a business…" value={search} onChange={e=>setSearch(e.target.value)}/><Select value={filter} onValueChange={v=>v&&setFilter(v)}><SelectTrigger aria-label="Filter businesses"><SelectValue/></SelectTrigger><SelectContent>{[['ready','Ready to send'],['sent','Sent'],['review','Needs attention'],['all','All 100 businesses']].map(([v,t])=><SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select><span>{visible.length} businesses</span></div>
 <div className="workspace"><section className="lead-list" aria-label="Businesses">{visible.length?visible.map(l=><button className={'lead '+(selected===l.id?'selected':'')} key={l.id} onClick={()=>setSelected(l.id)} aria-pressed={selected===l.id}><span className="badge">{statusLabel(state(l))}</span><h2>{l.business}</h2><p>{l.email}</p></button>):<p>No businesses match this view.</p>}</section>
 <article className="message"><div className="message-top"><div className="eyebrow">EMAIL PREVIEW</div><span className="badge">{statusLabel(current)}</span></div><h2>{lead.business}</h2><div className="address">To: {lead.email}<br/>From: Aston Rodrigues · {sender}</div>
 {lead.body?<><h3>{lead.subject}</h3><p className="body-copy">{lead.body}</p></>:<div className="hold"><h3>Verification needed before outreach</h3><p>{lead.status.replace('skipped: ','')}</p><p>No send-ready message is shown because the contact or website finding needs to be checked first.</p></div>}
 <details className="evidence"><summary>Website finding &amp; source</summary><p>{lead.evidence||'The earlier finding could not be reconfirmed. Do not treat it as verified.'}</p><a href={lead.source} target="_blank" rel="noreferrer">View source page <ArrowUpRight size={14}/></a><p className="fine">Research checked 6 September 2026. A text excerpt can include hidden or alternate page content. Published email addresses are not a delivery guarantee.</p></details>
 <div className="sendbar"><Button className="h-11 px-5" onClick={send} disabled={busy||!loaded||!connected||current!=='ready'}><Send/>{busy?'Working…':'Send email'}</Button>{lead.body?<Button variant="outline" className="h-11 px-4" onClick={copy}><Copy/>Copy email</Button>:null}<a href="https://aston-rodrigues.vercel.app/" target="_blank" rel="noreferrer">Your portfolio ↗</a></div>
 <div className="secondary-actions"><Button variant="ghost" disabled={busy||!loaded||current==='do not contact'} onClick={()=>suppress('do not contact')}>Do not contact</Button>{current==='sent'||current==='uncertain'?<Button variant="ghost" disabled={busy||!loaded} onClick={()=>suppress('bounced')}>Mark as bounced</Button>:null}</div><p className="fine">One click sends only this email. Sent means accepted by Gmail, not delivered. Bounces and opt-outs are marked manually; your inbox is not read.</p>
 </article></div></main>;
}
