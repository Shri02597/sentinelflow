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
    localStorage.setItem('sf_access_token', res.data.access_token)
    localStorage.setItem('sf_refresh_token', res.data.refresh_token)
    const me = await getMe()
    setUser(me.data)
    localStorage.setItem('sf_user', JSON.stringify(me.data))
    return me.data
  }

  async function register(email, username, password) {
    await registerUser({ email, username, password })
    return login(email, password)
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
