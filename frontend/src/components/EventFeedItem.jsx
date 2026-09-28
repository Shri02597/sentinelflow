import { Link } from 'react-router-dom'
import Badge from './Badge.jsx'
import Icon from './Icon.jsx'

export default function EventFeedItem({ event }) {
  const ip = event.source_ip
  return (
    <Link
      to={`/security/events/${event.id}`}
      className="group relative block px-4 py-3.5 rounded-lg border border-transparent transition duration-200 ease-spring hover:border-line hover:bg-bg-panel2"
    >
      <span
        className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition duration-200 ${
          event.severity === 'CRITICAL' ? 'bg-severity-critical' : 'bg-severity-high/60 opacity-0 group-hover:opacity-100'
        }`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon name="bolt" size={13} className="shrink-0 text-slate-500" />
            <span className="text-sm font-semibold text-slate-100 truncate">
              {String(event.attack_type ?? '').replaceAll('_', ' ').toLowerCase()}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400 line-clamp-2">{event.description}</p>
        </div>
        <Badge level={event.severity} className="shrink-0" />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs text-slate-500">
        <span>{ip}</span>
        <span className="text-slate-700">/</span>
        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
        <span className="text-slate-700">/</span>
        <span className={event.risk_score >= 80 ? 'text-severity-critical' : event.risk_score >= 60 ? 'text-severity-high' : ''}>
          risk {event.risk_score}
        </span>
      </div>
    </Link>
  )
}
