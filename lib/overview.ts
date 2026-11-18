import type { Lead } from './lead-types';

// Pure helpers for the overview dashboard. No I/O: every function returns
// new data, so the whole thing is unit-testable without mocks.
//
// Effective status: a saved database status (from /api/state) wins; otherwise
// the lead's source status is used; unknown source statuses read as "needs
// review". This mirrors how the send flow treats records.

export type StatusFilter = 'all' | 'ready' | 'sent' | 'needs review' | 'bounced' | 'do not contact' | 'uncertain';

const SAVED = new Set(['sent', 'bounced', 'do not contact', 'uncertain', 'failed']);

export function leadStatus(lead: Lead, states: Record<number, string> = {}): string {
 const saved = states[lead.id];
 if (saved && SAVED.has(saved)) return saved;
  if (['ready', 'sent', 'bounced', 'do not contact', 'uncertain', 'failed'].includes(lead.status)) {
    return lead.status;
  }
 return 'needs review';
}

export function matchesStatus(effective: string, filter: StatusFilter): boolean {
 if (filter === 'all') return true;
 if (filter === 'uncertain') return effective === 'uncertain' || effective === 'failed';
 return effective === filter;
}

export function statusLabel(s: string): string {
 if (s.startsWith('skipped')) return 'Needs review';
 if (s === 'uncertain') return 'Check Gmail';
 if (s === 'failed') return 'Send failed';
 return s;
}

export function batchKey(lead: Lead): string { return lead.batch ?? 'historical'; }
export function countryLabel(lead: Lead): string { return lead.country ?? 'Earlier batch'; }
export function countryOptions(leads: Lead[]): string[] {
 return [...new Set(leads.map(countryLabel))].sort();
}

export type Filters = { batch: string; country: string; status: StatusFilter; since: string };

// Shared by the overview and leads filters so both lists filter the same way.
export const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
 { value: 'all', label: 'All statuses' },
 { value: 'ready', label: 'Ready to send' },
 { value: 'sent', label: 'Sent' },
 { value: 'needs review', label: 'Needs attention' },
 { value: 'bounced', label: 'Bounced' },
 { value: 'do not contact', label: 'Do not contact' },
 { value: 'uncertain', label: 'Unconfirmed / failed' },
];

// All four filters combine with AND. Date keeps leads checked on-or-after
// `since` (YYYY-MM-DD); 'all' disables it. Leads without a checked date are
// only visible when the date filter is off.
export function filterLeads(leads: Lead[], states: Record<number, string>, f: Filters): Lead[] {
 return leads.filter(l =>
  (f.batch === 'all' || batchKey(l) === f.batch) &&
  (f.country === 'all' || countryLabel(l) === f.country) &&
  matchesStatus(leadStatus(l, states), f.status) &&
  (f.since === 'all' || (l.checked ? l.checked.slice(0, 10) >= f.since : false)));
}

export type OverviewCounts = { total: number; ready: number; sent: number; needsReview: number; bounced: number; doNotContact: number; uncertain: number };

export function overviewCounts(leads: Lead[], states: Record<number, string> = {}): OverviewCounts {
 const c: OverviewCounts = { total: leads.length, ready: 0, sent: 0, needsReview: 0, bounced: 0, doNotContact: 0, uncertain: 0 };
 for (const lead of leads) {
  const status = leadStatus(lead, states);
  if (status === 'ready') c.ready++;
  else if (status === 'sent') c.sent++;
  else if (status === 'bounced') c.bounced++;
  else if (status === 'do not contact') c.doNotContact++;
  else if (status === 'uncertain' || status === 'failed') c.uncertain++;
  else c.needsReview++;
 }
 return c;
}

export type BreakdownRow = { key: string; label: string; total: number; ready: number; sent: number; attention: number };

export function groupCounts(leads: Lead[], states: Record<number, string>, key: (lead: Lead) => string, label: (key: string) => string = (k) => k): BreakdownRow[] {
 const rows = new Map<string, BreakdownRow>();
 for (const lead of leads) {
  const k = key(lead);
  const row = rows.get(k) ?? { key: k, label: label(k), total: 0, ready: 0, sent: 0, attention: 0 };
  row.total++;
  const status = leadStatus(lead, states);
  if (status === 'ready') row.ready++;
  else if (status === 'sent') row.sent++;
  else row.attention++;
  rows.set(k, row);
 }
 return [...rows.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

// "India 133 + USA 118 + UK 10 + Earlier batch 100"
export function countrySummary(leads: Lead[]): string {
 return countryOptions(leads).map(c => `${c} ${leads.filter(l => countryLabel(l) === c).length}`).join(' + ');
}

export type ActionLists = { uncertain: Lead[]; bounced: Lead[]; held: Lead[] };

export function actionLists(leads: Lead[], states: Record<number, string> = {}): ActionLists {
 const lists: ActionLists = { uncertain: [], bounced: [], held: [] };
 for (const lead of leads) {
  const status = leadStatus(lead, states);
  if (status === 'uncertain' || status === 'failed') lists.uncertain.push(lead);
  else if (status === 'bounced') lists.bounced.push(lead);
  else if (status === 'needs review') lists.held.push(lead);
 }
 const byId = (a: Lead, b: Lead) => a.id - b.id;
 lists.uncertain.sort(byId); lists.bounced.sort(byId); lists.held.sort(byId);
 return lists;
}

export type DateChoice = { value: string; label: string };

export function dateChoices(leads: Lead[]): DateChoice[] {
 const days = [...new Set(leads.map(l => (l.checked ? l.checked.slice(0, 10) : '')).filter(Boolean))].sort().reverse();
 return days.map(value => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const label = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : value;
  return { value, label };
 });
}

// Raw rows as /api/state returns them (node-postgres column names).
export type HistoryRow = { id: number; status: string; message_id?: string | null; updated?: string | null };
export type ActivityRow = { id: number; business: string; location?: string; status: string; updated: string; messageId: string | null };

// Only rows the history API actually stamped with a timestamp are shown.
// Unknown lead ids and records without an `updated` value are dropped, never
// invented.
export function activityRows(history: HistoryRow[], leads: Lead[], limit = 10): ActivityRow[] {
 const byId = new Map<number, Lead>(leads.map(l => [l.id, l]));
 const rows: ActivityRow[] = [];
 for (const record of history) {
  const lead = byId.get(record.id);
  if (!lead || !record.updated) continue;
  rows.push({ id: lead.id, business: lead.business, location: lead.location, status: record.status, updated: record.updated, messageId: record.message_id ?? null });
 }
 rows.sort((a, b) => b.updated.localeCompare(a.updated));
 return rows.slice(0, limit);
}

export function formatActivityTime(value: string): string {
 const t = new Date(value);
 return Number.isNaN(t.getTime()) ? value : t.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
