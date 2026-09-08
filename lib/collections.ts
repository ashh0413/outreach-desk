import type { Lead } from './lead-types';

export const newestBatch = 'india-usa-2026-09-08';
export function inCollection(lead: Lead, collection: string) {
 return collection === 'historical' ? !lead.batch : lead.batch === collection;
}

export function batchOptions(leads: Lead[]) {
 const batches = [...new Set(leads.map(l => l.batch).filter((b): b is string => !!b))].sort().reverse();
 return [...batches.map(value => {
  const items = leads.filter(l => l.batch === value);
  const india = items.filter(l => l.country === 'India').length;
  const usa = items.filter(l => l.country === 'USA').length;
  const date = value === newestBatch ? '8 Sep — New' : value === 'india-usa-2026-09' ? '6 Sep — Earlier' : value;
  return { value, label: `${date}: India ${india} + USA ${usa}` };
 }), { value: 'historical', label: 'Earlier Bengaluru batch' }];
}
