import { useEffect, useState } from 'react'
import { getProducts, addToCart } from '../../services/api.js'
import ProductCard from '../../components/ProductCard.jsx'

export default function ProductListing() {
  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    getProducts(category ? { category } : undefined).then((res) => setProducts(res.data))
  }, [category])

  const categories = [...new Set(products.map((p) => p.category))]

  async function handleAdd(product) {
    await addToCart(product.id, 1)
    setToast(`Added "${product.name}" to cart`)
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        {toast && <span className="text-sm text-green-600">{toast}</span>}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setCategory('')}
          className={`px-3 py-1 rounded-full text-sm ${!category ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-sm ${category === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />)}
        {products.length === 0 && <p className="text-slate-500 col-span-full">No products found.</p>}
      </div>
    </div>
  )
}
