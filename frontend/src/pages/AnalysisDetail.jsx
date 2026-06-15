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
      </div>

      {isCode && (
        <ProgressSteps currentStep={TOTAL_STEPS} totalSteps={TOTAL_STEPS} />
      )}

      <ResultPanel results={analysis.result} />
    </div>
  );
}

export default AnalysisDetail;
