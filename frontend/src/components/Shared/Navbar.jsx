import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ApiKeyModal from './ApiKeyModal'
import { hasGroqKey } from '../../services/api'

import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const active = (path) => location.pathname === path ? 'nav-link active' : 'nav-link'

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <span className="logo-bracket">{`{`}</span>
            desdobrando
            <span className="logo-bracket">{`}`}</span>
          </Link>

          <nav className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
            {user ? (
              <>
                <Link to="/dashboard" className={active('/dashboard')} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <Link to="/analyze"   className={active('/analyze')}   onClick={() => setMobileOpen(false)}>Código</Link>
                <Link to="/n8n"       className={active('/n8n')}       onClick={() => setMobileOpen(false)}>n8n</Link>
                <Link to="/errors"    className={active('/errors')}    onClick={() => setMobileOpen(false)}>Erros</Link>
                <Link to="/glossary"  className={active('/glossary')}  onClick={() => setMobileOpen(false)}>Glossário</Link>
              </>
            ) : (
              <>
                <Link to="/glossary" className={active('/glossary')} onClick={() => setMobileOpen(false)}>Glossário</Link>
              </>
            )}
          </nav>

          <div className="navbar-actions">
            {user ? (
              <>
                <button
                  className="btn btn-ghost btn-sm key-btn"
                  onClick={() => setShowKeyModal(true)}
                  title="Gerenciar chave Groq"
                >
                  <span className={`key-dot ${hasGroqKey() ? 'green' : 'red'}`} />
                  Chave API
                </button>
                <button className="btn btn-outline btn-sm" onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn btn-ghost btn-sm">Entrar</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Cadastrar</Link>
              </>
            )}
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {showKeyModal && (
        <ApiKeyModal onClose={() => setShowKeyModal(false)} />
      )}
    </>
  )
}
