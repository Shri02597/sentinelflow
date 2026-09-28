import { useEffect, useRef } from 'react'
import { useOnlineStatus, useDocumentVisible } from './useConnectivity.js'

/**
 * REST polling fallback for when the WebSocket isn't available.
 *
 * The socket is an optimisation, not a dependency: every frame it pushes is
 * also served by the REST endpoints. When the socket is down — no network, a
 * proxy that strips Upgrade headers, a backend that scaled to zero — this
 * keeps the dashboard updating over plain HTTP instead of freezing on whatever
 * it last received.
 *
 * Intervals are deliberately asymmetric:
 *   live socket        -> no polling at all (saves the analyst's bandwidth)
 *   degraded, visible  -> FAST_MS
 *   degraded, hidden   -> SLOW_MS (nobody is looking at a background tab)
 *   offline            -> paused entirely, resumed by the `online` event
 */
export function usePollingFallback({ isLive, onPoll, fastMs = 15000, slowMs = 60000 }) {
  const online = useOnlineStatus()
  const visible = useDocumentVisible()

  const onPollRef = useRef(onPoll)
  onPollRef.current = onPoll

  const interval = isLive ? null : visible ? fastMs : slowMs

  useEffect(() => {
    if (interval === null || !online) return

    const tick = async () => {
      try {
        await onPollRef.current?.()
      } catch {
        // A failed poll is expected on a flaky link; the next tick retries.
      }
    }

    // Poll immediately on becoming degraded rather than showing socket-era data
    // for a whole interval after the socket drops.
    tick()
    const id = setInterval(tick, interval)
    return () => clearInterval(id)
  }, [interval, online])
}
