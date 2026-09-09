import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getStats, getTraffic, getEvents } from '../../services/api.js'
import { useSecurityWebSocket } from '../../hooks/useSecurityWebSocket.js'
import StatCard from '../../components/StatCard.jsx'
import EventFeedItem from '../../components/EventFeedItem.jsx'

const SEVERITY_COLORS = { LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', CRITICAL: '#ef4444' }

export default function SecurityDashboard() {
  const [stats, setStats] = useState(null)
  const [traffic, setTraffic] = useState([])
  const [liveEvents, setLiveEvents] = useState([])
  const [wsStatus, setWsStatus] = useState('connecting')

  const loadAll = useCallback(async () => {
    const [s, t, e] = await Promise.all([getStats(), getTraffic(60), getEvents({ limit: 15 })])
    setStats(s.data)
    setTraffic(t.data.map((p) => ({ time: new Date(p.bucket).toLocaleTimeString(), count: p.request_count })))
    setLiveEvents(e.data)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const { connected } = useSecurityWebSocket((msg) => {
    if (msg.type === 'security_event') {
      setLiveEvents((prev) => [msg.data, ...prev].slice(0, 30))
      // Stats/charts are cheap to refetch and keeps numbers exactly consistent
      // with the backend rather than hand-rolling incremental updates.
      loadAll()
    }
  })

  useEffect(() => { setWsStatus(connected ? 'live' : 'reconnecting…') }, [connected])

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
        <span className={`text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
          ● {wsStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={stats?.total_requests ?? '—'} />
        <StatCard label="Active Users (24h)" value={stats?.active_users ?? '—'} />
        <StatCard label="Security Events" value={stats?.total_security_events ?? '—'} tone="accent" />
        <StatCard label="Critical Threats" value={stats?.critical_threats ?? '—'} tone="critical" />
      </div>

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
            {liveEvents.length === 0 && <p className="text-sm text-slate-500">No events yet.</p>}
            {liveEvents.map((ev) => <EventFeedItem key={ev.id} event={ev} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
