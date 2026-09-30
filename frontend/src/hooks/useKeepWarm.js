import { useEffect } from 'react'
import { useDocumentVisible } from './useConnectivity.js'

/**
 * Keeps the backend awake so the first authentication request doesn't pay for
 * a cold start.
 *
 * The free hosting tier shuts the API down after ~15 minutes of inactivity, and
 * the first request afterwards has to wait for the container to boot — around
 * 45 seconds, measured. That delay would otherwise land exactly on the click
 * that matters most: submitting the login form. Pinging the health endpoint
 * every few minutes means the instance is already running by the time the user
 * finishes typing their email and password.
 *
 * Fire-and-forget by design:
 *  - bare `fetch`, not axios, so this never inherits the API's auth header,
 *    retry interceptor, or 401 session-clearing. A keep-warm ping has no
 *    business touching the user's session.
 *  - a ping must never surface an error. A failed warm-up is not a user-facing
 *    problem, and an unhandled rejection here would show up in the console as
 *    if the app were broken.
 *  - the browser hides this entirely. It costs one cheap GET every few minutes
 *    per open tab, which is far less traffic than the health checks any
 *    uptime monitor would send anyway.
 */
const PING_INTERVAL_MS = 5 * 60 * 1000

function ping() {
  // Same-origin: the frontend is served from Vercel with an /api rewrite to the
  // backend, so this needs no environment-specific host and no CORS preflight.
  const url = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/health`
    : '/api/health'

  try {
    fetch(url, { method: 'GET', keepalive: true, cache: 'no-store' }).catch(() => {})
  } catch {
    // Ignore. See above — a failed warm-up is not actionable for the user.
  }
}

export function useKeepWarm({ intervalMs = PING_INTERVAL_MS, enabled = true } = {}) {
  const visible = useDocumentVisible()

  useEffect(() => {
    if (!enabled) return

    // Warm immediately on load: this is the one that overlaps with the user
    // filling in the login form, which is where the cold start would
    // otherwise be felt.
    ping()

    const id = setInterval(() => {
      // Don't keep a background tab talking to a free-tier service nobody is
      // looking at; resume as soon as the tab is foregrounded again.
      if (visible) ping()
    }, intervalMs)

    return () => clearInterval(id)
  }, [enabled, intervalMs, visible])
}

export default useKeepWarm
