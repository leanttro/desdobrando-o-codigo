import React, { useState } from 'react'
import { saveGroqKey, hasGroqKey, clearGroqKey } from '../../services/api'

export default function ApiKeyModal({ onClose, required = false }) {
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [step, setStep] = useState(hasGroqKey() ? 'manage' : 'info')

  const handleSave = () => {
    if (!key.trim()) return
    saveGroqKey(key.trim())
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1200)
  }

  const handleRemove = () => {
    clearGroqKey()
    setStep('info')
    setKey('')
  }

  return (
    <div className="modal-overlay" onClick={required ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {step === 'info' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: '#7C3AED22', border: '1px solid #7C3AED44',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22
              }}>🔑</div>
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 2 }}>Sua chave da Groq</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Para usar a análise por IA</p>
              </div>
            </div>

            <div style={{
              background: '#10B98108', border: '1px solid #10B98122',
              borderRadius: 'var(--radius)', padding: '14px 16px',
              fontSize: 13, color: '#86EFAC', marginBottom: 20, lineHeight: 1.7
            }}>
              🔒 <strong>Sua chave fica salva só aqui no seu navegador (localStorage).</strong>
              {' '}Ela nunca é enviada para o nosso servidor nem salva no nosso banco de dados.
              Se trocar de dispositivo ou limpar o navegador, vai precisar colocar de novo.
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Cole sua chave da Groq</label>
              <input
                type="password"
                className="form-input"
                placeholder="gsk_..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                Não tem conta?{' '}
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">
                  Criar conta na Groq →
                </a>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {!required && (
                <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              )}
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!key.trim() || saved}
              >
                {saved ? '✓ Salva!' : 'Salvar chave'}
              </button>
            </div>
          </div>
        )}

        {step === 'manage' && (
          <div className="fade-in">
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Chave da Groq</h2>
            <div className="success-msg" style={{ marginBottom: 20 }}>
              ✓ Você já tem uma chave salva neste navegador.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setStep('info')}>Trocar chave</button>
              <button className="btn btn-danger btn-sm" onClick={handleRemove}>Remover</button>
              <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginLeft: 'auto' }}>Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
