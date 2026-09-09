import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-4xl font-bold text-indigo-600 mb-1">ShopFlow</h1>
      <p className="text-sm text-slate-400 mb-4">secured by SentinelFlow</p>
      <p className="text-slate-500 max-w-xl mb-8">
        A real online shop — register, browse, search, and buy — with a
        real-time security engine watching every request behind the scenes.
        Suspicious behavior is detected, scored, and surfaced to analysts
        automatically, no simulate button required.
      </p>
      <div className="space-x-4">
        <Link to="/register" className="bg-indigo-600 text-white font-semibold px-5 py-2 rounded-full hover:bg-indigo-700">
          Get Started
        </Link>
        <Link to="/login" className="border border-slate-300 px-5 py-2 rounded-full hover:border-indigo-400">
          Login
        </Link>
      </div>
    </div>
  )
}
