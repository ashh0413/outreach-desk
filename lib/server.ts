import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export function database() { return env.DB; }
export async function guard(req: Request) {
 if (!await getChatGPTUser()) throw new Error('Sign in to your private workspace first.');
 if (req.method !== 'GET' && req.headers.get('origin') !== new URL(req.url).origin) throw new Error('Untrusted request origin.');
}
export const json = (data: unknown, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
