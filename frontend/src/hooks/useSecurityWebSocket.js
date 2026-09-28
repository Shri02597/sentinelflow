import { useEffect, useRef, useState, useCallback } from 'react'
import { useOnlineStatus } from './useConnectivity.js'

const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? 'wss://sentinelflow-api-g7p8.onrender.com' : 'ws://localhost:8000')

const BASE_RETRY_MS = 1000
const MAX_RETRY_MS = 30000
/** Close codes the server uses to say "stop trying", not "try again later". */
const FATAL_CLOSE_CODES = new Set([4401, 4403])

/**
 * Live feed over WebSocket, built to survive a bad network.
 *
 * A WebSocket is the fast path, not the only path — everything it pushes is
 * also available over REST, so a dropped socket degrades the feed to polling
 * (see usePollingFallback) instead of blanking the dashboard. This hook's job
 * is to (a) get back online as fast as possible and (b) never spin.
 *
 * Failure modes handled explicitly:
 *  - No network at all      -> stop retrying, wait for the `online` event.
 *  - Server/proxy refuses   -> exponential backoff with jitter, so a fleet of
 *                              dashboards doesn't reconnect in lockstep and
 *                              knock the backend over on the same tick.
 *  - Token rejected (4401)  -> stop. Retrying an auth failure forever is a
 *  - Token lacks role (4403)   self-inflicted denial of service on the API.
 *                              The axios interceptor clears the session on the
 *                              next 401, which bounces the analyst to /login.
 */
export function useSecurityWebSocket(onMessage) {
  const [status, setStatus] = useState('connecting')
  const [lastMessageAt, setLastMessageAt] = useState(null)

  const wsRef = useRef(null)
  const retryRef = useRef(BASE_RETRY_MS)
  const timerRef = useRef(null)
  const handlerRef = useRef(onMessage)
  const mountedRef = useRef(true)
  const online = useOnlineStatus()
  // Read through a ref so the connect callback (and therefore the effect that
  // owns the socket's lifetime) never needs `online` as a dependency.
  const onlineRef = useRef(online)
  onlineRef.current = online

  handlerRef.current = onMessage

  const clearRetry = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    clearRetry()
    // Jitter +/-25% so N dashboards reconnect spread out instead of stampeding.
    const jitter = retryRef.current * 0.25 * (Math.random() * 2 - 1)
    const delay = Math.min(Math.round(retryRef.current + jitter), MAX_RETRY_MS)
    retryRef.current = Math.min(retryRef.current * 2, MAX_RETRY_MS)
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) connectRef.current?.()
    }, delay)
  }, [clearRetry])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (!onlineRef.current) {
      // Don't burn retries against a network we already know is down.
      setStatus('offline')
      return
    }
    const token = localStorage.getItem('sf_access_token')
    if (!token) {
      setStatus('auth-failed')
      return
    }

    setStatus((prev) => (prev === 'live' ? 'connecting' : prev))

    let ws
    try {
      ws = new WebSocket(`${WS_URL}/ws/security?token=${encodeURIComponent(token)}`)
    } catch {
      scheduleReconnect()
      return
    }
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close()
        return
      }
      retryRef.current = BASE_RETRY_MS
      setStatus('live')
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        setLastMessageAt(Date.now())
        handlerRef.current?.(msg)
      } catch {
        // A malformed frame is not worth tearing the connection down for.
      }
    }

    ws.onclose = (e) => {
      wsRef.current = null
      if (!mountedRef.current) return

      if (FATAL_CLOSE_CODES.has(e.code)) {
        setStatus('auth-failed')
        return
      }
      setStatus(onlineRef.current ? 'reconnecting' : 'offline')
      if (onlineRef.current) scheduleReconnect()
    }

    ws.onerror = () => {
      // onclose always follows; let it own the retry decision so we never
      // schedule two reconnects for one failure.
      ws.close()
    }
  }, [scheduleReconnect])

  const connectRef = useRef(connect)
  connectRef.current = connect

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearRetry()
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [clearRetry])

  // Suspend while offline; the moment the link returns, try again immediately
  // rather than waiting out whatever backoff we'd accumulated.
  useEffect(() => {
    if (!online) {
      clearRetry()
      wsRef.current?.close()
      wsRef.current = null
      setStatus('offline')
      return
    }
    if (mountedRef.current) {
      retryRef.current = BASE_RETRY_MS
      setStatus('connecting')
      connectRef.current?.()
    }
  }, [online, clearRetry])

  return { status, lastMessageAt, isLive: status === 'live' }
}
