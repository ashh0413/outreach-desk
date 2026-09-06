'use client';
import { useEffect,useRef,useState } from 'react';
import Script from 'next/script';
import { sender } from '@/lib/mail';
export default function Login({clientId}:{clientId:string}) {
 const button=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false);const [notice,setNotice]=useState('');
 useEffect(()=>{if(!ready||!clientId||!button.current)return;let cancelled=false;
 void (async()=>{try{const r=await fetch('/api/auth/nonce',{cache:'no-store'});const {nonce}=await r.json();if(!r.ok||!nonce)throw Error('Could not start sign-in.');if(cancelled)return;
 window.google?.accounts.id.initialize({client_id:clientId,nonce,auto_select:false,callback:async({credential}:{credential:string})=>{setNotice('Signing in…');try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential})});const d=await response.json();if(!response.ok)throw Error(d.error);window.location.replace('/');}catch(e){setNotice(e instanceof Error?e.message:'Sign-in failed.');}}});
 if(button.current)window.google?.accounts.id.renderButton(button.current,{theme:'outline',size:'large',text:'signin_with',shape:'rectangular'});
 }catch{setNotice('Google sign-in could not load. Reload to try again.');}})();return()=>{cancelled=true;};},[ready,clientId]);
 return <main className="desk"><header><div className="brand">a<span>Outreach desk</span></div></header><section className="message login"><div className="eyebrow">PRIVATE WORKSPACE</div><h2>Your outreach, in one place.</h2><p>Sign in as {sender} to view your businesses and prepared emails.</p>{clientId?<><Script src="https://accounts.google.com/gsi/client" onReady={()=>setReady(true)} onError={()=>setNotice('Google sign-in failed to load. Please reload.')}/><div ref={button} className="google-signin"/></>:<div className="notice">Deployment is working. Add <strong>GOOGLE_CLIENT_ID</strong> in Vercel’s environment variables and redeploy to enable sign-in. Connect a Neon database with <strong>DATABASE_URL</strong> to save email history. See the repository README for setup.</div>}<p role="status">{notice}</p><p className="fine">Signing in does not send email. Gmail sending permission is requested separately inside your workspace.</p></section></main>;
}
