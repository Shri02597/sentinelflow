import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If a request fails with 401, clear the session so the app redirects to login
// rather than looping on stale/expired tokens.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sf_access_token')
      localStorage.removeItem('sf_refresh_token')
      localStorage.removeItem('sf_user')
    }
    return Promise.reject(err)
  }
)

// --- Auth ---
export const registerUser = (payload) => api.post('/api/auth/register', payload)
export const loginUser = (payload) => api.post('/api/auth/login', payload)
export const getMe = () => api.get('/api/auth/me')

// --- Products (e-commerce) ---
export const getProducts = (params) => api.get('/api/products', { params })
export const getProduct = (id) => api.get(`/api/products/${id}`)
export const searchProducts = (q) => api.get('/api/products/search', { params: { q } })

// --- Cart (e-commerce) ---
export const getCart = () => api.get('/api/cart')
export const addToCart = (productId, quantity = 1) => api.post('/api/cart', { product_id: productId, quantity })
export const removeFromCart = (itemId) => api.delete(`/api/cart/${itemId}`)

// --- Security dashboard (analyst/admin) ---
export const getEvents = (params) => api.get('/api/security/events', { params })
export const getEvent = (id) => api.get(`/api/security/events/${id}`)
export const updateEvent = (id, payload) => api.patch(`/api/security/events/${id}`, payload)
export const getRelatedRequests = (id) => api.get(`/api/security/events/${id}/related-requests`)
export const addIncidentNote = (id, note) => api.post(`/api/security/events/${id}/notes`, { note })
export const getEventNotes = (id) => api.get(`/api/security/events/${id}/notes`)
export const getStats = () => api.get('/api/security/stats')
export const getTraffic = (minutes = 60) => api.get('/api/security/traffic', { params: { minutes } })
export const getRiskyUsers = () => api.get('/api/security/risky-users')

// --- Users / risk ---
export const getMyActivity = (limit = 100) => api.get('/api/users/me/activity', { params: { limit } })
export const getUserRisk = (userId) => api.get(`/api/users/${userId}/risk`)
export const getUserActivity = (userId) => api.get(`/api/users/${userId}/activity`)
export const getUserStats = (userId) => api.get(`/api/users/${userId}/stats`)

// --- Admin ---
export const getAdminUsers = () => api.get('/api/admin/users')
export const updateUserRole = (userId, role) => api.patch(`/api/admin/users/${userId}/role`, { role })
export const updateUserActive = (userId, is_active) => api.patch(`/api/admin/users/${userId}/active`, { is_active })
export const getDetectionSettings = () => api.get('/api/admin/settings')
export const updateDetectionSettings = (payload) => api.patch('/api/admin/settings', payload)
