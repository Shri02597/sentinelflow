import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LiveFeedProvider } from './context/LiveFeedContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
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
  </React.StrictMode>,
)
