import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_BY_ROLE = {
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
    { to: '/admin/settings', label: 'Settings' },
  ],
}

export default function SentinelLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const nav = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.ANALYST

  return (
    <div className="min-h-screen flex bg-bg text-slate-100">
      <aside className="w-56 bg-bg-panel border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <span className="text-accent font-bold text-lg">SentinelFlow</span>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Security Operations</div>
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
          <Link to="/home" className="block text-slate-500 hover:text-accent text-xs mb-2">
            ← Back to ShopFlow
          </Link>
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
