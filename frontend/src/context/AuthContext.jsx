import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { saveToken, clearToken, getToken, clearGroqKey } from '../services/api'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, try to restore session from stored token
  useEffect(() => {
    const token = getToken()
    if (token) {
      // Decode payload (no sensitive validation here — server validates on each request)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.sub, email: payload.email, name: payload.name })
        } else {
          clearToken()
        }
      } catch {
        clearToken()
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token, user: userData } = res.data
    saveToken(token)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data)
    const { token, user: userData } = res.data
    saveToken(token)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    clearToken()
    clearGroqKey()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
