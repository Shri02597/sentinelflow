import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ConnectionStatus from '../components/ConnectionStatus.jsx'
import Icon from '../components/Icon.jsx'

const NAV_BY_ROLE = {
  ANALYST: [
    { to: '/security', label: 'Dashboard', icon: 'dashboard' },
    { to: '/security/events', label: 'Security Events', icon: 'events' },
    { to: '/security/risky-users', label: 'Risky Users', icon: 'users' },
    { to: '/security/containment', label: 'Containment', icon: 'block' },
  ],
  ADMIN: [
    { to: '/security', label: 'Dashboard', icon: 'dashboard' },
    { to: '/security/events', label: 'Security Events', icon: 'events' },
    { to: '/security/risky-users', label: 'Risky Users', icon: 'users' },
    { to: '/security/containment', label: 'Containment', icon: 'block' },
    { to: '/admin/users', label: 'User Management', icon: 'users', group: true },
    { to: '/admin/settings', label: 'Settings', icon: 'bolt' },
  ],
}

export default function SentinelLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const nav = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.ANALYST

  return (
    <div className="min-h-screen flex bg-bg">
      <aside className="w-60 shrink-0 border-r border-line bg-bg-panel/80 backdrop-blur flex flex-col sticky top-0 h-screen">
        <Link to="/security" className="flex items-center gap-2.5 px-5 h-16 border-b border-line shrink-0 group">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-accent-sheen border border-accent/30 text-accent transition group-hover:shadow-glow-accent">
            <Icon name="shield" size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold tracking-tight text-slate-50 leading-tight">SentinelFlow</span>
            <span className="block text-2xs uppercase tracking-wider text-slate-500">Security Ops</span>
          </span>
        </Link>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to
            return (
              <div key={item.to}>
                {item.group && <div className="px-3 pt-4 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-600">Administration</div>}
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ease-spring ${
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-bg-raised'
                  }`}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />}
                  <Icon name={item.icon} size={15} className="shrink-0" />
                  {item.label}
                </Link>
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-line space-y-3 shrink-0">
          <ConnectionStatus />
          <Link
            to="/home"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-accent hover:bg-bg-raised transition"
          >
            <Icon name="arrow" size={13} className="rotate-180" />
            Back to ShopFlow
          </Link>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-bg-raised/60">
            <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full bg-accent/15 text-2xs font-bold text-accent uppercase">
              {user?.username?.[0] ?? '?'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-200 truncate">{user?.username}</span>
              <span className="block text-2xs text-slate-500">{user?.role}</span>
            </span>
            <button onClick={logout} title="Log out" aria-label="Log out" className="shrink-0 p-1.5 rounded-md text-slate-500 hover:text-severity-critical hover:bg-severity-critical/10 transition">
              <Icon name="logout" size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
