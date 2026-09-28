import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBlocked, getResponseActions, releaseTarget } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'

/**
 * The containment register: what is currently blocked, and every warn/block/
 * unblock decision ever made, automatic or manual.
 *
 * The audit trail is append-only on the backend, so this page is the
 * authoritative answer to "who blocked this, when, and why" — including
 * actions the auto-response policy took without an analyst present.
 */
export default function BlockedIdentities() {
  const [blocked, setBlocked] = useState([])
  const [actions, setActions] = useState([])
  const [includeReleased, setIncludeReleased] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const { subscribe, pollTick } = useLiveFeed()

  const load = useCallback(async () => {
    try {
      const [b, a] = await Promise.all([
        getBlocked(includeReleased),
        getResponseActions({ limit: 50 }),
      ])
      setBlocked(b.data)
      setActions(a.data)
      setError(null)
    } catch {
      setError('Could not load the containment register.')
    }
  }, [includeReleased])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (pollTick > 0) load() }, [pollTick, load])
  useEffect(() => subscribe((msg) => {
    if (msg.type === 'response_action') load()
  }), [subscribe, load])

  async function release(row) {
    setBusy(row.id)
    try {
      await releaseTarget({ target_type: row.target_type, target_key: row.target_key })
      await load()
    } catch {
      setError('Release failed — check your permissions.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Containment</h1>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={includeReleased}
            onChange={(e) => setIncludeReleased(e.target.checked)}
          />
          Show released
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="card">
        <h3 className="font-semibold mb-3 text-sm text-slate-300">
          Blocked targets ({blocked.filter((b) => b.is_active).length} active)
        </h3>
        {blocked.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing is blocked.</p>
        ) : (
          <div className="space-y-2">
            {blocked.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 border border-slate-800 rounded-lg p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm">{row.target_key}</span>
                    <span className="text-[10px] text-slate-500">{row.target_type}</span>
                    {row.is_active ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-red-800 text-red-300 bg-red-950/40">ACTIVE</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">RELEASED</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{row.reason}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Blocked {new Date(row.blocked_at).toLocaleString()}
                    {row.released_at && ` · released ${new Date(row.released_at).toLocaleString()}`}
                    {row.source_event_id && (
                      <>
                        {' · '}
                        <Link className="text-accent hover:underline" to={`/security/events/${row.source_event_id}`}>
                          event #{row.source_event_id}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {row.is_active && (
                  <button
                    disabled={busy === row.id}
                    onClick={() => release(row)}
                    className="shrink-0 text-[11px] px-2 py-1 rounded border border-slate-700 text-slate-300 hover:border-accent disabled:opacity-40"
                  >
                    Release
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3 text-sm text-slate-300">Response audit trail</h3>
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">No response actions recorded.</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto text-xs">
            {actions.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 border-b border-slate-800 py-2">
                <div className="min-w-0">
                  <span
                    className={`font-semibold mr-2 ${
                      a.action === 'BLOCK' ? 'text-red-400' : a.action === 'WARN' ? 'text-yellow-400' : 'text-green-400'
                    }`}
                  >
                    {a.action}
                  </span>
                  <span className="font-mono text-slate-300">{a.target_key}</span>
                  {a.is_auto && <span className="ml-2 text-slate-500">(auto)</span>}
                  <p className="text-slate-500 mt-0.5">{a.reason}</p>
                </div>
                <div className="text-slate-600 text-right shrink-0">
                  <div>{a.actor_role}</div>
                  <div>{new Date(a.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
