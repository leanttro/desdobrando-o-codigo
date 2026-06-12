import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ApiKeyModal from '../Shared/ApiKeyModal'
import './Auth.css'

export default function Register() {
  const { register, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      const { name, email, whatsapp, password } = form
      await register({ name, email, whatsapp, password })
      setShowKeyModal(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <>
      <div className="auth-page">
        <div className="auth-card card-glow fade-in">
          <div className="auth-logo">
            <span className="logo-bracket">{`{`}</span>
            desdobrando
            <span className="logo-bracket">{`}`}</span>
          </div>
          <h1 className="auth-title">Criar conta</h1>
          <p className="auth-sub">Grátis. Sem cartão.</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label className="form-label">Nome</label>
              <input type="text" className="form-input" placeholder="Seu nome" value={form.name} onChange={set('name')} required autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" placeholder="seu@email.com" value={form.email} onChange={set('email')} required />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(opcional)</span></label>
              <input type="tel" className="form-input" placeholder="+55 11 99999-9999" value={form.whatsapp} onChange={set('whatsapp')} />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input type="password" className="form-input" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} required />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar senha</label>
              <input type="password" className="form-input" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? <><span className="spinner" />Criando conta...</> : 'Criar conta'}
            </button>
          </form>

          <p className="auth-footer">
            Já tem conta? <Link to="/login">Entrar →</Link>
          </p>
        </div>
      </div>

      {showKeyModal && (
        <ApiKeyModal required onClose={() => navigate('/dashboard')} />
      )}
    </>
  )
}
