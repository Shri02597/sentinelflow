import { useEffect, useState } from 'react'
import { getMyActivity } from '../../services/api.js'

export default function ActivityHistory() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    getMyActivity().then((res) => setLogs(res.data))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Your Activity</h1>
      <div className="space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex justify-between">
            <span>{log.method} {log.endpoint}</span>
            <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
            <span className={log.status_code >= 400 ? 'text-red-500' : 'text-green-600'}>{log.status_code}</span>
          </div>
        ))}
        {logs.length === 0 && <p className="text-slate-500 text-sm">No recorded activity yet.</p>}
      </div>
    </div>
  )
}
