import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { saveToken, clearToken, getToken, saveGroqKey, clearGroqKey } from '../services/api'
import api from '../services/api'

const GROQ_KEY_STORAGE = 'groq_api_key'
const USER_STORAGE = 'auth_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem(GROQ_KEY_STORAGE) || '')

  useEffect(() => {
    const token = getToken()
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          // Tenta recuperar userData completo do localStorage (inclui is_admin)
          const stored = localStorage.getItem(USER_STORAGE)
          if (stored) {
            setUser(JSON.parse(stored))
          } else {
            // Fallback: só o que está no payload do JWT
            setUser({ id: payload.sub })
          }
        } else {
          clearToken()
          localStorage.removeItem(USER_STORAGE)
        }
      } catch {
        clearToken()
        localStorage.removeItem(USER_STORAGE)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token, user: userData } = res.data
    saveToken(token)
    // Persiste userData completo (com is_admin) no localStorage
    localStorage.setItem(USER_STORAGE, JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data)
    const { token, user: userData } = res.data
    saveToken(token)
    localStorage.setItem(USER_STORAGE, JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    clearToken()
    clearGroqKey()
    localStorage.removeItem(USER_STORAGE)
    setUser(null)
    setGroqKey('')
  }, [])

  const updateGroqKey = useCallback((key) => {
    saveGroqKey(key)
    setGroqKey(key)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, groqKey, updateGroqKey }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
