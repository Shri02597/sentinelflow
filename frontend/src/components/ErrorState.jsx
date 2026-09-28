/**
 * Rendered when a fetch fails. Without this, a dropped connection looks
 * identical to "no data yet" — an empty table reads as "nothing is wrong",
 * which is the worst possible thing for a security console to imply.
 */
export default function ErrorState({ message = 'Could not load this data.', onRetry, className = '' }) {
  return (
    <div className={`card border-red-900/60 bg-red-950/20 flex items-center justify-between gap-3 text-sm ${className}`}>
      <span className="text-red-300">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 px-3 py-1 rounded-lg border border-red-800 text-red-300 hover:bg-red-900/40"
        >
          Retry
        </button>
      )}
    </div>
  )
}
