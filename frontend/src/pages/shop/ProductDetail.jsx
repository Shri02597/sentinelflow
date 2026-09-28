import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProduct, addToCart } from '../../services/api.js'
import { Button, Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [qty, setQty] = useState(1)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getProduct(id).then((res) => setProduct(res.data)).catch(() => setError('Product not found.'))
  }, [id])

  async function handleAdd() {
    await addToCart(product.id, qty)
    setToast('Added to cart')
    setTimeout(() => setToast(''), 2200)
  }

  if (error) {
    return (
      <p className="text-sm text-ink-faint">
        {error} <Link to="/products" className="shop-link font-semibold">Back to products</Link>
      </p>
    )
  }
  if (!product) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-3/4" /><Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  const out = product.stock <= 0

  return (
    <div>
      <Link to="/products" className="shop-link mb-5 inline-flex items-center gap-1 text-xs font-semibold">
        <span className="rotate-180"><Icon name="arrow" size={12} /></span>
        All products
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div className="flex flex-col">
          <span className="w-fit rounded-md bg-shop-50 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-shop-600">{product.category}</span>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-ink">{product.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{product.description}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight text-ink">${product.price.toFixed(2)}</span>
            <span className={`text-xs font-semibold ${out ? 'text-severity-critical' : 'text-severity-low'}`}>
              {out ? 'Out of stock' : `${product.stock} in stock`}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-200">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={out}
                aria-label="Decrease quantity"
                className="px-3 py-2 text-ink-soft transition hover:bg-slate-50 hover:text-ink disabled:opacity-40"
              >
                −
              </button>
              <span className="w-12 text-center text-sm font-semibold tabular-nums text-ink">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))}
                disabled={out}
                aria-label="Increase quantity"
                className="px-3 py-2 text-ink-soft transition hover:bg-slate-50 hover:text-ink disabled:opacity-40"
              >
                +
              </button>
            </div>
            <Button
              onClick={handleAdd}
              disabled={out}
              className="bg-shop-600 text-white border-shop-600 hover:bg-shop-700 hover:border-shop-700"
              icon={<Icon name="cart" size={15} />}
            >
              {out ? 'Out of stock' : 'Add to cart'}
            </Button>
            {toast && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-severity-low">
                <Icon name="check" size={14} />{toast}
              </span>
            )}
          </div>

          <p className="mt-6 border-t border-slate-200 pt-4 text-2xs leading-relaxed text-ink-faint">
            This storefront is intentionally vulnerable for demonstration. Every request you make is
            scored and monitored by SentinelFlow in real time.
          </p>
        </div>
      </div>
    </div>
  )
}
