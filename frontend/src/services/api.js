import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Requests must have a deadline. axios defaults to `timeout: 0`, which means
 * "wait forever" — and a request whose packets are silently dropped (a campus
 * Wi-Fi hiccup, a captive portal) never resolves and never errors. Every
 * loading spinner upstream of that promise then stays up forever: the dashboard
 * renders skeletons that never resolve and no error state is ever reached,
 * because a request that never settles can't fail.
 *
 * This is a per-attempt deadline, and it is not what handles a cold start —
 * a Render free-tier wake takes ~45s, which no sane client-side timeout should
 * be stretched to cover. `useKeepWarm.js` overlaps that boot with page load so
 * the instance is already running by the time a real request goes out. This
 * timeout is only there so that when something does genuinely break, the user
 * gets an error they can act on instead of a blank screen.
 */
const REQUEST_TIMEOUT_MS = 15000

export const api = axios.create({ baseURL: API_URL, timeout: REQUEST_TIMEOUT_MS })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Retry policy for reads. A single blip on a flaky link should not surface as
 * a failed dashboard, so idempotent GETs are retried twice with a short backoff.
 *
 * Writes are deliberately never retried. A retried POST /api/auth/register
 * after a slow-but-successful first attempt would either create a duplicate
 * account or surface a confusing 400 "email already registered" for a
 * registration that actually worked. Failing loudly is the better outcome for
 * something the user explicitly submitted.
 *
 * Note that retrying is only safe for reads because the worst case is bounded
 * at roughly 15s + 1s + 15s + 3s + 15s ≈ 49s before the error finally surfaces.
 * That is acceptable here precisely because the dashboard keeps its last-known
 * data on screen throughout — the screen is never blank while it waits.
 */
const RETRYABLE_METHODS = new Set(['get', 'head', 'options'])
const MAX_READ_RETRIES = 2
const RETRY_BACKOFF_MS = [1000, 3000]

function isWorthRetrying(error) {
  // No response at all means timeout, DNS failure, or a dropped connection.
  if (!error.response) return true
  // 5xx is the server failing, not the request being wrong — safe to repeat.
  return error.response.status >= 500
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// If a request fails with 401, clear the session so the app redirects to login
// rather than looping on stale/expired tokens.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config

    if (config && RETRYABLE_METHODS.has((config.method || 'get').toLowerCase())) {
      config._retryCount = config._retryCount || 0
      if (isWorthRetrying(err) && config._retryCount < MAX_READ_RETRIES) {
        const delay = RETRY_BACKOFF_MS[config._retryCount] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]
        config._retryCount += 1
        await wait(delay)
        return api(config)
      }
    }

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

// --- Attribution + response / containment (analyst/admin) ---
export const getTopThreats = (params) => api.get('/api/security/threats/top', { params })
export const getBlocked = (includeReleased = false) =>
  api.get('/api/security/response/blocked', { params: { include_released: includeReleased } })
export const getResponseActions = (params) => api.get('/api/security/response/actions', { params })
export const raiseResponse = (payload) => api.post('/api/security/response', payload)
export const releaseTarget = ({ target_type, target_key, reason }) =>
  api.post('/api/security/response/release', null, { params: { target_type, target_key, reason } })
export const blockTarget = (payload) => raiseResponse({ ...payload, action: 'BLOCK' })
export const warnTarget = (payload) => raiseResponse({ ...payload, action: 'WARN' })

// --- Notifications (any authenticated role — warnings reach the subject) ---
export const getMyNotifications = (unreadOnly = false) =>
  api.get('/api/security/notifications', { params: { unread_only: unreadOnly } })
export const markNotificationRead = (id) => api.post(`/api/security/notifications/${id}/read`)

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
