import Icon from './Icon.jsx'

/**
 * Status vocabulary comes from useSecurityWebSocket, which emits exactly:
 *   'connecting' | 'live' | 'reconnecting' | 'offline' | 'auth-failed'
 * Anything unrecognised degrades to 'connecting' rather than claiming health.
 */
const STATES = {
  live: { label: 'Live', tone: 'text-severity-low', dot: 'bg-severity-low', ring: 'border-severity-low/25 bg-severity-low/10' },
  connecting: { label: 'Connecting', tone: 'text-severity-medium', dot: 'bg-severity-medium', ring: 'border-severity-medium/25 bg-severity-medium/10' },
  reconnecting: { label: 'Reconnecting', tone: 'text-severity-medium', dot: 'bg-severity-medium', ring: 'border-severity-medium/25 bg-severity-medium/10' },
  offline: { label: 'Offline', tone: 'text-severity-critical', dot: 'bg-severity-critical', ring: 'border-severity-critical/25 bg-severity-critical/10' },
  'auth-failed': { label: 'Session expired', tone: 'text-severity-critical', dot: 'bg-severity-critical', ring: 'border-severity-critical/25 bg-severity-critical/10' },
  // ShopFlow users never open a socket — LiveFeedProvider hands them IDLE_VALUE.
  idle: { label: 'Idle', tone: 'text-slate-400', dot: 'bg-slate-500', ring: 'border-line bg-bg-raised' },
}

function timeAgo(ts) {
  if (!ts) return null
  const secs = Math.round((Date.now() - ts) / 1000)
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}

export default function ConnectionStatus({ status = 'connecting', lastLoadedAt, className = '' }) {
  const s = STATES[status] ?? STATES.connecting
  const healthy = status === 'live'
  const since = timeAgo(lastLoadedAt)

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${s.ring} ${className}`}
      title={since ? `Last data refresh: ${since}` : undefined}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {healthy && <span className={`absolute inset-0 rounded-full ${s.dot} animate-ping opacity-70`} />}
          <span className={`relative h-1.5 w-1.5 rounded-full ${s.dot}`} />
        </span>
        <span className={`truncate text-2xs font-semibold uppercase tracking-wider ${s.tone}`}>
          {s.label}
        </span>
        {since && <span className="shrink-0 font-mono text-2xs text-slate-600">{since}</span>}
      </span>
      <Icon name="wifi" size={13} className={`shrink-0 ${s.tone}`} />
    </div>
  )
}
