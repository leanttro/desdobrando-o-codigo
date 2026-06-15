import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        const response = await api.get('/history');

        if (isMounted) {
          const data = response.data || {};

          // Backend retorna { analyses: [...], errors: [...] }
          // Normaliza tudo num array único com campo "type" e "summary"
          const analyses = (data.analyses || []).map((a) => ({
            id: a.id,
            type: a.type || 'Análise',
            summary: a.title || a.result || '—',
            created_at: a.created_at,
          }));

          const errors = (data.errors || []).map((e) => ({
            id: e.id,
            type: 'Erro',
            summary: e.error_input || e.explanation || '—',
            created_at: e.created_at,
          }));

          // Junta e ordena do mais recente pro mais antigo
          const merged = [...analyses, ...errors].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );

          setHistory(merged);
        }
      } catch {
        if (isMounted) {
          setError('Não foi possível carregar o histórico agora.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dashboard">
      <h1 className="dashboard__title">
        Olá{user?.name ? `, ${user.name}` : ''}!
      </h1>
      <p className="dashboard__subtitle">O que você quer fazer hoje?</p>

      <div className="dashboard__quick-links">
        <Link to="/analyze" className="dashboard__quick-link">
          <h3>Analisar código</h3>
          <p>Envie arquivos ou um zip do seu projeto</p>
        </Link>
        <Link to="/n8n" className="dashboard__quick-link">
          <h3>Analisar n8n</h3>
          <p>Cole o JSON de um workflow</p>
        </Link>
        <Link to="/errors" className="dashboard__quick-link">
          <h3>Identificar erro</h3>
          <p>Cole uma mensagem de erro</p>
        </Link>
        <Link to="/glossary" className="dashboard__quick-link">
          <h3>Glossário</h3>
          <p>Consulte termos técnicos</p>
        </Link>
      </div>

      <section className="dashboard__history">
        <h2>Histórico</h2>

        {loading && <p className="dashboard__info">Carregando histórico...</p>}
        {error && <p className="dashboard__error">{error}</p>}

        {!loading && !error && history.length === 0 && (
          <p className="dashboard__info">
            Você ainda não fez nenhuma análise. Comece usando uma das opções acima.
          </p>
        )}

        {!loading && !error && history.length > 0 && (
          <ul className="dashboard__history-list">
            {history.map((item) => (
              <li key={item.id} className="dashboard__history-item">
                <div>
                  <span className="dashboard__history-type">{item.type}</span>
                  <p>{item.summary}</p>
                </div>
                {item.created_at && (
                  <span className="dashboard__history-date">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
