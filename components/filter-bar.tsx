import { STATUS_OPTIONS, type StatusFilter } from '@/lib/overview';

type Choice = { value: string; label: string };

export function FilterBar({
  batch,
  batches,
  country,
  countries,
  status,
  since,
  dates,
  search,
  onBatch,
  onCountry,
  onStatus,
  onSince,
  onSearch,
  onReset,
}: {
  batch: string;
  batches: Choice[];
  country: string;
  countries: string[];
  status: StatusFilter;
  since: string;
  dates: Choice[];
  search: string;
  onBatch: (value: string) => void;
  onCountry: (value: string) => void;
  onStatus: (value: StatusFilter) => void;
  onSince: (value: string) => void;
  onSearch: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <section className="overview-filters" aria-label="Filter prospects">
      <label>
        <span>Batch</span>
        <select value={batch} onChange={event => onBatch(event.target.value)}>
          <option value="all">All batches</option>
          {batches.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        <span>Country</span>
        <select value={country} onChange={event => onCountry(event.target.value)}>
          <option value="all">All countries</option>
          {countries.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value={status} onChange={event => onStatus(event.target.value as StatusFilter)}>
          {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        <span>Researched since</span>
        <select value={since} onChange={event => onSince(event.target.value)}>
          <option value="all">Any research date</option>
          {dates.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="filter-search">
        <span>Search</span>
        <input
          type="search"
          value={search}
          onChange={event => onSearch(event.target.value)}
          placeholder="Business, email, or location"
        />
      </label>
      <button type="button" className="filter-reset" onClick={onReset}>Clear filters</button>
    </section>
  );
}
