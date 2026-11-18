import type { Lead } from '@/lib/lead-types';
import { batchLabel } from '@/lib/collections';
import {
  actionLists,
  activityRows,
  batchKey,
  countryLabel,
  formatActivityTime,
  groupCounts,
  leadStatus,
  overviewCounts,
  statusLabel,
  type BreakdownRow,
  type HistoryRow,
  type StatusFilter,
} from '@/lib/overview';

function Bar({ row }: { row: BreakdownRow }) {
  const width = (count: number) => row.total ? String((count / row.total) * 100) + '%' : '0%';
  return (
    <figure
      className="ovw-bar"
      aria-label={row.total + ' prospects: ' + row.ready + ' ready, ' + row.sent + ' sent, ' + row.attention + ' need attention'}
    >
      <span className="r" style={{ width: width(row.ready) }} />
      <span className="s" style={{ width: width(row.sent) }} />
      <span className="a" style={{ width: width(row.attention) }} />
    </figure>
  );
}

function Breakdown({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <section className="ovw-panel">
      <div className="ovw-panel-head"><h2>{title}</h2><span>{rows.length} groups</span></div>
      {rows.length ? <div className="bk-list">{rows.map(row => (
        <div className="bk" key={row.key}>
          <div className="bk-label"><strong>{row.label}</strong><span>{row.total}</span></div>
          <Bar row={row} />
          <p className="bk-meta">{row.ready} ready <i /> {row.sent} sent <i /> {row.attention} attention</p>
        </div>
      ))}</div> : <p className="ovw-empty">No prospects match these filters.</p>}
      <div className="ovw-legend" aria-label="Breakdown legend">
        <span><i className="r" /> Ready</span><span><i className="s" /> Sent</span><span><i className="a" /> Attention</span>
      </div>
    </section>
  );
}

function ActionList({
  title,
  items,
  states,
  onOpenLead,
}: {
  title: string;
  items: Lead[];
  states: Record<number, string>;
  onOpenLead: (id: number) => void;
}) {
  return (
    <section className="ovw-action-group">
      <h3>{title}<span>{items.length}</span></h3>
      {items.length ? <div className="ovw-action-list">{items.slice(0, 6).map(lead => (
        <button type="button" key={lead.id} onClick={() => onOpenLead(lead.id)}>
          <span className="badge">{statusLabel(leadStatus(lead, states))}</span>
          <strong>{lead.business}</strong>
          <small>{lead.location || lead.country || 'Location unavailable'}</small>
        </button>
      ))}</div> : <p className="ovw-empty">Nothing needs attention here.</p>}
      {items.length > 6 ? <p className="ovw-more">Showing 6 of {items.length}</p> : null}
    </section>
  );
}

export function Overview({
  leads,
  states,
  history,
  activeStatus,
  onFilterStatus,
  onOpenLead,
}: {
  leads: Lead[];
  states: Record<number, string>;
  history: HistoryRow[];
  activeStatus: StatusFilter;
  onFilterStatus: (status: StatusFilter) => void;
  onOpenLead: (id: number) => void;
}) {
  const counts = overviewCounts(leads, states);
  const actions = actionLists(leads, states);
  const activity = activityRows(history, leads, 8);
  const metrics: Array<{ label: string; value: number; status: StatusFilter; hint: string }> = [
    { label: 'Total prospects', value: counts.total, status: 'all', hint: 'Matching filters' },
    { label: 'Ready to send', value: counts.ready, status: 'ready', hint: 'Prepared drafts' },
    { label: 'Sent', value: counts.sent, status: 'sent', hint: 'Accepted by Gmail' },
    { label: 'Needs review', value: counts.needsReview, status: 'needs review', hint: 'Held from sending' },
    { label: 'Bounced', value: counts.bounced, status: 'bounced', hint: 'Marked manually' },
    { label: 'Do not contact', value: counts.doNotContact, status: 'do not contact', hint: 'Blocked from sending' },
    { label: 'Unconfirmed', value: counts.uncertain, status: 'uncertain', hint: 'Check Gmail before retry' },
  ];
  const byBatch = groupCounts(leads, states, batchKey, batchLabel);
  const byCountry = groupCounts(leads, states, countryLabel);

  return (
    <div className="ovw">
      <div className="ovw-heading">
        <div>
          <p className="eyebrow">OUTREACH OVERVIEW</p>
          <h1>Your pipeline, at a glance.</h1>
          <p className="ovw-subtitle">Use the filters above to focus on a campaign or region. Select a card to open those leads.</p>
        </div>
        <div className="ovw-total-note">{leads.length} matching {leads.length === 1 ? 'prospect' : 'prospects'}</div>
      </div>

      <section className="ovw-metrics" aria-label="Prospect totals">
        {metrics.map(metric => (
          <button
            type="button"
            key={metric.label}
            className={'ovw-metric' + (activeStatus === metric.status ? ' active' : '')}
            aria-pressed={activeStatus === metric.status}
            onClick={() => onFilterStatus(metric.status)}
          >
            <span className="ovw-metric-label">{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </button>
        ))}
      </section>

      <div className="ovw-grid">
        <Breakdown title="Campaigns" rows={byBatch} />
        <Breakdown title="Markets" rows={byCountry} />
      </div>

      <section className="ovw-panel">
        <div className="ovw-panel-head">
          <h2>Needs attention</h2>
          <span>{actions.uncertain.length + actions.bounced.length + actions.held.length} items</span>
        </div>
        <div className="ovw-actions">
          <ActionList title="Check Gmail" items={actions.uncertain} states={states} onOpenLead={onOpenLead} />
          <ActionList title="Bounced" items={actions.bounced} states={states} onOpenLead={onOpenLead} />
          <ActionList title="Held for review" items={actions.held} states={states} onOpenLead={onOpenLead} />
        </div>
      </section>

      <section className="ovw-panel">
        <div className="ovw-panel-head"><h2>Recent saved activity</h2><span>{activity.length} latest</span></div>
        {activity.length ? <div className="ovw-activity">{activity.map(item => (
          <button type="button" className="ovw-activity-row" key={item.id} onClick={() => onOpenLead(item.id)}>
            <span className="ovw-activity-mark" aria-hidden="true" />
            <span className="ovw-activity-main">
              <strong>{item.business}</strong>
              <small>{item.location || 'Location unavailable'} · {statusLabel(item.status)}</small>
            </span>
            <time dateTime={item.updated}>{formatActivityTime(item.updated)}</time>
          </button>
        ))}</div> : <p className="ovw-empty">No saved activity is currently available. Saved statuses will appear here after they are recorded.</p>}
        <p className="ovw-footnote">Activity times show when the app saved a status. The app does not read your inbox or track opens and replies.</p>
      </section>
    </div>
  );
}
