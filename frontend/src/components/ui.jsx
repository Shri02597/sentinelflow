import Icon from './Icon.jsx'

export function Button({ variant = 'ghost', size, icon, iconRight, children, className = '', ...rest }) {
  const v = { primary: 'btn-primary', danger: 'btn-danger', warn: 'btn-warn', ghost: 'btn-ghost' }[variant] ?? 'btn-ghost'
  return (
    <button type="button" className={`${v} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  )
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <span className="grid place-items-center h-12 w-12 rounded-xl bg-bg-raised border border-line text-slate-500">
        <Icon name="inbox" size={22} />
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-300">{title}</div>
        {hint && <div className="mt-1 text-xs text-slate-500 max-w-sm">{hint}</div>}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} />
}

export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-50">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
