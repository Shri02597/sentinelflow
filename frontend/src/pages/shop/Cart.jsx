import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCart, removeFromCart } from '../../services/api.js'

export default function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 })

  function load() {
    getCart().then((res) => setCart(res.data))
  }
  useEffect(load, [])

  async function handleRemove(itemId) {
    await removeFromCart(itemId)
    load()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      {cart.items.length === 0 && (
        <p className="text-slate-500">
          Your cart is empty. <Link to="/products" className="text-indigo-600">Browse products</Link>
        </p>
      )}

      <div className="space-y-3">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 border border-slate-200 rounded-xl p-3">
            <img src={item.product.image} alt={item.product.name} className="w-16 h-16 object-cover rounded-lg" />
            <div className="flex-1">
              <div className="font-semibold text-sm">{item.product.name}</div>
              <div className="text-xs text-slate-500">Qty: {item.quantity} × ${item.product.price.toFixed(2)}</div>
            </div>
            <div className="font-semibold">${(item.quantity * item.product.price).toFixed(2)}</div>
            <button onClick={() => handleRemove(item.id)} className="text-red-500 hover:text-red-600 text-sm">
              Remove
            </button>
          </div>
        ))}
      </div>

      {cart.items.length > 0 && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
          <span className="text-slate-600">Total</span>
          <span className="text-xl font-bold">${cart.total.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}
