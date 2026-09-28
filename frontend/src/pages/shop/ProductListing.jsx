import { useCallback, useEffect, useState } from 'react'
import { getProducts, addToCart } from '../../services/api.js'
import ProductCard from '../../components/ProductCard.jsx'
import { Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

export default function ProductListing() {
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('')
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await getProducts(category ? { category } : undefined)
      setProducts(res.data)
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => { load() }, [load])

  // Categories come from an unfiltered call — filtering the current list by its
  // own categories would hide the tab you are on the moment you select it.
  useEffect(() => {
    getProducts().then((res) => setAll(res.data))
  }, [])

  const categories = [...new Set(all.map((p) => p.category))]

  async function handleAdd(product) {
    await addToCart(product.id, 1)
    setToast(`Added "${product.name}" to your cart`)
    setTimeout(() => setToast(''), 2200)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Products</h1>
          <p className="mt-1 text-sm text-ink-faint">{products.length} item{products.length === 1 ? '' : 's'}{category ? ` in ${category}` : ''}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {[{ label: 'All', value: '' }, ...categories.map((c) => ({ label: c, value: c }))].map((tab) => (
          <button
            key={tab.value || 'all'}
            onClick={() => { setLoading(true); setCategory(tab.value) }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              category === tab.value
                ? 'bg-shop-600 text-white shadow-sm'
                : 'border border-slate-200 text-ink-soft hover:border-shop-300 hover:text-shop-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-severity-low/30 bg-severity-low/8 px-3.5 py-2 text-xs font-medium text-severity-low">
          <Icon name="check" size={14} />
          {toast}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-ink-faint">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />)}
        </div>
      )}
    </div>
  )
}
