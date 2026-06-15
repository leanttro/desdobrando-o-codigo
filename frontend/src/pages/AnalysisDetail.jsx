import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ResultPanel from '../components/Analyze/ResultPanel';
import ProgressSteps from '../components/Analyze/ProgressSteps';
import './AnalysisDetail.css';

const TOTAL_STEPS = 6;

function AnalysisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/history/${id}`);
        setAnalysis(response.data);
      } catch {
        setError('Não foi possível carregar essa análise.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleStartInterview = () => {
    navigate(`/interview/${id}?count=${questionCount}`);
  };

  if (loading) {
    return (
      <div className="analysis-detail__loading">
        <div className="spinner" />
        <p>Carregando análise...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-detail__error">
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')}>← Voltar</button>
      </div>
    );
  }

  const isCode = analysis.type === 'code';

  return (
    <div className="analysis-detail">
      <button className="analysis-detail__back" onClick={() => navigate('/dashboard')}>
        ← Voltar ao Dashboard
      </button>

      <div className="analysis-detail__header">
        <span className="analysis-detail__type-badge">
          {isCode ? 'Análise de Código' : 'Análise n8n'}
        </span>
        <h1 className="analysis-detail__title">{analysis.title}</h1>
        <p className="analysis-detail__date">
          {new Date(analysis.created_at).toLocaleString('pt-BR')}
        </p>

        {isCode && (
          <button
            className="analysis-detail__interview-btn"
            onClick={() => setShowModal(true)}
          >
            🎯 Simular entrevista
          </button>
        )}
      </div>

      {isCode && (
        <ProgressSteps currentStep={TOTAL_STEPS} totalSteps={TOTAL_STEPS} />
      )}

      <ResultPanel results={analysis.result} />

      {showModal && (
        <div className="interview-modal__overlay" onClick={() => setShowModal(false)}>
          <div className="interview-modal" onClick={e => e.stopPropagation()}>
            <h2>Simular entrevista</h2>
            <p>Quantas perguntas você quer responder?</p>
            <div className="interview-modal__options">
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  className={`interview-modal__option ${questionCount === n ? 'interview-modal__option--active' : ''}`}
                  onClick={() => setQuestionCount(n)}
                >
                  {n} perguntas
                </button>
              ))}
            </div>
            <div className="interview-modal__actions">
              <button className="interview-modal__cancel" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="interview-modal__start" onClick={handleStartInterview}>
                Começar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisDetail;
