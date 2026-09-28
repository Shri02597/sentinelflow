import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchProducts, addToCart } from '../../services/api.js'
import ProductCard from '../../components/ProductCard.jsx'
import { Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [q, setQ] = useState(initialQ)
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (initialQ) runSearch(initialQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ])

  async function runSearch(query) {
    setBusy(true)
    try {
      const res = await searchProducts(query)
      setResults(res.data)
    } finally {
      setBusy(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!q.trim()) return
    setSearchParams({ q: q.trim() })
  }

  async function handleAdd(product) {
    await addToCart(product.id, 1)
    setToast(`Added "${product.name}" to your cart`)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Search Products</h1>
      <p className="mt-1 text-sm text-ink-faint">Search is passed to the backend exactly as typed — which is what the injection detector watches.</p>

      <form onSubmit={handleSearch} className="mt-5 flex max-w-lg gap-2">
        <div className="relative flex-1">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for anything…"
            aria-label="Search products"
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-faint transition focus:border-shop-400 focus:outline-none focus:ring-2 focus:ring-shop-100"
          />
        </div>
        <button disabled={busy} className="btn bg-shop-600 text-white border-shop-600 hover:bg-shop-700 disabled:opacity-50">
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {toast && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-severity-low/30 bg-severity-low/8 px-3.5 py-2 text-xs font-medium text-severity-low">
          <Icon name="check" size={14} />
          {toast}
        </div>
      )}

      {busy && (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      )}

      {!busy && results && (
        results.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-50 text-ink-faint">
              <Icon name="search" size={22} />
            </span>
            <p className="mt-4 text-sm font-semibold text-ink">No products matched “{initialQ}”</p>
            <p className="mt-1 text-xs text-ink-faint">If this looked like SQL, the injection detector has probably just fired.</p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-xs text-ink-faint">{results.length} result{results.length === 1 ? '' : 's'} for “{initialQ}”</p>
            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
              {results.map((p) => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />)}
            </div>
          </>
        )
      )}
    </div>
  )
}
