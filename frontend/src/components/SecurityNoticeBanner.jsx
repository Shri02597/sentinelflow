import { useCallback, useEffect, useState } from 'react'
import { getMyNotifications, markNotificationRead } from '../services/api.js'
import { useLiveFeed } from '../context/LiveFeedContext.jsx'
import Icon from './Icon.jsx'

/**
 * The subject's view of a warning or block.
 *
 * Closes the loop on the response feature: the platform now acts on an account
 * (warns it, or cuts its traffic), so the account has to be able to find out
 * why. Poll-driven rather than WebSocket-driven, because ShopFlow deliberately
 * has no analyst socket, and a warning banner is not worth a persistent
 * connection on a metered link.
 */
export default function SecurityNoticeBanner() {
  const [notices, setNotices] = useState([])
  const [dismissed, setDismissed] = useState(() => new Set())
  const { subscribe } = useLiveFeed()

  const load = useCallback(async () => {
    try {
      const res = await getMyNotifications(false)
      setNotices(res.data.filter((n) => !n.read_at))
    } catch {
      // Offline or blocked — the banner simply doesn't appear. Not worth
      // alarming the shopper about a failed poll.
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Re-check shortly after a containment action so a warning raised by the
  // auto-response policy shows up without a manual reload.
  useEffect(() => subscribe((msg) => {
    if (msg.type === 'response_action') setTimeout(load, 500)
  }), [subscribe, load])

  // Slow background refresh, paused while the tab is hidden.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'hidden') load()
    }, 60000)
    return () => clearInterval(id)
  }, [load])

  const visible = notices.filter((n) => !dismissed.has(n.id))
  if (visible.length === 0) return null

  async function dismiss(n) {
    setDismissed((prev) => new Set(prev).add(n.id))
    try {
      await markNotificationRead(n.id)
    } catch {
      // Non-fatal: the notice is already hidden for this session.
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pt-4 space-y-2">
      {visible.map((n) => {
        const blocked = n.title === 'Access blocked'
        return (
          <div
            key={n.id}
            role="status"
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              blocked
                ? 'border-severity-critical/35 bg-severity-critical/8 text-ink'
                : 'border-severity-medium/35 bg-severity-medium/8 text-ink'
            }`}
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
              blocked ? 'bg-severity-critical/12 text-severity-critical' : 'bg-severity-medium/12 text-severity-medium'
            }`}>
              {blocked ? <Icon name="block" size={14} /> : <Icon name="warn" size={14} />}
            </span>
            <div className="min-w-0 flex-1 text-sm leading-relaxed">
              <span className="font-bold">{n.title}.</span>{' '}
              <span className="text-ink-soft">{n.message}</span>
            </div>
            <button
              onClick={() => dismiss(n)}
              className="shrink-0 rounded-lg p-1.5 text-ink-faint transition hover:bg-black/5 hover:text-ink"
              aria-label={`Dismiss: ${n.title}`}
              title="Dismiss"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
