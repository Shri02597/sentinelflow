import { createContext, useContext, useEffect, useState } from 'react'
import { loginUser, registerUser, getMe } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('sf_user')
    return cached ? JSON.parse(cached) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('sf_access_token')
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then((res) => {
        setUser(res.data)
        localStorage.setItem('sf_user', JSON.stringify(res.data))
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await loginUser({ email, password })
    const { access_token, refresh_token, user: profile } = res.data
    localStorage.setItem('sf_access_token', access_token)
    localStorage.setItem('sf_refresh_token', refresh_token)

    // The server already had the profile in hand, so there is no reason to spend
    // another round trip asking for it. Fall back to /me only against an older
    // backend that doesn't return the user inline.
    let resolved = profile
    if (!resolved) {
      const me = await getMe()
      resolved = me.data
    }

    setUser(resolved)
    localStorage.setItem('sf_user', JSON.stringify(resolved))
    return resolved
  }

  async function register(email, username, password) {
    const res = await registerUser({ email, username, password })
    // The API signs the new account in as part of registration. Falling back to
    // a separate login call only matters if a deployment returns the bare user.
    const token = res.data.access_token
    if (!token) return login(email, password)

    localStorage.setItem('sf_access_token', token)
    localStorage.setItem('sf_refresh_token', res.data.refresh_token)
    const { access_token, refresh_token, ...profile } = res.data
    localStorage.setItem('sf_user', JSON.stringify(profile))
    setUser(profile)
    return profile
  }

  function logout() {
    localStorage.removeItem('sf_access_token')
    localStorage.removeItem('sf_refresh_token')
    localStorage.removeItem('sf_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
