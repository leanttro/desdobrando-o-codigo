import React, { useEffect, useState, useCallback } from 'react'
import { getMetrics, getUsers, getUserDetail, deleteUser, toggleBlockUser, togglePlatformKey } from '../../services/adminApi'

// ── Ícones inline (sem dependência extra) ───────────────
const Icon = {
  users:    () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  chart:    () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  week:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  code:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  trash:    () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  block:    () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  eye:      () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  close:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevron:  () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  back:     () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
  shield:   () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  key:      () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
}

// ── Utilitários ─────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function MetricCard({ icon: Ic, label, value, accent }) {
  const colors = {
    purple: { bg: '#7C3AED18', border: '#7C3AED44', color: '#A78BFA' },
    green:  { bg: '#10B98118', border: '#10B98144', color: '#10B981' },
    yellow: { bg: '#F59E0B18', border: '#F59E0B44', color: '#F59E0B' },
    blue:   { bg: '#3B82F618', border: '#3B82F644', color: '#60A5FA' },
  }
  const c = colors[accent] || colors.purple
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: c.bg, border: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color,
      }}>
        <Ic />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          {value ?? '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

// ── Modal de confirmação ────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel, danger }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <p style={{ marginBottom: 24, color: 'var(--text)', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
          <button
            className={danger ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm'}
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de detalhe do usuário ─────────────────────────
function UserDetailModal({ userId, onClose, onDelete, onBlock }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getUserDetail(userId)
      .then(setData)
      .catch(() => setError('Não foi possível carregar os dados.'))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Detalhes do usuário</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}><Icon.close /></button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>}
        {error && <p className="error-msg">{error}</p>}

        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                ['Nome', data.user.name],
                ['E-mail', data.user.email],
                ['WhatsApp', data.user.whatsapp || '—'],
                ['Cadastro', formatDate(data.user.created_at)],
                ['Admin', data.user.is_admin ? 'Sim' : 'Não'],
                ['Total de análises', data.total_analyses],
              ].map(([label, val]) => (
                <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text)', wordBreak: 'break-all' }}>{String(val)}</div>
                </div>
              ))}
            </div>

            {data.analyses.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Últimas análises
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {data.analyses.map(a => (
                    <div key={a.id} style={{
                      background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.title || 'Sem título'}
                      </span>
                      <span className={`badge ${a.type === 'code' ? 'badge-purple' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                        {a.type}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => { onBlock(data.user); onClose() }}>
                <Icon.block /> Revogar admin
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => { onDelete(data.user); onClose() }}>
                <Icon.trash /> Deletar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────
export default function AdminPanel() {
  const [metrics, setMetrics]         = useState(null)
  const [users, setUsers]             = useState([])
  const [pagination, setPagination]   = useState({ page: 1, pages: 1, total: 0 })
  const [metricsLoading, setML]       = useState(true)
  const [usersLoading, setUL]         = useState(true)
  const [error, setError]             = useState(null)

  const [selectedUser, setSelectedUser] = useState(null)   // modal detalhe
  const [confirm, setConfirm]           = useState(null)   // modal confirmação

  // ── Fetch métricas ──
  useEffect(() => {
    getMetrics()
      .then(setMetrics)
      .catch(() => setError('Erro ao carregar métricas.'))
      .finally(() => setML(false))
  }, [])

  // ── Fetch usuários ──
  const fetchUsers = useCallback((page = 1) => {
    setUL(true)
    getUsers(page)
      .then(data => {
        setUsers(data.users)
        setPagination({ page: data.page, pages: data.pages, total: data.total })
      })
      .catch(() => setError('Erro ao carregar usuários.'))
      .finally(() => setUL(false))
  }, [])

  useEffect(() => { fetchUsers(1) }, [fetchUsers])

  // ── Ações ──
  const handleDelete = useCallback((user) => {
    setConfirm({
      message: `Deletar permanentemente ${user.email}? Todos os dados serão removidos.`,
      danger: true,
      onConfirm: async () => {
        try {
          await deleteUser(user.id)
          setConfirm(null)
          fetchUsers(pagination.page)
        } catch (e) {
          setError(e?.response?.data?.error || 'Erro ao deletar usuário.')
          setConfirm(null)
        }
      },
    })
  }, [fetchUsers, pagination.page])

  const handleBlock = useCallback((user) => {
    setConfirm({
      message: `Revogar permissões de admin de ${user.email}?`,
      danger: false,
      onConfirm: async () => {
        try {
          await toggleBlockUser(user.id)
          setConfirm(null)
          fetchUsers(pagination.page)
        } catch (e) {
          setError(e?.response?.data?.error || 'Erro ao bloquear usuário.')
          setConfirm(null)
        }
      },
    })
  }, [fetchUsers, pagination.page])

  const handlePlatformKey = useCallback(async (user) => {
    try {
      await togglePlatformKey(user.id)
      fetchUsers(pagination.page)
    } catch (e) {
      setError(e?.response?.data?.error || 'Erro ao atualizar chave da plataforma.')
    }
  }, [fetchUsers, pagination.page])

  // ── Render ──
  return (
    <div className="page-wrapper">
      <div className="container">

        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#7C3AED22', border: '1px solid #7C3AED44',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple-light)',
          }}>
            <Icon.shield />
          </div>
          <div>
            <h1>Painel Admin</h1>
            <p>Gerencie usuários e monitore o uso da plataforma.</p>
          </div>
        </div>

        {error && (
          <div className="error-msg" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}
            <button className="btn btn-ghost btn-sm" onClick={() => setError(null)} style={{ padding: 4 }}><Icon.close /></button>
          </div>
        )}

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {metricsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, height: 84 }} />
            ))
          ) : metrics ? (
            <>
              <MetricCard icon={Icon.users}  label="Total de usuários"       value={metrics.total_users}            accent="purple" />
              <MetricCard icon={Icon.chart}  label="Total de análises"       value={metrics.total_analyses}         accent="blue"   />
              <MetricCard icon={Icon.week}   label="Novos nos últimos 7 dias" value={metrics.new_users_last_7_days}  accent="green"  />
              <MetricCard icon={Icon.code}   label="Análises de código"      value={metrics.analyses_by_type?.code ?? 0} accent="yellow" />
            </>
          ) : null}
        </div>

        {/* Tabela de usuários */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 15, fontFamily: 'var(--font-display)' }}>
              Usuários {!usersLoading && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pagination.total})</span>}
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => fetchUsers(pagination.page)}>
              Atualizar
            </button>
          </div>

          {usersLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Nome', 'E-mail', 'WhatsApp', 'Cadastro', 'Admin', 'Chave Plataforma', 'Ações'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left',
                        color: 'var(--text-muted)', fontWeight: 500,
                        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
                        fontFamily: 'var(--font-display)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{
                      borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{u.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.whatsapp || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.is_admin
                          ? <span className="badge badge-purple">Admin</span>
                          : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title={u.uses_platform_key ? 'Usando chave da plataforma — clique para desativar' : 'Usando chave própria — clique para ativar chave da plataforma'}
                          onClick={() => handlePlatformKey(u)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 999,
                            background: u.uses_platform_key ? '#10B98118' : 'transparent',
                            border: `1px solid ${u.uses_platform_key ? '#10B98144' : 'var(--border)'}`,
                            color: u.uses_platform_key ? '#10B981' : 'var(--text-dim)',
                          }}
                        >
                          <Icon.key />
                          {u.uses_platform_key ? 'Ativada' : 'Desativada'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" title="Ver detalhes" onClick={() => setSelectedUser(u.id)} style={{ padding: '5px 8px', color: 'var(--text-muted)' }}>
                            <Icon.eye />
                          </button>
                          {u.is_admin && (
                            <button className="btn btn-ghost btn-sm" title="Revogar admin" onClick={() => handleBlock(u)} style={{ padding: '5px 8px', color: 'var(--yellow)' }}>
                              <Icon.block />
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" title="Deletar" onClick={() => handleDelete(u)} style={{ padding: '5px 8px', color: 'var(--red)' }}>
                            <Icon.trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {pagination.pages > 1 && (
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Página {pagination.page} de {pagination.pages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchUsers(pagination.page - 1)}
                >
                  <Icon.back /> Anterior
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchUsers(pagination.page + 1)}
                >
                  Próxima <Icon.chevron />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modais */}
      {selectedUser && (
        <UserDetailModal
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
          onDelete={handleDelete}
          onBlock={handleBlock}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
