import axios from 'axios'

const BACKEND_URL = 'https://novo.leanttro.com'
const GROQ_KEY_STORAGE = 'groq_api_key'
const JWT_STORAGE = 'auth_token'

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,
})

// ── Request interceptor ──────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Inject JWT
    const token = localStorage.getItem(JWT_STORAGE)
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    // Inject Groq key — read fresh every request, never cached in memory
    const groqKey = localStorage.getItem(GROQ_KEY_STORAGE)
    if (groqKey) {
      config.headers['X-Groq-Key'] = groqKey
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(JWT_STORAGE)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const hasGroqKey = () => !!localStorage.getItem(GROQ_KEY_STORAGE)
export const saveGroqKey = (key) => localStorage.setItem(GROQ_KEY_STORAGE, key)
export const clearGroqKey = () => localStorage.removeItem(GROQ_KEY_STORAGE)

export const saveToken = (token) => localStorage.setItem(JWT_STORAGE, token)
export const clearToken = () => localStorage.removeItem(JWT_STORAGE)
export const getToken = () => localStorage.getItem(JWT_STORAGE)

export default api
