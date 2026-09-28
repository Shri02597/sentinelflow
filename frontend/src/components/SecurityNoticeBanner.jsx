import { useCallback, useEffect, useState } from 'react'
import { getMyNotifications, markNotificationRead } from '../services/api.js'
import { useLiveFeed } from '../context/LiveFeedContext.jsx'

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
    <div className="max-w-6xl mx-auto px-6 pt-4 space-y-2">
      {visible.map((n) => {
        const blocked = n.title === 'Access blocked'
        return (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
              blocked
                ? 'border-red-300 bg-red-50 text-red-800'
                : 'border-amber-300 bg-amber-50 text-amber-900'
            }`}
          >
            <div>
              <span className="font-semibold">{n.title}.</span>{' '}
              <span>{n.message}</span>
            </div>
            <button
              onClick={() => dismiss(n)}
              className="shrink-0 text-xs underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )
      })}
    </div>
  )
}
