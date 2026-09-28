// Severity drives colour, but the glyph carries the meaning too — colour alone
// is unreadable for colour-blind users and invisible in a screenshot.
const MAP = {
  LOW: { cls: 'badge-LOW', icon: 'check', dot: 'bg-severity-low' },
  MEDIUM: { cls: 'badge-MEDIUM', icon: 'warn', dot: 'bg-severity-medium' },
  HIGH: { cls: 'badge-HIGH', icon: 'bolt', dot: 'bg-severity-high' },
  CRITICAL: { cls: 'badge-CRITICAL', icon: 'shield', dot: 'bg-severity-critical' },
}

import Icon from './Icon.jsx'

export default function Badge({ level, children, icon = true, className = '' }) {
  const norm = String(level ?? '').toUpperCase()
  const cfg = MAP[norm]
  if (!cfg) {
    return <span className={`badge badge-neutral ${className}`}>{children ?? level}</span>
  }
  return (
    <span className={`badge ${cfg.cls} ${norm === 'CRITICAL' ? 'shadow-glow-critical' : ''} ${className}`}>
      {icon && <Icon name={cfg.icon} size={11} />}
      {children ?? norm}
    </span>
  )
}
