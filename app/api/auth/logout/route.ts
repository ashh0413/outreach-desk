import { cookies } from 'next/headers';
import { sessionCookie } from '@/lib/auth';
import { checkOrigin,json,failure } from '@/lib/server';
export async function POST(req:Request){try{checkOrigin(req);(await cookies()).delete(sessionCookie);return json({ok:true});}catch(e){return failure(e,'Could not sign out.');}}
