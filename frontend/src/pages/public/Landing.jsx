import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'

const FEATURES = [
  { icon: 'shield', title: 'Every request scored', body: 'Five detectors run on every request and roll into a single 0–100 risk score.' },
  { icon: 'bolt', title: 'Automatic response', body: 'High-risk sources are warned at 60 and blocked at 80 — no analyst required.' },
  { icon: 'events', title: 'Live attack feed', body: 'Detections stream to analysts over a WebSocket, with polling as a fallback.' },
  { icon: 'inbox', title: 'Full audit trail', body: 'Every warn, block and release is recorded with its reason and author.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-grid-faint bg-[length:32px_32px] opacity-50" />
        <div className="absolute -left-20 -top-24 h-96 w-96 rounded-full bg-shop-500/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <nav className="flex h-16 items-center justify-between">
            <span className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-sheen text-accent">
                <Icon name="shield" size={17} />
              </span>
              <span className="text-base font-bold tracking-tight text-white">SentinelFlow</span>
            </span>
            <div className="flex items-center gap-2">
              <Link to="/login" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
                Sign in
              </Link>
              <Link to="/register" className="rounded-lg bg-shop-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-shop-700">
                Get started
              </Link>
            </div>
          </nav>

          <div className="py-20 text-center sm:py-28">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-slate-300">
              <Icon name="bolt" size={12} className="text-accent" />
              Security operations that act
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
              A real shop. A real-time security engine. <span className="text-shop-400">No simulate button.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400">
              ShopFlow is a working storefront that is deliberately vulnerable. Register, browse, search
              and buy — and every request is scored, detected and surfaced to a live analyst console.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register" className="rounded-lg bg-shop-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-shop-700 active:scale-95">
                Create an account
              </Link>
              <Link to="/login" className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5 active:scale-95">
                I already have one
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink">How it works</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            There is no attack button anywhere in this product. The login form, the search box and the
            product endpoints are the attack surface, so the detectors are driven by real traffic.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-xl border border-slate-200 bg-white p-5 transition duration-200 hover:border-shop-200 hover:shadow-md">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-shop-50 text-shop-600 transition group-hover:bg-shop-600 group-hover:text-white">
                <Icon name={f.icon} size={17} />
              </span>
              <h3 className="mt-4 text-sm font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-xl font-bold tracking-tight text-ink">Try breaking it</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-soft">
            Fail the login six times in a row, or search for something like
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs text-severity-critical ring-1 ring-slate-200">' OR 1=1 --</code>
            and watch the analyst console react.
          </p>
          <Link to="/register" className="mt-6 inline-flex rounded-lg bg-shop-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-shop-700">
            Start the demo
          </Link>
        </div>
      </div>

      <footer className="border-t border-slate-200 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-ink-faint">
          <span>ShopFlow + SentinelFlow — a detection and response demo</span>
          <span className="flex items-center gap-1.5">
            <Icon name="shield" size={12} />
            Intentionally vulnerable
          </span>
        </div>
      </footer>
    </div>
  )
}
