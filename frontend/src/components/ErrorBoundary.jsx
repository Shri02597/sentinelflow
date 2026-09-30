import { Component } from 'react'
import Icon from './Icon.jsx'

/**
 * Catches render-time crashes anywhere below it and shows a recoverable screen
 * instead of a blank white page.
 *
 * A React render error unmounts the entire tree. With no boundary, the only
 * thing the user sees is an empty viewport — indistinguishable from a dead
 * network or a failed deploy, and impossible to recover from without a manual
 * reload. That is the worst possible failure for a live demo: nothing explains
 * what happened and nothing on screen responds.
 *
 * This deliberately does NOT catch errors in event handlers or async fetches —
 * those surface through their own error states (see ErrorState and
 * apiErrorMessage). It exists purely for the render path.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.handleReset = this.handleReset.bind(this)
    this.handleReload = this.handleReload.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for whoever is debugging, but never render
    // a raw stack trace on screen — it is noise to a user and leaks internals.
    console.error('Unhandled render error', error, info)
  }

  handleReset() {
    this.setState({ error: null })
  }

  handleReload() {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen grid place-items-center bg-bg px-6">
        <div className="w-full max-w-md card text-center">
          <div className="flex items-center justify-center h-11 w-11 mx-auto rounded-xl bg-severity-critical/10 border border-severity-critical/30 text-severity-critical">
            <Icon name="warn" size={20} />
          </div>
          <h1 className="mt-4 text-base font-bold tracking-tight text-slate-50">
            Something broke on this screen
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            The rest of the app is still running. Try again, and if it keeps
            happening reload the page.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2.5">
            <button onClick={this.handleReset} className="btn btn-primary">
              <Icon name="refresh" size={14} />
              Try again
            </button>
            <button onClick={this.handleReload} className="btn">
              Reload page
            </button>
          </div>

          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-2xs text-slate-600 hover:text-slate-400">
              Technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-bg-sunken p-3 text-2xs text-slate-500 whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
