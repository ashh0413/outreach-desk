import { guard,json,failure } from '@/lib/server';
import { deliveries } from '@/lib/database';
import { googleClientId } from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(req:Request) {
 try {await guard(req);return json({states:await deliveries.list(),clientId:googleClientId()});}
 catch(e){return failure(e,'Could not load history. Connect DATABASE_URL to a Neon database in Vercel and redeploy. Sending stays disabled.');}
}
