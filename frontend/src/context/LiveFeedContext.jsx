import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSecurityWebSocket } from '../hooks/useSecurityWebSocket.js'
import { usePollingFallback } from '../hooks/usePollingFallback.js'
import { useAuth } from './AuthContext.jsx'

const LiveFeedContext = createContext(null)

const IDLE_VALUE = {
  status: 'idle',
  isLive: false,
  lastMessageAt: null,
  lastEvent: null,
  subscribe: () => () => {},
  triggerPoll: () => {},
  pollTick: 0,
}

/**
 * Owns the single live connection for the app.
 *
 * Previously each page opened its own WebSocket, so navigating the console
 * churned connections and a network blip had to be recovered from
 * independently on every screen. One socket, one status, one polling
 * fallback — shared by every consumer, and reported globally in the sidebar.
 *
 * The socket is only opened for ANALYST/ADMIN. ShopFlow users have no business
 * holding a connection open to the security feed, and the server would reject
 * them with 4403 regardless; `SecurityNoticeBanner` consumes the context for
 * the subscription API but does its own polling.
 */
function ConnectedLiveFeed({ children }) {
  const [lastEvent, setLastEvent] = useState(null)
  const handlersRef = useRef(new Set())

  const subscribe = useCallback((handler) => {
    handlersRef.current.add(handler)
    return () => handlersRef.current.delete(handler)
  }, [])

  const onMessage = useCallback((msg) => {
    for (const handler of handlersRef.current) {
      try {
        handler(msg)
      } catch {
        // One bad subscriber must not stop delivery to the rest.
      }
    }
    if (msg.type === 'security_event' || msg.type === 'response_action') {
      setLastEvent(msg)
    }
  }, [])

  const { status, lastMessageAt, isLive } = useSecurityWebSocket(onMessage)

  // Pages that need to catch up on whatever they missed while the socket was
  // down call this; the polling fallback invokes it automatically.
  const [pollTick, setPollTick] = useState(0)
  const triggerPoll = useCallback(() => setPollTick((n) => n + 1), [])

  usePollingFallback({ isLive, onPoll: triggerPoll })

  const value = useMemo(
    () => ({ status, isLive, lastMessageAt, lastEvent, subscribe, triggerPoll, pollTick }),
    [status, isLive, lastMessageAt, lastEvent, subscribe, triggerPoll, pollTick]
  )

  return <LiveFeedContext.Provider value={value}>{children}</LiveFeedContext.Provider>
}

export function LiveFeedProvider({ children }) {
  const { user } = useAuth()
  const privileged = user?.role === 'ANALYST' || user?.role === 'ADMIN'

  // Swap the whole subtree rather than calling hooks conditionally.
  if (!privileged) {
    return <LiveFeedContext.Provider value={IDLE_VALUE}>{children}</LiveFeedContext.Provider>
  }
  return <ConnectedLiveFeed>{children}</ConnectedLiveFeed>
}

export function useLiveFeed() {
  const ctx = useContext(LiveFeedContext)
  if (!ctx) throw new Error('useLiveFeed must be used within LiveFeedProvider')
  return ctx
}
