import { useEffect, useState } from 'react'
import { getEvents } from '../../services/api.js'
import EventFeedItem from '../../components/EventFeedItem.jsx'

const ATTACK_TYPES = ['BRUTE_FORCE', 'SUSPICIOUS_INPUT', 'ABNORMAL_RATE', 'SUSPICIOUS_ENDPOINT', 'BEHAVIORAL_ANOMALY']
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES = ['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']
const SORT_OPTIONS = [
  { value: 'timestamp', label: 'Time' },
  { value: 'risk_score', label: 'Risk Score' },
  { value: 'severity', label: 'Severity' },
]
const PAGE_SIZE = 25

const EMPTY_FILTERS = {
  attack_type: '', severity: '', status: '', user_id: '', source_ip: '', endpoint: '', start: '', end: '',
}

export default function SecurityEvents() {
  const [events, setEvents] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const params = {
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      sort_by: sortBy,
      sort_dir: sortDir,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }
    getEvents(params).then((res) => setEvents(res.data))
  }, [filters, sortBy, sortDir, page])

  function update(field) {
    return (e) => {
      setPage(0)
      setFilters((f) => ({ ...f, [field]: e.target.value }))
    }
  }

  const hasNextPage = events.length === PAGE_SIZE

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Security Events</h1>

      <div className="flex flex-wrap gap-3 mb-3">
        <select value={filters.attack_type} onChange={update('attack_type')} className="bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All attack types</option>
          {ATTACK_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
        </select>
        <select value={filters.severity} onChange={update('severity')} className="bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.status} onChange={update('status')} className="bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
        </select>
        <input
          type="number" placeholder="User ID" value={filters.user_id} onChange={update('user_id')}
          className="w-28 bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
        />
        <input
          type="text" placeholder="Source IP" value={filters.source_ip} onChange={update('source_ip')}
          className="w-32 bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
        />
        <input
          type="text" placeholder="Endpoint contains…" value={filters.endpoint} onChange={update('endpoint')}
          className="w-40 bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-xs text-slate-500">From</label>
        <input
          type="datetime-local" value={filters.start} onChange={update('start')}
          className="bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
        />
        <label className="text-xs text-slate-500">To</label>
        <input
          type="datetime-local" value={filters.end} onChange={update('end')}
          className="bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
        />
        <span className="w-px h-5 bg-slate-700 mx-1" />
        <label className="text-xs text-slate-500">Sort by</label>
        <select
          value={sortBy} onChange={(e) => { setPage(0); setSortBy(e.target.value) }}
          className="bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={() => { setPage(0); setSortDir((d) => (d === 'desc' ? 'asc' : 'desc')) }}
          className="text-sm px-2 py-1.5 rounded-lg border border-slate-700 hover:border-accent"
          title="Toggle sort direction"
        >
          {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
        </button>
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => { setPage(0); setFilters(EMPTY_FILTERS) }} className="text-sm text-slate-400 hover:text-accent">
            Clear filters
          </button>
        )}
      </div>

      <div className="space-y-2">
        {events.length === 0 && <p className="text-sm text-slate-500">No events match these filters.</p>}
        {events.map((ev) => <EventFeedItem key={ev.id} event={ev} />)}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 disabled:opacity-40 hover:border-accent"
        >
          ← Prev
        </button>
        <span className="text-xs text-slate-500">Page {page + 1}</span>
        <button
          disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 disabled:opacity-40 hover:border-accent"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
