import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './InterviewMode.css';

const scoreColor = (score) => {
  if (score >= 8) return '#4ade80';
  if (score >= 5) return '#facc15';
  return '#f87171';
};

function InterviewDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/interview/session/${sessionId}`);
        setSession(res.data);
      } catch {
        setError('Não foi possível carregar esse simulado.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="interview__loading">
        <div className="spinner" />
        <p>Carregando simulado...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="interview interview--done">
        <p className="interview__error">{error || 'Simulado não encontrado.'}</p>
        <button className="interview__restart" onClick={() => navigate('/dashboard')}>
          ← Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const results = session.results || [];
  const avg = session.score_avg ?? (
    results.length
      ? (results.reduce((s, r) => s + (r.feedback?.score || 0), 0) / results.length).toFixed(1)
      : null
  );

  return (
    <div className="interview interview--done">
      <button
        className="interview__back"
        onClick={() => navigate(`/history/${session.analysis_id}`)}
      >
        ← Voltar à análise
      </button>

      <h1>Resultado do Simulado 🎯</h1>

      {session.created_at && (
        <p style={{ color: 'var(--color-text-muted, #888)', marginBottom: '0.5rem' }}>
          {new Date(session.created_at).toLocaleString('pt-BR')}
        </p>
      )}

      {avg !== null && (
        <div
          className="interview__avg-score"
          style={{ color: scoreColor(parseFloat(avg)) }}
        >
          Média geral: {parseFloat(avg).toFixed(1)}/10
        </div>
      )}

      <div className="interview__results">
        {results.map((r, i) => (
          <div key={i} className="interview__result-card">
            <div className="interview__result-header">
              <span className="interview__result-q">Pergunta {i + 1}</span>
              <span
                className="interview__result-score"
                style={{ color: scoreColor(r.feedback?.score || 0) }}
              >
                {r.feedback?.score ?? '—'}/10
              </span>
            </div>
            <p className="interview__result-question">{r.question}</p>
            <p className="interview__result-label">Sua resposta:</p>
            <p className="interview__result-answer">{r.answer}</p>
            {r.feedback?.feedback && (
              <>
                <p className="interview__result-label">Feedback:</p>
                <p className="interview__result-feedback">{r.feedback.feedback}</p>
              </>
            )}
            {r.feedback?.ideal && (
              <>
                <p className="interview__result-label">Resposta ideal:</p>
                <p className="interview__result-ideal">{r.feedback.ideal}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <button className="interview__restart" onClick={() => navigate('/dashboard')}>
        Voltar ao Dashboard
      </button>
    </div>
  );
}

export default InterviewDetail;
