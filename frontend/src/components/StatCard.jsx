export default function StatCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'text-slate-100',
    critical: 'text-severity-critical',
    accent: 'text-accent',
  }[tone]
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}
