import { database, guard, json } from '@/lib/server';
export async function GET(req:Request) {
 try { await guard(req); const db=database(); const states=await db.prepare('SELECT * FROM deliveries').all(); const config=await db.prepare('SELECT value FROM settings WHERE key = ?').bind('google_client_id').first<{value:string}>();
 return json({states:states.results,clientId:config?.value || ''}); } catch { return json({error:'Could not load saved history. Sending is disabled until it loads.'},503); }
}
export async function POST(req:Request) {
 try { await guard(req); const {clientId}=await req.json() as {clientId:string};
 if(typeof clientId!=='string'||!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId)) return json({error:'Enter a valid Google Web OAuth client ID, not a secret.'},400);
 await database().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('google_client_id',clientId).run();return json({ok:true});
 } catch { return json({error:'Could not save the connection settings.'},400); }
}
