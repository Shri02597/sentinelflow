import Icon from './Icon.jsx'

const TONES = {
  critical: { ring: 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical', glyph: 'shield' },
  warn: { ring: 'border-severity-medium/25 bg-severity-medium/10 text-severity-medium', glyph: 'warn' },
  good: { ring: 'border-severity-low/25 bg-severity-low/10 text-severity-low', glyph: 'check' },
  info: { ring: 'border-accent/25 bg-accent-soft text-accent', glyph: 'bolt' },
  neutral: { ring: 'border-line bg-bg-raised text-slate-400', glyph: 'inbox' },
}

export default function StatCard({ label, value, tone = 'neutral', hint, icon, className = '' }) {
  const t = TONES[tone] ?? TONES.neutral
  return (
    <div className={`stat group ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="stat-label">{label}</div>
          <div className="stat-value text-slate-50">{value}</div>
          {hint && <div className="mt-1.5 text-2xs text-slate-500 truncate">{hint}</div>}
        </div>
        <span className={`shrink-0 grid place-items-center h-8 w-8 rounded-lg border transition duration-200 ${t.ring}`}>
          <Icon name={icon ?? t.glyph} size={16} />
        </span>
      </div>
    </div>
  )
}
