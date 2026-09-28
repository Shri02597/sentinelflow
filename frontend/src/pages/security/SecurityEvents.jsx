import { useCallback, useEffect, useState } from 'react'
import { getEvents } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'
import EventFeedItem from '../../components/EventFeedItem.jsx'
import ErrorState from '../../components/ErrorState.jsx'
import { SectionHeader, Skeleton, EmptyState, Button } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

const ATTACK_TYPES = ['BRUTE_FORCE', 'SUSPICIOUS_INPUT', 'ABNORMAL_RATE', 'SUSPICIOUS_ENDPOINT', 'BEHAVIORAL_ANOMALY']
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES = ['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']
const SORT_OPTIONS = [
  { value: 'timestamp', label: 'Time' },
  { value: 'risk_score', label: 'Risk Score' },
  { value: 'severity', label: 'Severity' },
]
const PAGE_SIZE = 25
const EMPTY_FILTERS = { attack_type: '', severity: '', status: '', user_id: '', source_ip: '', endpoint: '', start: '', end: '' }

export default function SecurityEvents() {
  const [events, setEvents] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { pollTick } = useLiveFeed()

  const params = {
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    sort_by: sortBy,
    sort_dir: sortDir,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }
  const paramsKey = JSON.stringify(params)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getEvents(JSON.parse(paramsKey))
      setEvents(res.data)
      setError(null)
    } catch {
      setError('Could not load security events.')
    } finally {
      setLoading(false)
    }
  }, [paramsKey])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (pollTick > 0) load() }, [pollTick, load])

  function update(field) {
    return (e) => {
      setPage(0)
      const value = e.target.value
      setFilters((f) => ({ ...f, [field]: value }))
    }
  }

  const hasNextPage = events.length === PAGE_SIZE
  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <SectionHeader
        title="Security Events"
        subtitle="Every detection, filterable and sortable"
        actions={
          activeCount > 0 ? (
            <Button size="sm" icon={<Icon name="close" size={12} />} onClick={() => { setPage(0); setFilters(EMPTY_FILTERS) }}>
              Clear {activeCount}
            </Button>
          ) : null
        }
      />

      {error && <ErrorState message={error} onRetry={load} className="mb-4" />}

      <div className="card mb-5">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2">
            <Icon name="filter" size={14} className="text-accent" />
            Filters
          </h2>
          <span className="text-2xs text-slate-500">
            {events.length} result{events.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Attack type</label>
            <select value={filters.attack_type} onChange={update('attack_type')} className="input">
              <option value="">All types</option>
              {ATTACK_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Severity</label>
            <select value={filters.severity} onChange={update('severity')} className="input">
              <option value="">All severities</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={filters.status} onChange={update('status')} className="input">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Source IP</label>
            <input type="text" placeholder="e.g. 45.33.32.156" value={filters.source_ip} onChange={update('source_ip')} className="input font-mono" />
          </div>
          <div>
            <label className="label">User ID</label>
            <input type="number" placeholder="Any" value={filters.user_id} onChange={update('user_id')} className="input font-mono" />
          </div>
          <div>
            <label className="label">Endpoint contains</label>
            <input type="text" placeholder="/api/products" value={filters.endpoint} onChange={update('endpoint')} className="input font-mono" />
          </div>
          <div>
            <label className="label">From</label>
            <input type="datetime-local" value={filters.start} onChange={update('start')} className="input" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="datetime-local" value={filters.end} onChange={update('end')} className="input" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-line">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Sort</span>
          <select
            value={sortBy}
            onChange={(e) => { setPage(0); setSortBy(e.target.value) }}
            className="input w-auto py-1.5 text-xs"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button size="sm" onClick={() => { setPage(0); setSortDir((d) => (d === 'desc' ? 'asc' : 'desc')) }} iconRight={<span>{sortDir === 'desc' ? '↓' : '↑'}</span>}>
            {sortDir === 'desc' ? 'Descending' : 'Ascending'}
          </Button>
        </div>
      </div>

      <div className="card p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[74px] w-full" />)}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No events match these filters"
            hint={activeCount > 0 ? 'Try clearing a filter or widening the date range.' : 'Nothing has been detected yet.'}
            action={activeCount > 0 ? <Button size="sm" onClick={() => { setPage(0); setFilters(EMPTY_FILTERS) }}>Clear filters</Button> : null}
          />
        ) : (
          <div className="space-y-0.5">
            {events.map((ev) => <EventFeedItem key={ev.id} event={ev} />)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))} icon={<span>←</span>}>
          Previous
        </Button>
        <span className="text-2xs text-slate-500 font-mono">Page {page + 1}</span>
        <Button size="sm" disabled={!hasNextPage} onClick={() => setPage((p) => p + 1)} iconRight={<span>→</span>}>
          Next
        </Button>
      </div>
    </div>
  )
}
