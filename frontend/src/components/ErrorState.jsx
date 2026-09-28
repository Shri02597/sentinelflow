import Icon from './Icon.jsx'

/**
 * Rendered when a fetch fails. Without this, a dropped connection looks
 * identical to "no data yet" — an empty table reads as "nothing is wrong",
 * which is the worst possible thing for a security console to imply.
 */
export default function ErrorState({ message = 'Could not load this data.', onRetry, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-severity-critical/30 bg-severity-critical/8 ${className}`}>
      <span className="flex items-center gap-2.5 text-xs text-severity-critical min-w-0">
        <Icon name="warn" size={15} className="shrink-0" />
        {message}
      </span>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-danger btn-sm shrink-0">
          <Icon name="refresh" size={12} />Retry
        </button>
      )}
    </div>
  )
}
