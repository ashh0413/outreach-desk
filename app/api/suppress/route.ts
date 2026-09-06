import leads from '@/lib/leads.json';
import { database, guard, json } from '@/lib/server';
export async function POST(req:Request) {
 try {await guard(req);const {id,status}=await req.json() as {id:number;status:string};
 if(!leads.some(l=>l.id===id)||!['bounced','do not contact'].includes(status)) return json({error:'Invalid status'},400);
 await database().prepare('INSERT INTO deliveries (id,status,updated) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,updated=excluded.updated').bind(id,status,new Date().toISOString()).run();return json({ok:true});
 }catch{return json({error:'Could not update status.'},503);}
}
