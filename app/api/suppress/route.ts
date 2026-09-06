import { getLeads } from '@/lib/catalog';
import { guard,json,failure } from '@/lib/server';
import { deliveries } from '@/lib/database';
export async function POST(req:Request) {
 try {await guard(req);const {id,status}=await req.json() as {id:number;status:string};
 if(!getLeads().some(l=>l.id===id)||!['bounced','do not contact'].includes(status))return json({error:'Invalid status'},400);
 await deliveries.suppress(id,status);return json({ok:true});
 }catch(e){return failure(e,'Could not update status.');}
}
