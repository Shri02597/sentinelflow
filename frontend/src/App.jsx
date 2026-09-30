import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ShopLayout from './layouts/ShopLayout.jsx'
import SentinelLayout from './layouts/SentinelLayout.jsx'

import Landing from './pages/public/Landing.jsx'

// Every route past the landing page is split out. The security screens pull in
// recharts (and its d3 / victory-vendor tree, ~1000 modules); importing them
// eagerly made the dev server transform that whole graph before it could paint
// the login form, which is what made Register/Login feel like it hung.
const Login = lazy(() => import('./pages/public/Login.jsx'))
const Register = lazy(() => import('./pages/public/Register.jsx'))

const Home = lazy(() => import('./pages/user/Home.jsx'))
const Search = lazy(() => import('./pages/user/Search.jsx'))
const Profile = lazy(() => import('./pages/user/Profile.jsx'))
const ActivityHistory = lazy(() => import('./pages/user/ActivityHistory.jsx'))

const ProductListing = lazy(() => import('./pages/shop/ProductListing.jsx'))
const ProductDetail = lazy(() => import('./pages/shop/ProductDetail.jsx'))
const Cart = lazy(() => import('./pages/shop/Cart.jsx'))

const SecurityDashboard = lazy(() => import('./pages/security/SecurityDashboard.jsx'))
const SecurityEvents = lazy(() => import('./pages/security/SecurityEvents.jsx'))
const ThreatDetails = lazy(() => import('./pages/security/ThreatDetails.jsx'))
const RiskyUsers = lazy(() => import('./pages/security/RiskyUsers.jsx'))
const UserRiskProfile = lazy(() => import('./pages/security/UserRiskProfile.jsx'))
const BlockedIdentities = lazy(() => import('./pages/security/BlockedIdentities.jsx'))

const UserManagement = lazy(() => import('./pages/admin/UserManagement.jsx'))
const Settings = lazy(() => import('./pages/admin/Settings.jsx'))

function RouteFallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-bg">
      <span className="text-sm text-slate-500">Loading…</span>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ShopFlow — any authenticated role can shop */}
      <Route element={<ProtectedRoute><ShopLayout /></ProtectedRoute>}>
        <Route path="/home" element={<Home />} />
        <Route path="/products" element={<ProductListing />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/search" element={<Search />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/activity" element={<ActivityHistory />} />
      </Route>

      {/* SentinelFlow — analyst / admin only, completely separate visual identity */}
      <Route element={<ProtectedRoute roles={['ANALYST', 'ADMIN']}><SentinelLayout /></ProtectedRoute>}>
        <Route path="/security" element={<SecurityDashboard />} />
        <Route path="/security/events" element={<SecurityEvents />} />
        <Route path="/security/events/:id" element={<ThreatDetails />} />
        <Route path="/security/risky-users" element={<RiskyUsers />} />
        <Route path="/security/containment" element={<BlockedIdentities />} />
        <Route path="/security/users/:userId/risk" element={<UserRiskProfile />} />
      </Route>

      {/* Admin only */}
      <Route element={<ProtectedRoute roles={['ADMIN']}><SentinelLayout /></ProtectedRoute>}>
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
