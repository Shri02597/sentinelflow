import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCart, removeFromCart } from '../../services/api.js'
import { Skeleton } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

export default function Cart() {
  const [cart, setCart] = useState(null)

  function load() {
    getCart().then((res) => setCart(res.data))
  }
  useEffect(load, [])

  async function handleRemove(itemId) {
    await removeFromCart(itemId)
    load()
  }

  if (!cart) {
    return (
      <div className="max-w-3xl space-y-3">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    )
  }

  const shipping = cart.total > 0 ? 4.99 : 0
  const grand = cart.total + shipping

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Your Cart</h1>
      <p className="mt-1 text-sm text-ink-faint">
        {cart.items.length === 0 ? 'Nothing here yet' : `${cart.items.length} item${cart.items.length === 1 ? '' : 's'}`}
      </p>

      {cart.items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-shop-50 text-shop-400">
            <Icon name="cart" size={22} />
          </span>
          <p className="mt-4 text-sm font-semibold text-ink">Your cart is empty</p>
          <Link to="/products" className="btn btn-sm mt-4 bg-shop-600 text-white border-shop-600 hover:bg-shop-700">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3">
                <img src={item.product.image} alt={item.product.name} loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${item.product.id}`} className="text-sm font-semibold text-ink hover:text-shop-600 transition line-clamp-1">
                    {item.product.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    {item.quantity} × ${item.product.price.toFixed(2)}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-bold tabular-nums text-ink">
                  ${(item.quantity * item.product.price).toFixed(2)}
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Remove ${item.product.name}`}
                  className="shrink-0 p-2 rounded-lg text-ink-faint transition hover:bg-severity-critical/8 hover:text-severity-critical"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-bold text-ink">Order summary</h2>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-faint">Subtotal</span>
                <span className="font-semibold tabular-nums text-ink">${cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-faint">Shipping</span>
                <span className="font-semibold tabular-nums text-ink">${shipping.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-slate-200 pt-4">
              <span className="text-sm font-bold text-ink">Total</span>
              <span className="text-xl font-bold tabular-nums tracking-tight text-ink">${grand.toFixed(2)}</span>
            </div>
            <button
              disabled
              title="Checkout is out of scope for this demo"
              className="mt-4 w-full cursor-not-allowed rounded-lg bg-slate-200 py-2.5 text-sm font-semibold text-slate-500"
            >
              Checkout not implemented
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
