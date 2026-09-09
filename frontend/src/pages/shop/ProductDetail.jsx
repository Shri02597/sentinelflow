import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProduct, addToCart } from '../../services/api.js'

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
    setTimeout(() => setToast(''), 2000)
  }

  if (error) return <p className="text-slate-500">{error} <Link to="/products" className="text-indigo-600">Back to products</Link></p>
  if (!product) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <img src={product.image} alt={product.name} className="w-full rounded-xl border border-slate-200" />
      <div>
        <div className="text-xs text-indigo-500 font-medium mb-1">{product.category}</div>
        <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
        <p className="text-slate-600 mb-4">{product.description}</p>
        <div className="text-3xl font-bold mb-4">${product.price.toFixed(2)}</div>
        <div className="text-sm text-slate-500 mb-4">
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number" min={1} max={99} value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleAdd} disabled={product.stock <= 0}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40"
          >
            Add to Cart
          </button>
          {toast && <span className="text-sm text-green-600">{toast}</span>}
        </div>
      </div>
    </div>
  )
}
