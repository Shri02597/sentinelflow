import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTopThreats, blockTarget, warnTarget } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'
import Badge from '../../components/Badge.jsx'

const LEVEL_STYLES = {
  CRITICAL: 'text-red-400 border-red-900 bg-red-950/40',
  HIGH: 'text-orange-400 border-orange-900 bg-orange-950/30',
  MEDIUM: 'text-yellow-400 border-yellow-900 bg-yellow-950/20',
  LOW: 'text-slate-400 border-slate-800 bg-slate-900/40',
}

/**
 * "Who is the worst offender right now, and what are they running?"
 *
 * Answers the question an analyst otherwise has to reconstruct by hand: the
 * feed shows events one at a time and the request timeline shows one IP at a
 * time, so ranking sources required joining two views in your head. This is
 * grouped per IP, scored, and shows the dominant attack plus the response
 * already taken — with the block/warn controls inline.
 */
export default function TopThreats({ limit = 5 }) {
  const [threats, setThreats] = useState([])
  const [error, setError] = useState(null)
  const [busyIp, setBusyIp] = useState(null)
  const { subscribe, pollTick } = useLiveFeed()

  const load = useCallback(async () => {
    try {
      const res = await getTopThreats({ limit })
      setThreats(res.data)
      setError(null)
    } catch {
      setError('Could not load threat ranking.')
    }
  }, [limit])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (pollTick > 0) load() }, [pollTick, load])

  // A new detection changes the ranking, so refresh on the live feed too.
  useEffect(() => subscribe((msg) => {
    if (msg.type === 'security_event' || msg.type === 'response_action') load()
  }), [subscribe, load])

  async function respond(threat, action) {
    setBusyIp(threat.source_ip)
    try {
      if (action === 'BLOCK') {
        await blockTarget({ event_id: threat.latest_event_id, action: 'BLOCK' })
      } else {
        await warnTarget({ event_id: threat.latest_event_id, action: 'WARN' })
      }
      await load()
    } catch {
      setError('Response failed — check your permissions and try again.')
    } finally {
      setBusyIp(null)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-slate-300">Top Threats (by source IP)</h3>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      {threats.length === 0 && !error && (
        <p className="text-sm text-slate-500">No security events recorded in the last 24h.</p>
      )}

      <div className="space-y-2">
        {threats.map((t) => (
          <div key={t.source_ip} className="border border-slate-800 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-slate-200">{t.source_ip}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      LEVEL_STYLES[t.risk_level] || LEVEL_STYLES.LOW
                    }`}
                  >
                    {t.risk_level} · {t.risk_score}
                  </span>
                  {t.is_blocked && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-red-800 text-red-300 bg-red-950/40">
                      BLOCKED
                    </span>
                  )}
                  {!t.is_blocked && t.is_warned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-yellow-800 text-yellow-300 bg-yellow-950/30">
                      WARNED
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 mt-1">
                  <span className="text-slate-300">{t.dominant_attack_type.replaceAll('_', ' ')}</span>
                  {' · '}
                  {t.event_count} event{t.event_count === 1 ? '' : 's'}
                  {t.affected_user_ids.length > 0 && ` · account${t.affected_user_ids.length > 1 ? 's' : ''} ${t.affected_user_ids.join(', ')}`}
                  {` · last seen ${new Date(t.last_seen).toLocaleTimeString()}`}
                </div>

                <div className="text-[11px] text-slate-500 mt-0.5">
                  {Object.entries(t.attacks).map(([k, v]) => `${k.replaceAll('_', ' ').toLowerCase()} ×${v}`).join('  ·  ')}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {t.latest_event_id && (
                  <Link
                    to={`/security/events/${t.latest_event_id}`}
                    className="text-[11px] px-2 py-1 rounded border border-slate-700 text-slate-300 hover:border-accent"
                  >
                    Inspect
                  </Link>
                )}
                <button
                  disabled={busyIp === t.source_ip || t.is_blocked}
                  onClick={() => respond(t, 'WARN')}
                  className="text-[11px] px-2 py-1 rounded border border-yellow-800 text-yellow-300 hover:bg-yellow-950/30 disabled:opacity-40"
                >
                  Warn
                </button>
                <button
                  disabled={busyIp === t.source_ip || t.is_blocked}
                  onClick={() => respond(t, 'BLOCK')}
                  className="text-[11px] px-2 py-1 rounded border border-red-800 text-red-300 hover:bg-red-900/40 disabled:opacity-40"
                >
                  {t.is_blocked ? 'Blocked' : 'Block IP'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
