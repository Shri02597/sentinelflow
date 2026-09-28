import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserRisk, getUserActivity, getUserStats, getEvents } from '../../services/api.js'
import Badge from '../../components/Badge.jsx'
import EventFeedItem from '../../components/EventFeedItem.jsx'
import { SectionHeader, Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

export default function UserRiskProfile() {
  const { userId } = useParams()
  const [risk, setRisk] = useState(null)
  const [activity, setActivity] = useState([])
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserRisk(userId).then((res) => setRisk(res.data)).catch(() => setError('No risk profile recorded for this user yet.'))
    getUserActivity(userId).then((res) => setActivity(res.data))
    getUserStats(userId).then((res) => setStats(res.data))
    getEvents({ user_id: userId, limit: 10 }).then((res) => setEvents(res.data))
      .finally(() => setLoading(false))
  }, [userId])

  const reasons = risk?.reasons ? JSON.parse(risk.reasons) : []
  const topEndpoints = stats
    ? Object.entries(stats.endpoints_accessed).sort((a, b) => b[1] - a[1]).slice(0, 8)
    : []
  const maxEndpoint = topEndpoints[0]?.[1] || 1

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <SectionHeader title="User Risk Profile" subtitle={`Account #${userId} — accumulated risk across every detector`} />

      {error && <p className="mb-5 text-sm text-slate-500">{error}</p>}

      {loading && <div className="space-y-4"><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-40 w-full rounded-xl" /></div>}

      {risk && (
        <div className="card mb-5">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="shield" size={14} className="text-accent" />
              Current Risk
            </h2>
            <Badge level={risk.level} />
          </div>
          <div className="flex items-end gap-4">
            <div className="text-4xl font-bold tracking-tight tabular-nums text-slate-50">
              {risk.score}
              <span className="text-lg text-slate-600">/100</span>
            </div>
            <div className="flex-1 pb-2">
              <div className="h-1.5 rounded-full bg-bg-raised overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-spring ${
                    risk.score >= 80 ? 'bg-severity-critical' : risk.score >= 60 ? 'bg-severity-high' : risk.score >= 40 ? 'bg-severity-medium' : 'bg-slate-500'
                  }`}
                  style={{ width: `${Math.min(risk.score, 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-2xs text-slate-600">
                <span>0</span><span>warn 60</span><span>block 80</span><span>100</span>
              </div>
            </div>
          </div>
          {reasons.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-2xs font-semibold uppercase tracking-wider text-slate-500">Contributing reasons</h3>
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <Icon name="chevron" size={11} className="mt-0.5 shrink-0 text-accent" />
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {stats && (
        <div className="card mb-5">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="activity" size={14} className="text-accent" />
              Activity Summary
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total requests', value: stats.total_requests, tone: 'text-slate-50' },
              { label: 'Failed logins', value: stats.failed_login_count, tone: 'text-severity-critical' },
              { label: 'Requests / min', value: stats.request_rate_per_min ?? '—', tone: 'text-slate-50' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-line bg-bg-sunken/50 p-3">
                <div className={`text-xl font-bold tabular-nums ${s.tone}`}>{s.value}</div>
                <div className="mt-0.5 text-2xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {topEndpoints.length > 0 && (
            <>
              <h3 className="mb-2.5 mt-5 text-2xs font-semibold uppercase tracking-wider text-slate-500">Top endpoints accessed</h3>
              <div className="space-y-2">
                {topEndpoints.map(([endpoint, count]) => (
                  <div key={endpoint} className="flex items-center gap-3">
                    <span className="w-1/2 truncate font-mono text-2xs text-slate-300" title={endpoint}>{endpoint}</span>
                    <div className="h-1 flex-1 rounded-full bg-bg-raised overflow-hidden">
                      <div className="h-full rounded-full bg-accent/60" style={{ width: `${(count / maxEndpoint) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-2xs text-slate-400 tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="card mb-5">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2">
            <Icon name="events" size={14} className="text-accent" />
            Security Events
          </h2>
          <span className="text-2xs text-slate-500">{events.length}</span>
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-slate-500">No security events recorded for this account.</p>
        ) : (
          <div className="space-y-0.5 -mx-2 px-2">
            {events.map((ev) => <EventFeedItem key={ev.id} event={ev} />)}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2">
            <Icon name="bolt" size={14} className="text-accent" />
            Request Timeline
          </h2>
          <span className="text-2xs text-slate-500">{activity.length}</span>
        </div>
        {activity.length === 0 ? (
          <p className="text-xs text-slate-500">No recorded activity.</p>
        ) : (
          <div className="-mx-2 max-h-72 overflow-y-auto">
            <table className="table">
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id}>
                    <td className="w-24 whitespace-nowrap font-mono text-2xs text-slate-500">{new Date(a.timestamp).toLocaleTimeString()}</td>
                    <td className="font-mono text-2xs text-slate-300">
                      <span className="mr-2 text-slate-500">{a.method}</span>{a.endpoint}
                    </td>
                    <td className={`w-14 text-right font-mono text-2xs font-bold ${a.status_code >= 400 ? 'text-severity-critical' : 'text-severity-low'}`}>
                      {a.status_code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
