import { useEffect, useState } from 'react'
import { getMyActivity } from '../../services/api.js'
import { Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

export default function ActivityHistory() {
  const [logs, setLogs] = useState(null)

  useEffect(() => {
    getMyActivity().then((res) => setLogs(res.data))
  }, [])

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Your Activity</h1>
      <p className="mt-1 text-sm text-ink-faint">Every request your account has made, newest first.</p>

      {logs === null ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-50 text-ink-faint">
            <Icon name="activity" size={22} />
          </span>
          <p className="mt-4 text-sm font-semibold text-ink">No recorded activity yet</p>
          <p className="mt-1 text-xs text-ink-faint">Browse the shop and it will show up here.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-ink-faint">When</th>
                <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-ink-faint">Request</th>
                <th className="px-4 py-2.5 text-right text-2xs font-semibold uppercase tracking-wider text-ink-faint">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-2xs text-ink-faint">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-2xs text-ink">
                    <span className="mr-2 text-ink-faint">{log.method}</span>
                    {log.endpoint}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-2.5 text-right font-mono text-2xs font-bold ${log.status_code >= 400 ? 'text-severity-critical' : 'text-severity-low'}`}>
                    {log.status_code}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
