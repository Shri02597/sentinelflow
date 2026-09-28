import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getStats, getTraffic, getEvents } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'
import ConnectionStatus from '../../components/ConnectionStatus.jsx'
import StatCard from '../../components/StatCard.jsx'
import EventFeedItem from '../../components/EventFeedItem.jsx'
import TopThreats from './TopThreats.jsx'

const SEVERITY_COLORS = { LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', CRITICAL: '#ef4444' }

/** Coalesce refetches so a burst of detections can't cause a request storm. */
const REFETCH_COALESCE_MS = 2000

export default function SecurityDashboard() {
  const [stats, setStats] = useState(null)
  const [traffic, setTraffic] = useState([])
  const [liveEvents, setLiveEvents] = useState([])
  const [error, setError] = useState(null)
  const [lastLoadedAt, setLastLoadedAt] = useState(null)

  const { subscribe, pollTick } = useLiveFeed()
  const lastRefetchRef = useRef(0)
  const pendingRefetchRef = useRef(null)

  /**
   * Each panel is fetched independently and failures are recorded per-panel,
   * so a slow or failing endpoint degrades one card instead of blanking the
   * whole dashboard. Previously a single failed `Promise.all` left every
   * number as "—" with no way to tell it apart from "no data yet".
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
      setTraffic(t.value.data.map((p) => ({ time: new Date(p.bucket).toLocaleTimeString(), count: p.request_count })))
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
    ? Object.entries(stats.events_by_attack_type).map(([k, v]) => ({ name: k.replaceAll('_', ' '), count: v }))
    : []
  const severityData = stats
    ? Object.entries(stats.events_by_severity).map(([k, v]) => ({ name: k, count: v, fill: SEVERITY_COLORS[k] }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Security Dashboard</h1>
        <ConnectionStatus lastLoadedAt={lastLoadedAt} />
      </div>

      {error && (
        <div className="card border-red-900/60 bg-red-950/30 flex items-center justify-between text-sm">
          <span className="text-red-300">{error}</span>
          <button
            onClick={loadAll}
            className="px-3 py-1 rounded-lg border border-red-800 text-red-300 hover:bg-red-900/40"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={stats?.total_requests ?? '—'} />
        <StatCard label="Active Users (24h)" value={stats?.active_users ?? '—'} />
        <StatCard label="Security Events" value={stats?.total_security_events ?? '—'} tone="accent" />
        <StatCard label="Critical Threats" value={stats?.critical_threats ?? '—'} tone="critical" />
      </div>

      <TopThreats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3 text-sm text-slate-300">Live Traffic (last 60 min)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={traffic}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} minTickGap={30} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#161e2e', border: '1px solid #334155' }} />
              <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3 text-sm text-slate-300">Threat Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attackData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#161e2e', border: '1px solid #334155' }} />
              <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-1">
          <h3 className="font-semibold mb-3 text-sm text-slate-300">Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={severityData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={70} />
              <Tooltip contentStyle={{ background: '#161e2e', border: '1px solid #334155' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card lg:col-span-2">
          <h3 className="font-semibold mb-3 text-sm text-slate-300">Live Security Events</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {liveEvents.length === 0 && (
              <p className="text-sm text-slate-500">
                {error ? 'Feed unavailable.' : 'No events yet.'}
              </p>
            )}
            {liveEvents.map((ev) => <EventFeedItem key={ev.id} event={ev} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
