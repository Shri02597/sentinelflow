import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const NAV = [
  { to: '/home', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/cart', label: 'Cart' },
  { to: '/activity', label: 'Activity' },
  { to: '/profile', label: 'Profile' },
]

export default function ShopLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link to="/home" className="text-xl font-bold text-indigo-600 shrink-0">ShopFlow</Link>

          <nav className="hidden md:flex gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  location.pathname === item.to
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={handleSearch} className="flex-1 max-w-sm ml-auto">
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
              className="w-full bg-slate-100 border border-slate-200 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
            />
          </form>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-slate-500 hidden sm:inline">{user?.username}</span>
            <button onClick={logout} className="text-sm text-slate-500 hover:text-red-500">
              Logout
            </button>
          </div>
        </div>
        <nav className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.to} to={item.to}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                location.pathname === item.to ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
