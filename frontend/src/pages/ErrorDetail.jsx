import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ErrorResult from '../components/Errors/ErrorResult';
import './ErrorHelper.css';

function ErrorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchError = async () => {
      try {
        const response = await api.get(`/errors/${id}`);
        setResult(response.data);
      } catch {
        setError('Não foi possível carregar esse erro.');
      } finally {
        setLoading(false);
      }
    };
    fetchError();
  }, [id]);

  return (
    <div className="error-helper">
      <button
        onClick={() => navigate('/dashboard')}
        style={{ background: 'none', border: 'none', color: 'var(--purple-light)', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.9rem' }}
      >
        ← Voltar ao Dashboard
      </button>

      <h1 className="error-helper__title">Detalhe do erro</h1>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>}
      {error && <p className="error-helper__error">{error}</p>}

      {result && (
        <>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {result.error_input}
            </p>
          </div>
          <ErrorResult result={result} />
        </>
      )}
    </div>
  );
}

export default ErrorDetail;
