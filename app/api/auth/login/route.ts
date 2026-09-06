import { cookies } from 'next/headers';
import { nonceCookie,sessionCookie,verifyIdentity } from '@/lib/auth';
import { checkOrigin,json,HttpError,failure } from '@/lib/server';
export async function POST(req:Request) {
 try {checkOrigin(req);const {credential}=await req.json();const payload=await verifyIdentity(credential);const jar=await cookies();const nonce=jar.get(nonceCookie)?.value;
 if(!nonce || payload.nonce!==nonce)throw new HttpError('Sign-in expired. Reload and try again.',403);
 jar.set(sessionCookie,credential,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:Math.max(0,Math.min(3600,payload.exp!-Math.floor(Date.now()/1000)))});jar.delete(nonceCookie);return json({ok:true});
 }catch(e){return failure(e,'Sign-in failed. Use the authorised Gmail account and try again.');}
}
