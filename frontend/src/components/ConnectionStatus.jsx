import { useEffect, useState } from 'react'
import { useLiveFeed } from '../context/LiveFeedContext.jsx'

const STYLES = {
  live: { dot: 'bg-green-400', text: 'text-green-400', label: 'Live' },
  connecting: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400', label: 'Connecting' },
  reconnecting: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400', label: 'Reconnecting — polling' },
  offline: { dot: 'bg-red-400', text: 'text-red-400', label: 'Offline' },
  'auth-failed': { dot: 'bg-red-400', text: 'text-red-400', label: 'Session expired' },
}

/** "3m ago" style freshness for the last successful update. */
function useAge(timestamp) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [])
  if (!timestamp) return null
  const secs = Math.round((Date.now() - timestamp) / 1000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`
}

/**
 * Connection indicator for the console.
 *
 * The important part is that "degraded" is a first-class, labelled state: when
 * the socket is down the dashboard is still being refreshed over REST, and the
 * analyst should be able to tell that apart from a genuinely dead feed rather
 * than wondering whether the numbers are frozen.
 */
export default function ConnectionStatus({ lastLoadedAt, className = '' }) {
  const { status } = useLiveFeed()
  const style = STYLES[status] || STYLES.connecting
  const age = useAge(lastLoadedAt)
  const degraded = status !== 'live'

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`} title={`Feed status: ${status}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
      <span className={style.text}>{style.label}</span>
      {degraded && age && <span className="text-slate-500">· data from {age}</span>}
    </div>
  )
}
