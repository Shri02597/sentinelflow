import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchProducts, addToCart } from '../../services/api.js'
import ProductCard from '../../components/ProductCard.jsx'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [q, setQ] = useState(initialQ)
  const [results, setResults] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (initialQ) runSearch(initialQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ])

  async function runSearch(query) {
    const res = await searchProducts(query)
    setResults(res.data)
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!q.trim()) return
    setSearchParams({ q: q.trim() })
    runSearch(q.trim())
  }

  async function handleAdd(product) {
    await addToCart(product.id, 1)
    setToast(`Added "${product.name}" to cart`)
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Search Products</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-md">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for anything…"
          className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <button className="bg-indigo-600 text-white font-semibold px-5 py-2 rounded-full hover:bg-indigo-700">
          Search
        </button>
      </form>
      {toast && <p className="text-sm text-green-600 mb-4">{toast}</p>}
      {results && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {results.length === 0 && <p className="text-slate-500 col-span-full">No products matched your search.</p>}
          {results.map((p) => <ProductCard key={p.id} product={p} onAddToCart={handleAdd} />)}
        </div>
      )}
    </div>
  )
}
