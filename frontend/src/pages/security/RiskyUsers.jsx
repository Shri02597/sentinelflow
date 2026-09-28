import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRiskyUsers } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'
import Badge from '../../components/Badge.jsx'
import ErrorState from '../../components/ErrorState.jsx'
import { SectionHeader, Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

export default function RiskyUsers() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { subscribe, pollTick } = useLiveFeed()

  const load = useCallback(async () => {
    try {
      const res = await getRiskyUsers()
      setRows(res.data)
      setError(null)
    } catch {
      setError('Could not load risk data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (pollTick > 0) load() }, [pollTick, load])
  useEffect(() => subscribe((msg) => {
    if (msg.type === 'risk_update' || msg.type === 'security_event') load()
  }), [subscribe, load])

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <SectionHeader title="Top Risky Users & IPs" subtitle="Ranked by accumulated risk score across all detectors" />

      {error && <ErrorState message={error} onRetry={load} className="mb-5" />}

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No risk data yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>User / IP</th>
                <th>Risk Score</th>
                <th>Level</th>
                <th>Threats</th>
                <th>Latest Event</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.user_id ?? r.source_ip ?? i}>
                  <td className="font-mono text-2xs text-slate-600">{i + 1}</td>
                  <td className="font-mono text-xs text-slate-100">
                    {r.user_id ? (
                      <Link to={`/security/users/${r.user_id}/risk`} className="link">{`user #${r.user_id}`}</Link>
                    ) : (
                      r.source_ip
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-14 rounded-full bg-bg-raised overflow-hidden">
                        <div
                          className={`h-full rounded-full ${r.risk_score >= 80 ? 'bg-severity-critical' : r.risk_score >= 60 ? 'bg-severity-high' : r.risk_score >= 40 ? 'bg-severity-medium' : 'bg-slate-500'}`}
                          style={{ width: `${Math.min(r.risk_score, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-slate-200">{r.risk_score}</span>
                    </div>
                  </td>
                  <td><Badge level={r.risk_level} /></td>
                  <td className="font-mono text-xs text-slate-300">{r.threat_count}</td>
                  <td className="font-mono text-2xs text-slate-500 whitespace-nowrap">
                    {r.latest_event ? new Date(r.latest_event).toLocaleString() : '—'}
                  </td>
                  <td>
                    {r.user_id && (
                      <Link to={`/security/users/${r.user_id}/risk`} className="btn btn-ghost btn-sm text-2xs">
                        <Icon name="eye" size={12} />Profile
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
