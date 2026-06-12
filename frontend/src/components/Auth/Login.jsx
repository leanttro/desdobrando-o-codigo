import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ApiKeyModal from '../Shared/ApiKeyModal'
import { hasGroqKey } from '../../services/api'
import './Auth.css'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      if (!hasGroqKey()) {
        setShowKeyModal(true)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="auth-page">
        <div className="auth-card card-glow fade-in">
          <div className="auth-logo">
            <span className="logo-bracket">{`{`}</span>
            desdobrando
            <span className="logo-bracket">{`}`}</span>
          </div>
          <h1 className="auth-title">Entrar na conta</h1>
          <p className="auth-sub">Bem-vindo de volta</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? <><span className="spinner" />Entrando...</> : 'Entrar'}
            </button>
          </form>

          <p className="auth-footer">
            Não tem conta?{' '}
            <Link to="/register">Cadastre-se grátis →</Link>
          </p>
        </div>
      </div>

      {showKeyModal && (
        <ApiKeyModal
          required
          onClose={() => navigate('/dashboard')}
        />
      )}
    </>
  )
}
