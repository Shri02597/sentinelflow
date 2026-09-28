import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRiskyUsers } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'
import Badge from '../../components/Badge.jsx'
import ErrorState from '../../components/ErrorState.jsx'

export default function RiskyUsers() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const { subscribe, pollTick } = useLiveFeed()

  const load = useCallback(async () => {
    try {
      const res = await getRiskyUsers()
      setRows(res.data)
      setError(null)
    } catch {
      setError('Could not load risk data.')
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (pollTick > 0) load() }, [pollTick, load])
  useEffect(() => subscribe((msg) => {
    if (msg.type === 'risk_update' || msg.type === 'security_event') load()
  }), [subscribe, load])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Top Risky Users / IPs</h1>
      {error && <ErrorState message={error} onRetry={load} className="mb-4" />}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-slate-400 text-left border-b border-slate-800">
            <tr>
              <th className="py-2 pr-4">User / IP</th>
              <th className="py-2 pr-4">Risk Score</th>
              <th className="py-2 pr-4">Risk Level</th>
              <th className="py-2 pr-4">Threat Count</th>
              <th className="py-2 pr-4">Latest Event</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-800/50">
                <td className="py-2 pr-4">
                  {r.user_id ? (
                    <Link to={`/security/users/${r.user_id}/risk`} className="text-accent hover:underline">
                      user #{r.user_id}
                    </Link>
                  ) : (
                    r.source_ip
                  )}
                </td>
                <td className="py-2 pr-4 font-semibold">{r.risk_score}</td>
                <td className="py-2 pr-4"><Badge level={r.risk_level} /></td>
                <td className="py-2 pr-4">{r.threat_count}</td>
                <td className="py-2 pr-4 text-slate-400">
                  {r.latest_event ? new Date(r.latest_event).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-slate-500 text-center">No risk data yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
