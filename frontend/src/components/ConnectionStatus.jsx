import Icon from './Icon.jsx'

const STATES = {
  connected: { label: 'Live', tone: 'text-severity-low', dot: 'bg-severity-low', ring: 'border-severity-low/25 bg-severity-low/10' },
  connecting: { label: 'Connecting', tone: 'text-severity-medium', dot: 'bg-severity-medium', ring: 'border-severity-medium/25 bg-severity-medium/10' },
  polling: { label: 'Polling', tone: 'text-severity-medium', dot: 'bg-severity-medium', ring: 'border-severity-medium/25 bg-severity-medium/10' },
  offline: { label: 'Offline', tone: 'text-severity-critical', dot: 'bg-severity-critical', ring: 'border-severity-critical/25 bg-severity-critical/10' },
}

export default function ConnectionStatus({ status = 'connecting', className = '' }) {
  const s = STATES[status] ?? STATES.connecting
  const live = status === 'connected'
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${s.ring} ${className}`}>
      <span className="flex items-center gap-2 min-w-0">
        <span className="relative shrink-0 flex h-1.5 w-1.5">
          {live && <span className={`absolute inset-0 rounded-full ${s.dot} animate-ping opacity-70`} />}
          <span className={`relative h-1.5 w-1.5 rounded-full ${s.dot}`} />
        </span>
        <span className={`text-2xs font-semibold uppercase tracking-wider ${s.tone} truncate`}>{s.label}</span>
      </span>
      <Icon name="wifi" size={13} className={s.tone} />
    </div>
  )
}
