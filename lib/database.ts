import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
let client:NeonQueryFunction<false,false>|undefined;
let initialized:Promise<void>|undefined;
function sqlClient() {
 if(!client){if(!process.env.DATABASE_URL)throw Error('Connect a Neon database in Vercel Storage.');client=neon(process.env.DATABASE_URL);}
 return client;
}
async function ready() {
 const sql=sqlClient();
 if(!initialized)initialized=sql`CREATE TABLE IF NOT EXISTS outreach_deliveries (id INTEGER PRIMARY KEY, status TEXT NOT NULL, message_id TEXT, updated TIMESTAMPTZ NOT NULL DEFAULT NOW())`.then(()=>{}).catch(e=>{initialized=undefined;throw e;});
 await initialized;return sql;
}
export const deliveries={
 async list(){const sql=await ready();return sql`SELECT id,status,message_id,updated FROM outreach_deliveries`;},
 async reserve(id:number){const sql=await ready();const rows=await sql`INSERT INTO outreach_deliveries (id,status) VALUES (${id},'uncertain') ON CONFLICT(id) DO NOTHING RETURNING id`;return rows.length===1;},
 async complete(id:number,status:string,messageId:string|null=null){const sql=await ready();await sql`UPDATE outreach_deliveries SET status=${status},message_id=${messageId},updated=NOW() WHERE id=${id} AND status='uncertain'`;},
 async suppress(id:number,status:string){const sql=await ready();await sql`INSERT INTO outreach_deliveries (id,status) VALUES (${id},${status}) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,updated=NOW()`;},
};
