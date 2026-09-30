import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LiveFeedProvider } from './context/LiveFeedContext.jsx'
import { useKeepWarm } from './hooks/useKeepWarm.js'
import './index.css'

function Root() {
  // The free-tier backend sleeps after ~15 minutes idle and takes ~45s to wake.
  // Warming it as soon as the app loads overlaps that boot with the user filling
  // in the login form, so authentication isn't what pays for it.
  useKeepWarm()

  return (
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          {/* Above the router so the live connection survives navigation between
              console screens instead of being torn down and re-established on
              every route change. */}
          <LiveFeedProvider>
            <App />
          </LiveFeedProvider>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

// Outermost boundary: a render error anywhere below would otherwise blank the
// entire page with no way back.
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Root />
  </ErrorBoundary>,
)
