import { useCallback, useEffect, useState } from 'react'
import { getBlocked, raiseResponse, releaseTarget } from '../../services/api.js'

/**
 * Analyst response controls for a single threat.
 *
 * The detection pipeline tells you an attack happened; this is where you act
 * on it. Both actions are deliberately explicit and require a reason, because
 * both end up in an append-only audit trail that someone may have to justify
 * later — and because auto-blocking on a shared-IP demo is exactly the kind of
 * action you don't want one stray click away.
 *
 * The IP is the default target because it's the one you can actually cut off.
 * An authenticated account is usually the *victim* of a brute force, so
 * blocking it by default would hand the attacker a lockout DoS.
 */
export default function ResponsePanel({ event, onChanged }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [blockState, setBlockState] = useState(null)

  const targetKey = event.source_ip

  const loadState = useCallback(async () => {
    try {
      const res = await getBlocked(false)
      setBlockState(res.data.find((b) => b.target_key === targetKey) || null)
    } catch {
      // The panel degrades to "unknown state"; the actions below still work.
      setBlockState(null)
    }
  }, [targetKey])

  useEffect(() => { loadState() }, [loadState])

  async function act(action) {
    setBusy(action)
    setError(null)
    try {
      if (action === 'UNBLOCK') {
        await releaseTarget({
          target_type: 'IP',
          target_key: targetKey,
          reason: reason || 'Released by analyst.',
        })
      } else {
        await raiseResponse({
          event_id: event.id,
          action,
          reason: reason || undefined,
        })
      }
      setReason('')
      await loadState()
      onChanged?.()
    } catch (e) {
      setError(e?.response?.data?.detail || 'That action failed.')
    } finally {
      setBusy(null)
    }
  }

  const blocked = blockState?.is_active === true

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-300">Response</h3>
        {blocked ? (
          <span className="text-[10px] px-2 py-0.5 rounded border border-red-800 text-red-300 bg-red-950/40">
            IP BLOCKED
          </span>
        ) : (
          <span className="text-[10px] text-slate-500">no action taken</span>
        )}
      </div>

      {blocked && (
        <p className="text-xs text-slate-400">
          {blockState.reason}
          <span className="text-slate-600"> · since {new Date(blockState.blocked_at).toLocaleString()}</span>
        </p>
      )}

      <p className="text-xs text-slate-500">
        Target: <span className="font-mono text-slate-300">{targetKey}</span>
        {event.user_id ? ` (account #${event.user_id} affected)` : ' (unauthenticated traffic)'}
      </p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Reason for the audit trail (optional — a default is generated)"
        className="w-full bg-bg-panel2 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        <button
          disabled={busy !== null}
          onClick={() => act('WARN')}
          className="px-3 py-1.5 rounded-lg text-xs border border-yellow-800 text-yellow-300 hover:bg-yellow-950/30 disabled:opacity-40"
        >
          {busy === 'WARN' ? 'Warning…' : 'Warn account'}
        </button>
        <button
          disabled={busy !== null || blocked}
          onClick={() => act('BLOCK')}
          className="px-3 py-1.5 rounded-lg text-xs border border-red-800 text-red-300 hover:bg-red-900/40 disabled:opacity-40"
        >
          {blocked ? 'Already blocked' : busy === 'BLOCK' ? 'Blocking…' : 'Block this IP'}
        </button>
        {blocked && (
          <button
            disabled={busy !== null}
            onClick={() => act('UNBLOCK')}
            className="px-3 py-1.5 rounded-lg text-xs border border-slate-600 text-slate-300 hover:border-accent disabled:opacity-40"
          >
            {busy === 'UNBLOCK' ? 'Releasing…' : 'Release block'}
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-600">
        Blocking returns <span className="font-mono">403</span> to every request from this IP.
        Analysts and admins keep access to this console so a block can always be undone.
      </p>
    </div>
  )
}
