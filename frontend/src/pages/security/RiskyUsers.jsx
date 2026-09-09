import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRiskyUsers } from '../../services/api.js'
import Badge from '../../components/Badge.jsx'

export default function RiskyUsers() {
  const [rows, setRows] = useState([])

  useEffect(() => { getRiskyUsers().then((res) => setRows(res.data)) }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Top Risky Users / IPs</h1>
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
