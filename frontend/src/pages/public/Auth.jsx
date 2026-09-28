import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../../components/Icon.jsx'

/**
 * Split-screen: the pitch on the left, the form on the right. On mobile the
 * pitch collapses, because a 200-word manifesto above a login box is a wall.
 */
function Frame({ title, subtitle, error, children, footer, busy, onSubmit, buttonLabel }) {
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-bg-sunken overflow-hidden">
        <div className="absolute inset-0 bg-grid-faint bg-[length:32px_32px] opacity-60" />
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2.5">
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-accent-sheen border border-accent/30 text-accent">
              <Icon name="shield" size={18} />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-50">SentinelFlow</span>
          </span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 leading-tight">
            Security operations that <span className="text-accent">act</span>, not just alert.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Scores every request as it happens, ranks the worst offender, and warns or blocks
            the source automatically — while the console stays up so you can still see what's going on.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              ['shield', 'Weighted risk scoring across five detectors'],
              ['bolt', 'Automatic warn at 60, block at 80'],
              ['unlock', 'Analyst console never locks itself out'],
              ['wifi', 'WebSocket with REST polling fallback'],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="grid place-items-center h-7 w-7 shrink-0 rounded-lg bg-accent-soft border border-accent/25 text-accent">
                  <Icon name={icon} size={14} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-2xs text-slate-600">Demo environment · activity is monitored by design</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-accent-sheen border border-accent/30 text-accent">
              <Icon name="shield" size={18} />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-50">SentinelFlow</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}

          {error && (
            <div className="mt-5 flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-severity-critical/30 bg-severity-critical/10">
              <Icon name="warn" size={15} className="text-severity-critical shrink-0 mt-px" />
              <span className="text-xs text-severity-critical">{error}</span>
            </div>
          )}

          <div className="mt-6 space-y-4">{children}</div>

          <button disabled={busy} className="btn btn-primary w-full mt-6">
            {busy ? 'Please wait…' : buttonLabel}
            {!busy && <Icon name="arrow" size={15} />}
          </button>

          <div className="mt-5 text-center text-xs text-slate-500">{footer}</div>
        </form>
      </div>
    </div>
  )
}

export function Field({ label, icon, ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {icon && <Icon name={icon} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />}
        <input className={`input ${icon ? 'pl-9' : ''}`} {...rest} />
      </div>
    </div>
  )
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const me = await login(email, password)
      navigate(me.role === 'USER' ? '/home' : '/security')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Frame
      title="Sign in"
      subtitle="Analysts and administrators access the console here."
      error={error}
      busy={busy}
      onSubmit={handleSubmit}
      buttonLabel="Sign in"
      footer={<>No account? <Link to="/register" className="link font-semibold">Create one</Link></>}
    >
      <Field label="Email" icon="user" type="email" placeholder="analyst@sentinelflow.dev" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <Field label="Password" icon="key" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
    </Frame>
  )
}

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(form)
      navigate('/home')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Frame
      title="Create an account"
      subtitle="ShopFlow accounts are monitored for suspicious activity by design."
      error={error}
      busy={busy}
      onSubmit={handleSubmit}
      buttonLabel="Create account"
      footer={<>Already registered? <Link to="/login" className="link font-semibold">Sign in</Link></>}
    >
      <Field label="Username" icon="user" placeholder="shopper" value={form.username} onChange={set('username')} required autoComplete="username" />
      <Field label="Email" icon="globe" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required autoComplete="email" />
      <Field label="Password" icon="key" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required autoComplete="new-password" />
    </Frame>
  )
}
