import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

/**
 * Connects to /ws/security with the current access token and calls
 * onMessage for every parsed frame. Auto-reconnects with backoff if the
 * connection drops (e.g. token expiry, network blip).
 */
export function useSecurityWebSocket(onMessage) {
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const retryRef = useRef(1000)
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  const connect = useCallback(() => {
    const token = localStorage.getItem('sf_access_token')
    if (!token) return

    const ws = new WebSocket(`${WS_URL}/ws/security?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      retryRef.current = 1000
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handlerRef.current?.(msg)
      } catch {
        // ignore malformed frames
      }
    }
    ws.onclose = () => {
      setConnected(false)
      setTimeout(connect, retryRef.current)
      retryRef.current = Math.min(retryRef.current * 2, 15000)
    }
    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])

  return { connected }
}
