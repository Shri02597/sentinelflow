import { Link } from 'react-router-dom'

export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition bg-white">
      <Link to={`/products/${product.id}`}>
        <img src={product.image} alt={product.name} className="w-full h-40 object-cover" loading="lazy" />
      </Link>
      <div className="p-3">
        <div className="text-xs text-indigo-500 font-medium mb-0.5">{product.category}</div>
        <Link to={`/products/${product.id}`} className="font-semibold text-sm hover:text-indigo-600 line-clamp-1">
          {product.name}
        </Link>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold">${product.price.toFixed(2)}</span>
          {onAddToCart && (
            <button
              onClick={() => onAddToCart(product)}
              disabled={product.stock <= 0}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {product.stock <= 0 ? 'Out of stock' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
