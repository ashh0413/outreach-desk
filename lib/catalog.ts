import historical from './leads.json';
import fresh from './fresh-leads.json';
import next from './next-leads.json';
import wide from './wide-leads.json';
import worldwide from './worldwide-leads.json';
import goa from './goa-leads.json';
import { prepareLead } from './prepare-lead';
import type { Lead } from './lead-types';

// Server callers only. The postal address is passed only to authenticated previews.
export function getLeads():Lead[] {
 return [...historical,...fresh,...next,...wide,...worldwide,...goa].map(lead=>prepareLead(lead,process.env.OUTREACH_POSTAL_ADDRESS));
}
