import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fetches on mount and exposes { data, error, loading, stale, lastLoadedAt, reload }.
 *
 * The reason this exists rather than a `.then(setState)` in each page: an
 * unhandled fetch rejection leaves a page stuck on "Loading…" forever. That is
 * exactly what a dashboard does when the network drops mid-session, and it's
 * indistinguishable from "the server is slow". Here a failure is a real,
 * renderable state with a retry affordance.
 *
 * Two further guarantees, both learned from a dashboard that went blank during a
 * demo on unreliable college wifi:
 *
 * 1. Successful payloads are persisted to localStorage. On mount the cached copy
 *    is rendered *immediately* and flagged `stale`, then refreshed in the
 *    background. A dashboard whose network has died shows the last thing it
 *    knew — clearly labelled as old — instead of an empty grid of skeletons that
 *    never resolve. On a security console, "no data" and "nothing is wrong"
 *    look identical, so blanking is the one failure mode that must not happen.
 *
 * 2. `data` is never cleared on failure. A failed refresh keeps the previous
 *    value and raises `stale`, so a transient blip never wipes the screen.
 *
 * Caching is opt-out via `cacheKey` (pass `null` for data that must never be
 * persisted, e.g. per-request results) and bounded to a handful of keys.
 *
 * `deps` re-runs the fetch when the identity of the resource changes.
 */
const CACHE_PREFIX = 'sf_cache:'
const MAX_CACHE_KEYS = 12

function readCache(key) {
  if (!key || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.savedAt !== 'number') return null
    return parsed
  } catch {
    // A corrupt or unreadable entry is not worth failing the render over —
    // the live fetch below will repopulate it.
    return null
  }
}

function writeCache(key, data) {
  if (!key || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }))

    // Keep the store from growing without bound on a long-lived session.
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX))
    if (keys.length > MAX_CACHE_KEYS) {
      const evictable = keys
        .map((k) => ({ k, savedAt: readCache(k.slice(CACHE_PREFIX.length))?.savedAt ?? 0 }))
        .sort((a, b) => a.savedAt - b.savedAt)
        .slice(0, keys.length - MAX_CACHE_KEYS)
      evictable.forEach(({ k }) => localStorage.removeItem(k))
    }
  } catch {
    // Quota exceeded or private-mode restrictions. Caching is an enhancement,
    // never a reason to fail.
  }
}

export function clearDataCache() {
  if (typeof localStorage === 'undefined') return
  Object.keys(localStorage)
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}

export function useAsyncData(fetcher, deps = [], { cacheKey = null } = {}) {
  const cached = useRef(null)
  if (cached.current === null) cached.current = readCache(cacheKey)

  const [data, setData] = useState(cached.current?.data ?? null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(cached.current == null)
  // True when what's on screen came from cache (or a failed refresh) rather than
  // this request. Drives the "stale data" affordances.
  const [stale, setStale] = useState(cached.current != null)
  const [lastLoadedAt, setLastLoadedAt] = useState(cached.current?.savedAt ?? null)

  const mountedRef = useRef(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const cacheKeyRef = useRef(cacheKey)
  cacheKeyRef.current = cacheKey

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
      setStale(false)
      setLastLoadedAt(Date.now())
      writeCache(cacheKeyRef.current, result)
    } catch (e) {
      if (!mountedRef.current) return
      setError(e)
      // Deliberately leave `data` untouched: whatever is already on screen is
      // more useful than an empty grid, and it's now labelled as not current.
      if (cached.current != null) setStale(true)
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

  return { data, error, loading, stale, lastLoadedAt, reload: run, refresh }
}
