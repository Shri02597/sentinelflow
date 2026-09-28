import { useEffect, useState } from 'react'

/**
 * Tracks navigator.onLine.
 *
 * Browsers report `false` when the machine has no route to the network, which
 * is the one signal we can trust to stop hammering a dead connection. It does
 * *not* tell us the server is reachable — a captive portal or a blocked port
 * still reports `true` — so this is used to pause work, never to decide that
 * a request succeeded.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}

/**
 * Tracks whether the tab is in the foreground.
 *
 * Used to back off polling when nobody is looking: a SOC dashboard left open
 * on a second monitor over a slow link shouldn't spend its bandwidth
 * refreshing a chart nobody is reading.
 */
export function useDocumentVisible() {
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  )

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
