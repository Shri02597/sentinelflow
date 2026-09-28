import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTopThreats, blockTarget, warnTarget } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'
import { Button, Skeleton, EmptyState } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

const LEVEL = {
  CRITICAL: 'border-severity-critical/35 bg-severity-critical/12 text-severity-critical',
  HIGH: 'border-severity-high/30 bg-severity-high/10 text-severity-high',
  MEDIUM: 'border-severity-medium/30 bg-severity-medium/10 text-severity-medium',
  LOW: 'border-line bg-bg-raised text-slate-400',
}

/** Risk score rendered as a bar, so ranking is readable without reading digits. */
function ScoreBar({ score, level }) {
  const bar = { CRITICAL: 'bg-severity-critical', HIGH: 'bg-severity-high', MEDIUM: 'bg-severity-medium', LOW: 'bg-slate-500' }[level] ?? 'bg-slate-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 rounded-full bg-bg-raised overflow-hidden shrink-0">
        <div className={`h-full rounded-full transition-all duration-500 ease-spring ${bar}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`text-2xs font-bold tabular-nums ${bar.replace('bg-', 'text-')}`}>{score}</span>
    </div>
  )
}

export default function TopThreats({ limit = 5 }) {
  const [threats, setThreats] = useState([])
  const [loading, setLoading] = useState(true)
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
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (pollTick > 0) load() }, [pollTick, load])
  useEffect(() => subscribe((msg) => {
    if (msg.type === 'security_event' || msg.type === 'response_action') load()
  }), [subscribe, load])

  async function respond(threat, action) {
    setBusyIp(threat.source_ip)
    setError(null)
    try {
      const body = { event_id: threat.latest_event_id, action }
      if (action === 'BLOCK') await blockTarget(body)
      else await warnTarget(body)
      await load()
    } catch {
      setError('Response failed — check your permissions and try again.')
    } finally {
      setBusyIp(null)
    }
  }

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <div>
          <h2 className="card-title flex items-center gap-2">
            <Icon name="shield" size={14} className="text-accent" />
            Top Threats by Source IP
          </h2>
          <p className="card-subtitle">Ranked by risk score — warn at 60, block at 80</p>
        </div>
        <span className="badge badge-neutral">{limit}</span>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-severity-critical/10 border border-severity-critical/30 text-2xs text-severity-critical">{error}</div>
      )}

      <div className="space-y-2 -mx-1 px-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[86px] w-full" />)
        ) : threats.length === 0 ? (
          <EmptyState icon="shield" title="No threats in the last 24h" hint="This is a good sign. Generate suspicious traffic from ShopFlow to see the ranking populate." />
        ) : (
          threats.map((t, i) => (
            <div
              key={t.source_ip}
              className="group relative px-3.5 py-3 rounded-lg border border-line bg-bg-sunken/40 transition duration-200 ease-spring hover:border-line-strong hover:bg-bg-panel2"
            >
              <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-accent/60" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xs font-bold text-slate-600 tabular-nums w-4">{i + 1}</span>
                    <span className="font-mono text-sm font-semibold text-slate-100">{t.source_ip}</span>
                    <span className={`badge ${LEVEL[t.risk_level] ?? LEVEL.LOW}`}>{t.risk_level}</span>
                    {t.is_blocked && <span className="badge badge-accent"><Icon name="lock" size={10} />Blocked</span>}
                    {!t.is_blocked && t.is_warned && <span className="badge badge-MEDIUM"><Icon name="warn" size={10} />Warned</span>}
                    <ScoreBar score={t.risk_score} level={t.risk_level} />
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                    <Icon name="bolt" size={12} className="text-accent shrink-0" />
                    {String(t.dominant_attack_type ?? '').replaceAll('_', ' ').toLowerCase()}
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{t.event_count} event{t.event_count === 1 ? '' : 's'}</span>
                    {t.affected_user_ids?.length > 0 && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">account {t.affected_user_ids.join(', ')}</span>
                      </>
                    )}
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500 font-mono text-2xs">{new Date(t.last_seen).toLocaleTimeString()}</span>
                  </div>

                  {Object.keys(t.attacks ?? {}).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {Object.entries(t.attacks).map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-raised border border-line font-mono text-2xs text-slate-400">
                          {k.replaceAll('_', ' ').toLowerCase()} <span className="text-slate-200 font-bold">×{v}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {t.latest_event_id && (
                    <Link to={`/security/events/${t.latest_event_id}`} className="btn btn-ghost btn-sm text-2xs">
                      <Icon name="eye" size={12} />Inspect
                    </Link>
                  )}
                  <Button variant="warn" size="sm" disabled={busyIp === t.source_ip || t.is_blocked} onClick={() => respond(t, 'WARN')} className="text-2xs">
                    <Icon name="warn" size={12} />Warn
                  </Button>
                  <Button variant="danger" size="sm" disabled={busyIp === t.source_ip || t.is_blocked} onClick={() => respond(t, 'BLOCK')} className="text-2xs">
                    <Icon name="lock" size={12} />{t.is_blocked ? 'Blocked' : 'Block IP'}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
