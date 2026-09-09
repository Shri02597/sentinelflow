import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_BY_ROLE = {
  USER: [
    { to: '/home', label: 'Home' },
    { to: '/search', label: 'Search' },
    { to: '/activity', label: 'Activity' },
    { to: '/profile', label: 'Profile' },
  ],
  ANALYST: [
    { to: '/security', label: 'Dashboard' },
    { to: '/security/events', label: 'Security Events' },
    { to: '/security/risky-users', label: 'Risky Users' },
  ],
  ADMIN: [
    { to: '/security', label: 'Dashboard' },
    { to: '/security/events', label: 'Security Events' },
    { to: '/security/risky-users', label: 'Risky Users' },
    { to: '/admin/users', label: 'User Management' },
  ],
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const nav = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.USER

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-bg-panel border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <span className="text-accent font-bold text-lg">SentinelFlow</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block px-3 py-2 rounded-lg text-sm transition ${
                location.pathname === item.to
                  ? 'bg-accent/10 text-accent'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 text-sm">
          <div className="text-slate-400 mb-2">
            {user?.username} <span className="text-xs text-slate-500">({user?.role})</span>
          </div>
          <button onClick={logout} className="text-red-400 hover:text-red-300 text-sm">
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-bg p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
