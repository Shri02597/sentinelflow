import { useCallback, useEffect, useState } from 'react'
import { getBlocked, raiseResponse, releaseTarget } from '../../services/api.js'
import { Button } from '../../components/ui.jsx'
import { apiErrorMessage } from '../../lib/apiError.js'
import Icon from '../../components/Icon.jsx'

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
        await raiseResponse({ event_id: event.id, action, reason: reason || undefined })
      }
      setReason('')
      await loadState()
      onChanged?.()
    } catch (e) {
      setError(apiErrorMessage(e, 'That action failed.'))
    } finally {
      setBusy(null)
    }
  }

  const blocked = blockState?.is_active === true

  return (
    <div className={`card space-y-3 ${blocked ? 'border-severity-critical/35 shadow-glow-critical' : ''}`}>
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <Icon name="shield" size={14} className="text-accent" />
          Response
        </h2>
        {blocked ? (
          <span className="badge badge-CRITICAL"><Icon name="lock" size={10} />IP Blocked</span>
        ) : (
          <span className="text-2xs text-slate-500">no action taken</span>
        )}
      </div>

      {blocked && (
        <div className="px-3 py-2.5 rounded-lg bg-severity-critical/8 border border-severity-critical/25">
          <p className="text-xs text-slate-300">{blockState.reason}</p>
          <p className="mt-1 font-mono text-2xs text-slate-500">since {new Date(blockState.blocked_at).toLocaleString()}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-slate-500">
        <span>Target</span>
        <span className="font-mono text-slate-200">{targetKey}</span>
        <span className="text-slate-700">·</span>
        <span>{event.user_id ? `account #${event.user_id} affected` : 'unauthenticated traffic'}</span>
      </div>

      <div>
        <label className="label">Reason for the audit trail</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Optional — a default is generated if left blank"
          className="input resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-severity-critical/10 border border-severity-critical/30">
          <Icon name="warn" size={13} className="text-severity-critical shrink-0" />
          <span className="text-2xs text-severity-critical">{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="warn" size="sm" disabled={busy !== null} onClick={() => act('WARN')} icon={<Icon name="warn" size={13} />}>
          {busy === 'WARN' ? 'Warning…' : 'Warn account'}
        </Button>
        <Button variant="danger" size="sm" disabled={busy !== null || blocked} onClick={() => act('BLOCK')} icon={<Icon name="lock" size={13} />}>
          {blocked ? 'Already blocked' : busy === 'BLOCK' ? 'Blocking…' : 'Block this IP'}
        </Button>
        {blocked && (
          <Button size="sm" disabled={busy !== null} onClick={() => act('UNBLOCK')} icon={<Icon name="unlock" size={13} />}>
            {busy === 'UNBLOCK' ? 'Releasing…' : 'Release block'}
          </Button>
        )}
      </div>

      <p className="text-2xs leading-relaxed text-slate-600 pt-1 border-t border-line">
        Blocking returns <span className="font-mono text-slate-400">403</span> to every request from this IP.
        Analysts and admins keep access to this console so a block can always be undone.
      </p>
    </div>
  )
}
