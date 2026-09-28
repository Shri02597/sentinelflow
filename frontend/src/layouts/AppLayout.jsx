import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from '../components/Icon.jsx'

const NAV_BY_ROLE = {
  USER: [
    { to: '/home', label: 'Home', icon: 'globe' },
    { to: '/search', label: 'Search', icon: 'search' },
    { to: '/activity', label: 'Activity', icon: 'activity' },
    { to: '/profile', label: 'Profile', icon: 'user' },
  ],
  ANALYST: [
    { to: '/security', label: 'Dashboard', icon: 'dashboard' },
    { to: '/security/events', label: 'Security Events', icon: 'events' },
    { to: '/security/risky-users', label: 'Risky Users', icon: 'users' },
  ],
  ADMIN: [
    { to: '/security', label: 'Dashboard', icon: 'dashboard' },
    { to: '/security/events', label: 'Security Events', icon: 'events' },
    { to: '/security/risky-users', label: 'Risky Users', icon: 'users' },
    { to: '/admin/users', label: 'User Management', icon: 'users' },
  ],
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const nav = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.USER

  return (
    <div className="min-h-screen flex bg-bg">
      <aside className="w-60 shrink-0 border-r border-line bg-bg-panel/80 backdrop-blur flex flex-col sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-line shrink-0">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-accent-sheen border border-accent/30 text-accent">
            <Icon name="shield" size={17} />
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-50">SentinelFlow</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                  active ? 'bg-accent-soft text-accent' : 'text-slate-400 hover:text-slate-100 hover:bg-bg-raised'
                }`}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />}
                <Icon name={item.icon} size={15} className="shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-line shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-bg-raised/60">
            <span className="grid place-items-center h-7 w-7 rounded-full bg-accent/15 text-2xs font-bold text-accent uppercase">
              {user?.username?.[0] ?? '?'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-200 truncate">{user?.username}</span>
              <span className="block text-2xs text-slate-500">{user?.role}</span>
            </span>
            <button onClick={logout} className="p-1.5 rounded-md text-slate-500 hover:text-severity-critical hover:bg-severity-critical/10 transition" aria-label="Log out">
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
