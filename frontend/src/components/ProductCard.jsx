import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

export default function ProductCard({ product, onAddToCart }) {
  const out = product.stock <= 0
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition duration-200 ease-spring hover:border-shop-200 hover:shadow-md hover:-translate-y-0.5">
      <Link to={`/products/${product.id}`} className="relative block overflow-hidden bg-slate-100">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {out && (
          <span className="absolute inset-0 grid place-items-center bg-white/70 text-2xs font-bold uppercase tracking-wider text-ink-soft">
            Sold out
          </span>
        )}
        {!out && product.stock <= 5 && (
          <span className="absolute right-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-2xs font-bold text-severity-high backdrop-blur">
            {product.stock} left
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-2xs font-semibold uppercase tracking-wider text-shop-500">{product.category}</span>
        <Link to={`/products/${product.id}`} className="mt-1 text-sm font-semibold leading-snug text-ink line-clamp-2 hover:text-shop-600 transition">
          {product.name}
        </Link>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-faint line-clamp-2">{product.description}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
          <span className="text-base font-bold tracking-tight text-ink">${product.price.toFixed(2)}</span>
          {onAddToCart && (
            <button
              onClick={() => onAddToCart(product)}
              disabled={out}
              className="inline-flex items-center gap-1.5 rounded-lg bg-shop-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-shop-700 active:scale-95 disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-400"
            >
              <Icon name="cart" size={12} />
              {out ? 'Sold out' : 'Add'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
