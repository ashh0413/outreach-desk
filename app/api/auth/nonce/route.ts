import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { nonceCookie } from '@/lib/auth';
import { json } from '@/lib/server';
export async function GET(){const nonce=randomBytes(32).toString('base64url');(await cookies()).set(nonceCookie,nonce,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:300});return json({nonce});}
