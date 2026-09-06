import historical from './leads.json';
import fresh from './fresh-leads.json';
import { prepareLead } from './prepare-lead';
import type { Lead } from './lead-types';

// Server callers only. The postal address is passed only to authenticated previews.
export function getLeads():Lead[] {
 return [...historical,...fresh].map(lead=>prepareLead(lead,process.env.OUTREACH_POSTAL_ADDRESS));
}
