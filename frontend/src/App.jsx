import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ShopLayout from './layouts/ShopLayout.jsx'
import SentinelLayout from './layouts/SentinelLayout.jsx'

import Landing from './pages/public/Landing.jsx'
import Login from './pages/public/Login.jsx'
import Register from './pages/public/Register.jsx'

import Home from './pages/user/Home.jsx'
import Search from './pages/user/Search.jsx'
import Profile from './pages/user/Profile.jsx'
import ActivityHistory from './pages/user/ActivityHistory.jsx'

import ProductListing from './pages/shop/ProductListing.jsx'
import ProductDetail from './pages/shop/ProductDetail.jsx'
import Cart from './pages/shop/Cart.jsx'

import SecurityDashboard from './pages/security/SecurityDashboard.jsx'
import SecurityEvents from './pages/security/SecurityEvents.jsx'
import ThreatDetails from './pages/security/ThreatDetails.jsx'
import RiskyUsers from './pages/security/RiskyUsers.jsx'
import UserRiskProfile from './pages/security/UserRiskProfile.jsx'

import UserManagement from './pages/admin/UserManagement.jsx'
import Settings from './pages/admin/Settings.jsx'

export default function App() {
  return (
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
        <Route path="/security/users/:userId/risk" element={<UserRiskProfile />} />
      </Route>

      {/* Admin only */}
      <Route element={<ProtectedRoute roles={['ADMIN']}><SentinelLayout /></ProtectedRoute>}>
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
