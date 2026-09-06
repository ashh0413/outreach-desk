import { getUser } from '@/lib/auth';
export class HttpError extends Error { constructor(message:string, public status:number){super(message);} }
export function checkOrigin(req:Request) {
 const expected=process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(req.url).origin;
 if(req.headers.get('origin')!==expected)throw new HttpError('Untrusted request origin.',403);
}
export async function guard(req: Request) {
 if(req.method!=='GET')checkOrigin(req);
 if(!await getUser())throw new HttpError('Your session expired. Sign in again.',401);
}
export const json = (data: unknown, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function failure(error:unknown,fallback:string) {return json({error:error instanceof HttpError?error.message:fallback},error instanceof HttpError?error.status:503);}
