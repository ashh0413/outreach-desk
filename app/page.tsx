import Desk from './desk';
import Login from './login';
import { getUser,googleClientId } from '@/lib/auth';
import { getLeads } from '@/lib/catalog';
export const dynamic='force-dynamic';
export default async function Home() {
 if(!await getUser())return <Login clientId={googleClientId()}/>;
 return <Desk leads={getLeads()}/>;
}
