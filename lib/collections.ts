import type { Lead } from './lead-types';

export const newestBatch = 'us-uk-high-potential-2026-11-18';
export function inCollection(lead: Lead, collection: string) {
 return collection === 'historical' ? !lead.batch : lead.batch === collection;
}

export function batchOptions(leads: Lead[]) {
 const batches = [...new Set(leads.map(l => l.batch).filter((b): b is string => !!b))].sort().reverse();
 return [...batches.map(value => {
  const items = leads.filter(l => l.batch === value);
  const byCountry = [...new Set(items.map(l => l.country).filter((c): c is string => !!c))]
   .map(country => `${country} ${items.filter(l => l.country === country).length}`);
  const date = value === newestBatch ? '18 Nov — High potential' : value === 'goa-high-potential-2026-11-18' ? '18 Nov — Goa stays' : value === 'india-usa-2026-11-18' ? '18 Nov — Previous' : value === 'india-usa-2026-09-08' ? '8 Sep' : value === 'india-usa-2026-09' ? '6 Sep' : value;
  return { value, label: `${date}: ${byCountry.join(' + ')}` };
 }), { value: 'historical', label: 'Earlier Bengaluru batch' }];
}
