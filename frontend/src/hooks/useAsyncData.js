import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fetches on mount and exposes { data, error, loading, lastLoadedAt, reload }.
 *
 * The reason this exists rather than a `.then(setState)` in each page: an
 * unhandled fetch rejection leaves a page stuck on "Loading…" forever. That is
 * exactly what a dashboard does when the network drops mid-session, and it's
 * indistinguishable from "the server is slow". Here a failure is a real,
 * renderable state with a retry affordance.
 *
 * `deps` re-runs the fetch when the identity of the resource changes.
 */
export function useAsyncData(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastLoadedAt, setLastLoadedAt] = useState(null)

  const mountedRef = useRef(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true)
    try {
      const result = await fetcherRef.current()
      if (!mountedRef.current) return
      setData(result)
      setError(null)
      setLastLoadedAt(Date.now())
    } catch (e) {
      if (!mountedRef.current) return
      setError(e)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Refresh without flipping back to the loading skeleton — used by the
  // polling fallback, where blanking the dashboard every 15s would be worse
  // than showing slightly stale numbers.
  const refresh = useCallback(() => run({ quiet: true }), [run])

  return { data, error, loading, lastLoadedAt, reload: run, refresh }
}
