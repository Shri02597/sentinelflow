import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { getProducts, addToCart } from '../../services/api.js'
import ProductCard from '../../components/ProductCard.jsx'
import { Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

const CATEGORIES = [
  { icon: 'package', label: 'Browse the full catalog', to: '/products' },
  { icon: 'search', label: 'Search by keyword', to: '/search' },
  { icon: 'activity', label: 'Review your activity log', to: '/activity' },
]

export default function Home() {
  const { user } = useAuth()
  const [products, setProducts] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getProducts().then((res) => setProducts(res.data.slice(0, 8)))
  }, [])

  async function handleAdd(product) {
    await addToCart(product.id, 1)
    setToast(`Added "${product.name}" to your cart`)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-8 sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-grid-faint bg-[length:28px_28px] opacity-50" />
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-shop-500/25 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-white/70">
            <Icon name="star" size={11} />Trending now
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome back, {user?.username}
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-slate-400">
            Here's what's popular in the shop today. Every action you take here is scored in real time.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <Icon name={c.icon} size={13} />
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-severity-low/30 bg-severity-low/8 px-3.5 py-2 text-xs font-medium text-severity-low">
          <Icon name="check" size={14} />
          {toast}
        </div>
      )}

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Popular right now</h2>
          <p className="mt-0.5 text-xs text-ink-faint">The eight most-viewed products this week</p>
        </div>
      </div>

      {products === null ? (
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />)}
        </div>
      )}
    </div>
  )
}
