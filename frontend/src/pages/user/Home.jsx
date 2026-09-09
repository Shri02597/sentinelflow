import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getProducts, addToCart } from '../../services/api.js'
import ProductCard from '../../components/ProductCard.jsx'

export default function Home() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    getProducts().then((res) => setProducts(res.data.slice(0, 8)))
  }, [])

  async function handleAdd(product) {
    await addToCart(product.id, 1)
    setToast(`Added "${product.name}" to cart`)
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Welcome back, {user?.username}</h1>
        {toast && <span className="text-sm text-green-600">{toast}</span>}
      </div>
      <p className="text-slate-500 mb-6">Here's what's trending in the shop today.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />)}
      </div>
    </div>
  )
}
