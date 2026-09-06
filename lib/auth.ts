import { cookies } from 'next/headers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { sender } from './mail';

export const sessionCookie = 'outreach_session';
export const nonceCookie = 'outreach_nonce';
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export function googleClientId() { return process.env.GOOGLE_CLIENT_ID || ''; }
export async function verifyIdentity(token:string) {
 const audience=googleClientId();
 if(!audience || typeof token!=='string'||token.length>8192) throw Error('Google sign-in is not configured.');
 const {payload}=await jwtVerify(token,googleKeys,{audience,issuer:['https://accounts.google.com','accounts.google.com'],algorithms:['RS256'],requiredClaims:['exp','iat','sub','email','email_verified']});
 if(payload.email!==sender || payload.email_verified!==true || typeof payload.exp!=='number') throw Error('This account is not allowed.');
 return payload;
}
export async function getUser() {
 const token=(await cookies()).get(sessionCookie)?.value;
 if(!token)return null;
 try {return await verifyIdentity(token);} catch {return null;}
}
