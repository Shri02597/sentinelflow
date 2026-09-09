import Badge from './Badge.jsx'
import { Link } from 'react-router-dom'

export default function EventFeedItem({ event }) {
  return (
    <Link to={`/security/events/${event.id}`} className="block card hover:border-accent transition">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm">🚨 {event.attack_type?.replaceAll('_', ' ')}</span>
        <Badge level={event.severity} />
      </div>
      <div className="text-xs text-slate-400">{event.description}</div>
      <div className="text-xs text-slate-500 mt-1">
        {event.source_ip} · {new Date(event.timestamp).toLocaleTimeString()} · risk {event.risk_score}
      </div>
    </Link>
  )
}
