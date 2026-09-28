import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import SecurityNoticeBanner from '../components/SecurityNoticeBanner.jsx'
import Icon from '../components/Icon.jsx'

const NAV = [
  { to: '/home', label: 'Home', icon: 'globe' },
  { to: '/products', label: 'Products', icon: 'package' },
  { to: '/cart', label: 'Cart', icon: 'cart' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]

function NavLink({ item, active, className = '' }) {
  return (
    <Link
      to={item.to}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition duration-150 ${
        active ? 'bg-shop-50 text-shop-700' : 'text-ink-soft hover:text-ink hover:bg-slate-50'
      } ${className}`}
    >
      <Icon name={item.icon} size={15} className="shrink-0" />
      {item.label}
    </Link>
  )
}

export default function ShopLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-6">
          <Link to="/home" className="flex items-center gap-2 shrink-0 group">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-shop-sheen border border-shop-200 text-shop-600 transition group-hover:scale-105">
              <Icon name="cart" size={16} />
            </span>
            <span className="text-base font-bold tracking-tight text-ink">ShopFlow</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.to} item={item} active={location.pathname === item.to} />
            ))}
          </nav>

          <form onSubmit={handleSearch} className="flex-1 max-w-xs ml-auto relative hidden sm:block">
            <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-ink-faint transition focus:bg-white focus:border-shop-400 focus:outline-none focus:ring-2 focus:ring-shop-200"
            />
          </form>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link to="/cart" className="relative p-2 rounded-lg text-ink-soft hover:bg-slate-50 hover:text-ink transition" aria-label="Cart">
              <Icon name="cart" size={17} />
            </Link>
            <Link
              to="/profile"
              className="grid place-items-center h-8 w-8 rounded-full bg-shop-600 text-2xs font-bold text-white uppercase"
              title={user?.username}
            >
              {user?.username?.[0] ?? '?'}
            </Link>
            <button onClick={logout} className="p-2 rounded-lg text-ink-faint hover:text-severity-critical hover:bg-severity-critical/5 transition" title="Log out" aria-label="Log out">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>

        <nav className="md:hidden flex gap-1 px-4 pb-2.5 overflow-x-auto border-t border-slate-100 pt-2">
          {NAV.map((item) => (
            <NavLink key={item.to} item={item} active={location.pathname === item.to} className="text-xs py-1.5 whitespace-nowrap" />
          ))}
        </nav>
      </header>

      <SecurityNoticeBanner />

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-6">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-faint">
          <span>ShopFlow — a deliberately vulnerable demo storefront.</span>
          <span className="flex items-center gap-1.5">
            <Icon name="shield" size={12} />
            Activity on this site is monitored by SentinelFlow
          </span>
        </div>
      </footer>
    </div>
  )
}
