import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBlocked, getResponseActions, releaseTarget } from '../../services/api.js'
import { useLiveFeed } from '../../context/LiveFeedContext.jsx'
import { SectionHeader, Skeleton, EmptyState, Button } from '../../components/ui.jsx'
import ErrorState from '../../components/ErrorState.jsx'
import Icon from '../../components/Icon.jsx'

const ACTION_TONE = {
  BLOCK: 'badge-CRITICAL',
  WARN: 'badge-MEDIUM',
  UNBLOCK: 'badge-LOW',
}

export default function BlockedIdentities() {
  const [blocked, setBlocked] = useState([])
  const [actions, setActions] = useState([])
  const [includeReleased, setIncludeReleased] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const { subscribe, pollTick } = useLiveFeed()

  const load = useCallback(async () => {
    try {
      const [b, a] = await Promise.all([getBlocked(includeReleased), getResponseActions({ limit: 50 })])
      setBlocked(b.data)
      setActions(a.data)
      setError(null)
    } catch {
      setError('Could not load the containment register.')
    } finally {
      setLoading(false)
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

  const activeCount = blocked.filter((b) => b.is_active).length

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <SectionHeader
        title="Containment"
        subtitle="What is blocked right now, and every warn/block/release decision ever made"
        actions={
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-panel border border-line cursor-pointer text-xs text-slate-400 hover:border-line-strong transition">
            <input type="checkbox" checked={includeReleased} onChange={(e) => setIncludeReleased(e.target.checked)} className="accent-accent" />
            Show released
          </label>
        }
      />

      {error && <ErrorState message={error} onRetry={load} className="mb-5" />}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-2 card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="block" size={14} className="text-severity-critical" />
              Blocked Targets
            </h2>
            <span className={activeCount > 0 ? 'badge badge-CRITICAL' : 'badge badge-LOW'}>{activeCount} active</span>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : blocked.length === 0 ? (
            <EmptyState icon="unlock" title="Nothing is blocked" hint="No source IPs or accounts are currently denied." />
          ) : (
            <div className="space-y-2">
              {blocked.map((row) => (
                <div key={row.id} className={`px-3.5 py-3 rounded-lg border transition ${row.is_active ? 'border-severity-critical/30 bg-severity-critical/8' : 'border-line bg-bg-sunken/40 opacity-70'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon name={row.is_active ? 'lock' : 'unlock'} size={13} className={row.is_active ? 'text-severity-critical' : 'text-slate-500'} />
                        <span className="font-mono text-sm font-semibold text-slate-100">{row.target_key}</span>
                        <span className="badge badge-neutral">{row.target_type}</span>
                        <span className={row.is_active ? 'badge badge-CRITICAL' : 'badge-LOW'}>{row.is_active ? 'Active' : 'Released'}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{row.reason}</p>
                      <p className="mt-1 font-mono text-2xs text-slate-500">
                        blocked {new Date(row.blocked_at).toLocaleString()}
                        {row.released_at && ` · released ${new Date(row.released_at).toLocaleString()}`}
                        {row.source_event_id && <> · <Link className="link" to={`/security/events/${row.source_event_id}`}>event #{row.source_event_id}</Link></>}
                      </p>
                    </div>
                    {row.is_active && (
                      <Button size="sm" disabled={busy === row.id} onClick={() => release(row)} icon={<Icon name="unlock" size={12} />} className="shrink-0">
                        Release
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-3 card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="activity" size={14} className="text-accent" />
              Response Audit Trail
            </h2>
            <span className="text-2xs text-slate-500">append-only · {actions.length} entries</span>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : actions.length === 0 ? (
            <EmptyState title="No response actions yet" hint="Manual and automatic warn/block decisions appear here." />
          ) : (
            <div className="-mx-2 -mb-2 px-2 pb-2 max-h-[620px] overflow-y-auto">
              <table className="table">
                <thead className="sticky top-0 bg-bg-panel z-10">
                  <tr>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Reason</th>
                    <th>Actor</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span className={`badge ${ACTION_TONE[a.action] ?? 'badge-neutral'}`}>{a.action}</span>
                        {a.is_auto && <span className="ml-1.5 text-2xs text-slate-500">auto</span>}
                      </td>
                      <td className="font-mono text-2xs text-slate-300 whitespace-nowrap">{a.target_key}</td>
                      <td className="text-2xs text-slate-400 max-w-[280px]">{a.reason}</td>
                      <td className="text-2xs text-slate-500 whitespace-nowrap">{a.actor_role}</td>
                      <td className="text-2xs text-slate-500 font-mono whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
