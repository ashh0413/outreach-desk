import type { Lead } from './lead-types';

export const newestBatch = 'us-uk-high-potential-2026-11-18';
export function inCollection(lead: Lead, collection: string) {
 return collection === 'historical' ? !lead.batch : lead.batch === collection;
}

export function batchLabel(value: string): string {
 if (value === newestBatch) return '18 Nov — High potential';
 if (value === 'goa-high-potential-2026-11-18') return '18 Nov — Goa stays';
 if (value === 'india-usa-2026-11-18') return '18 Nov — Previous';
 if (value === 'india-usa-2026-09-08') return '8 Sep';
 if (value === 'india-usa-2026-09') return '6 Sep';
 if (value === 'historical') return 'Earlier Bengaluru batch';
 return value;
}
export function batchOptions(leads: Lead[]) {
 const batches = [...new Set(leads.map(l => l.batch).filter((b): b is string => !!b))].sort().reverse();
 return [...batches.map(value => {
  const items = leads.filter(l => l.batch === value);
  const byCountry = [...new Set(items.map(l => l.country).filter((c): c is string => !!c))]
   .map(country => `${country} ${items.filter(l => l.country === country).length}`);
  return { value, label: `${batchLabel(value)}: ${byCountry.join(' + ')}` };
 }), { value: 'historical', label: batchLabel('historical') }];
}
