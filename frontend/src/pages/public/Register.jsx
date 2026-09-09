import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(form.email, form.username, form.password)
      navigate('/home')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 border border-slate-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-indigo-600">Create your ShopFlow account</h2>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <input placeholder="Username" value={form.username} required onChange={update('username')}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
        <input type="email" placeholder="Email" value={form.email} required onChange={update('email')}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
        <input type="password" placeholder="Password (min 8 chars)" value={form.password} required minLength={8} onChange={update('password')}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
        <button disabled={busy} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-sm text-slate-500 text-center">
          Already have an account? <Link to="/login" className="text-indigo-600">Log in</Link>
        </p>
      </form>
    </div>
  )
}
