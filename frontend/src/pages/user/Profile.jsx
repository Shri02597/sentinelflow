import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../../components/Icon.jsx'

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line last:border-0">
      <span className="text-xs text-ink-faint shrink-0">{label}</span>
      <span className={`text-sm text-ink text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Profile</h1>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-shop-600 text-base font-bold uppercase text-white">
            {user?.username?.[0] ?? '?'}
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-ink">{user?.username}</div>
            <div className="truncate text-xs text-ink-faint">{user?.email}</div>
          </div>
        </div>
        <div className="px-5 py-2">
          <Row label="Role" value={user?.role} />
          <Row label="Joined" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <Icon name="shield" size={15} className="mt-px shrink-0 text-shop-500" />
        <p className="text-xs leading-relaxed text-ink-faint">
          Your session is monitored. Repeated failed logins or unusual search input raises your risk
          score, which an analyst can see and act on.
        </p>
      </div>
    </div>
  )
}
