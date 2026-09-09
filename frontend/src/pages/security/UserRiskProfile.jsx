import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserRisk, getUserActivity, getUserStats, getEvents } from '../../services/api.js'
import Badge from '../../components/Badge.jsx'
import EventFeedItem from '../../components/EventFeedItem.jsx'

export default function UserRiskProfile() {
  const { userId } = useParams()
  const [risk, setRisk] = useState(null)
  const [activity, setActivity] = useState([])
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getUserRisk(userId).then((res) => setRisk(res.data)).catch(() => setError('No risk profile recorded for this user yet.'))
    getUserActivity(userId).then((res) => setActivity(res.data))
    getUserStats(userId).then((res) => setStats(res.data))
    getEvents({ user_id: userId, limit: 10 }).then((res) => setEvents(res.data))
  }, [userId])

  const reasons = risk?.reasons ? JSON.parse(risk.reasons) : []
  const topEndpoints = stats
    ? Object.entries(stats.endpoints_accessed).sort((a, b) => b[1] - a[1]).slice(0, 8)
    : []

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">User Risk Profile</h1>

      {error && <p className="text-slate-500 text-sm">{error}</p>}

      {risk && (
        <div className="card">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl font-bold">{risk.score}<span className="text-lg text-slate-500">/100</span></div>
            <Badge level={risk.level} />
          </div>
          <h3 className="font-semibold text-sm text-slate-300 mb-1">Reasons</h3>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {stats && (
        <div className="card">
          <h3 className="font-semibold text-sm text-slate-300 mb-3">Activity Summary</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold">{stats.total_requests}</div>
              <div className="text-xs text-slate-500">Total Requests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{stats.failed_login_count}</div>
              <div className="text-xs text-slate-500">Failed Logins</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.request_rate_per_min ?? '—'}</div>
              <div className="text-xs text-slate-500">Requests / min</div>
            </div>
          </div>
          <h4 className="text-xs font-semibold text-slate-400 mb-1">Top Endpoints Accessed</h4>
          <div className="space-y-1 text-xs">
            {topEndpoints.map(([endpoint, count]) => (
              <div key={endpoint} className="flex justify-between border-b border-slate-800 py-1">
                <span className="text-slate-300">{endpoint}</span>
                <span className="text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-sm text-slate-300 mb-2">Security Events for this User</h3>
        <div className="space-y-2">
          {events.length === 0 && <p className="text-slate-500 text-sm">No security events recorded.</p>}
          {events.map((ev) => <EventFeedItem key={ev.id} event={ev} />)}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-sm text-slate-300 mb-2">Timeline</h3>
        <div className="space-y-1 max-h-80 overflow-y-auto text-xs">
          {activity.map((a) => (
            <div key={a.id} className="flex justify-between border-b border-slate-800 py-1">
              <span>{new Date(a.timestamp).toLocaleTimeString()} — {a.method} {a.endpoint}</span>
              <span className={a.status_code >= 400 ? 'text-red-400' : 'text-green-400'}>{a.status_code}</span>
            </div>
          ))}
          {activity.length === 0 && <p className="text-slate-500">No recorded activity.</p>}
        </div>
      </div>
    </div>
  )
}
