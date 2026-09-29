import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { getStats, getTraffic, getEvents } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'
import ConnectionStatus from '../../components/ConnectionStatus.jsx'
import StatCard from '../../components/StatCard.jsx'
import EventFeedItem from '../../components/EventFeedItem.jsx'
import TopThreats from './TopThreats.jsx'
import { SectionHeader, Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

/** Coalesce refetches so a burst of detections can't cause a request storm. */
const REFETCH_COALESCE_MS = 2000

const SEVERITY_COLORS = { LOW: '#34d399', MEDIUM: '#fbbf24', HIGH: '#fb923c', CRITICAL: '#f87171' }
const AXIS = { fontSize: 10, fill: '#64748b' }
const GRID = '#1a2333'
const TOOLTIP = {
  contentStyle: {
    background: '#0e131d',
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    boxShadow: '0 12px 48px -12px rgba(0,0,0,0.8)',
  },
  labelStyle: { color: '#94a3b8', marginBottom: 4 },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(148,163,184,0.06)' },
}

export default function SecurityDashboard() {
  const [stats, setStats] = useState(null)
  const [traffic, setTraffic] = useState([])
  const [liveEvents, setLiveEvents] = useState([])
  const [error, setError] = useState(null)
  const [lastLoadedAt, setLastLoadedAt] = useState(null)

  const { subscribe, pollTick, status } = useLiveFeed()
  const lastRefetchRef = useRef(0)
  const pendingRefetchRef = useRef(null)

  /**
   * Each panel is fetched independently and failures are recorded per-panel,
   * so a slow or failing endpoint degrades one card instead of blanking the
   * whole dashboard. A single failed `Promise.all` would leave every number
   * as "—" with no way to tell it apart from "no data yet".
   */
  const loadAll = useCallback(async () => {
    const [s, t, e] = await Promise.allSettled([
      getStats(),
      getTraffic(60),
      getEvents({ limit: 15 }),
    ])

    const failures = []
    if (s.status === 'fulfilled') setStats(s.value.data)
    else failures.push('stats')
    if (t.status === 'fulfilled') {
      setTraffic(t.value.data.map((p) => ({ time: new Date(p.bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), count: p.request_count })))
    } else failures.push('traffic')
    if (e.status === 'fulfilled') setLiveEvents(e.value.data)
    else failures.push('events')

    // Only surface an error if *nothing* came back; partial data with a
    // warning is more useful than an error page.
    if (failures.length === 3) setError('Could not reach the security API.')
    else setError(null)

    setLastLoadedAt(Date.now())
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // Polling fallback fires pollTick whenever the socket isn't carrying the
  // feed; this is what keeps the dashboard alive with no WebSocket at all.
  useEffect(() => { if (pollTick > 0) loadAll() }, [pollTick, loadAll])

  // Live socket: push the event straight into the feed for instant feedback,
  // and coalesce the (relatively expensive) stats refetch behind it.
  useEffect(() => subscribe((msg) => {
    if (msg.type === 'security_event') {
      setLiveEvents((prev) => [msg.data, ...prev].slice(0, 30))

      const now = Date.now()
      const since = now - lastRefetchRef.current
      if (since >= REFETCH_COALESCE_MS) {
        lastRefetchRef.current = now
        loadAll()
      } else if (!pendingRefetchRef.current) {
        pendingRefetchRef.current = setTimeout(() => {
          pendingRefetchRef.current = null
          lastRefetchRef.current = Date.now()
          loadAll()
        }, REFETCH_COALESCE_MS - since)
      }
    }
  }), [subscribe, loadAll])

  useEffect(() => () => {
    if (pendingRefetchRef.current) clearTimeout(pendingRefetchRef.current)
  }, [])

  const attackData = stats
    ? Object.entries(stats.events_by_attack_type).map(([k, v]) => ({ name: k.replaceAll('_', ' ').toLowerCase(), count: v }))
    : []
  const severityData = stats
    ? Object.entries(stats.events_by_severity).map(([k, v]) => ({ name: k, count: v, fill: SEVERITY_COLORS[k] }))
    : []

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <SectionHeader
        title="Security Operations"
        subtitle="Live detection across ShopFlow — every request scored as it happens"
        actions={        <ConnectionStatus status={status} lastLoadedAt={lastLoadedAt} />}
      />

      {error && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-severity-critical/30 bg-severity-critical/8 px-4 py-3">
          <span className="flex items-center gap-2.5 text-xs text-severity-critical">
            <Icon name="warn" size={15} />
            {error}
          </span>
          <button onClick={loadAll} className="btn btn-danger btn-sm shrink-0">
            <Icon name="refresh" size={12} />Retry
          </button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats === null ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-12 mt-3" /></div>
          ))
        ) : (
          <>
            <StatCard label="Total Requests" value={stats.total_requests ?? 0} tone="info" icon="globe" />
            <StatCard label="Active Users (24h)" value={stats.active_users ?? 0} tone="neutral" icon="users" />
            <StatCard label="Security Events" value={stats.total_security_events ?? 0} tone="warn" icon="events" />
            <StatCard label="Critical Threats" value={stats.critical_threats ?? 0} tone="critical" icon="shield" />
          </>
        )}
      </div>

      <div className="mb-5">
        <TopThreats />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card min-w-0 lg:col-span-2">
          <div className="card-header">
            <div>
              <h2 className="card-title flex items-center gap-2">
                <Icon name="activity" size={14} className="text-accent" />
                Live Traffic
              </h2>
              <p className="card-subtitle">Requests per minute, last 60 minutes</p>
            </div>
          </div>
          {traffic.length === 0 ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={traffic} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="time" tick={AXIS} minTickGap={30} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP} />
                <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={false} fill="url(#trafficFill)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card min-w-0">
          <div className="card-header">
            <div>
              <h2 className="card-title flex items-center gap-2">
                <Icon name="shield" size={14} className="text-accent" />
                Severity Mix
              </h2>
              <p className="card-subtitle">All recorded events</p>
            </div>
          </div>
          {severityData.length === 0 ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={severityData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={AXIS} width={66} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                  {severityData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card min-w-0">
          <div className="card-header">
            <div>
              <h2 className="card-title flex items-center gap-2">
                <Icon name="bolt" size={14} className="text-accent" />
                Attack Types
              </h2>
              <p className="card-subtitle">Detections by category</p>
            </div>
          </div>
          {attackData.length === 0 ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attackData} margin={{ top: 4, right: 8, left: -20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ ...AXIS, fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={56} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card min-w-0 lg:col-span-2">
          <div className="card-header">
            <div>
              <h2 className="card-title flex items-center gap-2">
                <Icon name="inbox" size={14} className="text-accent" />
                Live Security Events
              </h2>
              <p className="card-subtitle">Newest first · streaming over WebSocket</p>
            </div>
            <Link to="/security/events" className="link text-2xs font-semibold flex items-center gap-1">
              All <Icon name="chevron" size={11} />
            </Link>
          </div>
          <div className="-mx-2 max-h-[420px] space-y-0.5 overflow-y-auto px-2">
            {liveEvents.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-500">
                {error ? 'Feed unavailable.' : 'No events yet — generate some suspicious traffic from ShopFlow.'}
              </p>
            ) : (
              liveEvents.map((ev) => <EventFeedItem key={ev.id} event={ev} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
