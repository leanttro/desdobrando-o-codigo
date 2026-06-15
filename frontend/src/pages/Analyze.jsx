import { useState } from 'react';
import api from '../services/api';
import UploadZone from '../components/Analyze/UploadZone';
import ProgressSteps from '../components/Analyze/ProgressSteps';
import ResultPanel from '../components/Analyze/ResultPanel';
import './Analyze.css';

const TOTAL_STEPS = 6;
const STORAGE_KEY = 'lastAnalysis';

// Recupera estado salvo do sessionStorage (só dura enquanto o browser está aberto)
function loadSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function Analyze() {
  const saved = loadSaved();

  const [currentStep, setCurrentStep] = useState(saved.currentStep || 0);
  const [results, setResults] = useState(saved.results || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Salva no sessionStorage sempre que atualiza resultados
  function persist(newResults, newStep) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ results: newResults, currentStep: newStep })
      );
    } catch {
      // sessionStorage cheio ou bloqueado — segue sem persistência
    }
  }

  const handleUpload = async (files) => {
    setLoading(true);
    setError('');
    setResults({});
    setCurrentStep(1);

    try {
      const formData = new FormData();

      if (Array.isArray(files)) {
        files.forEach((file) => formData.append('files', file));
      } else {
        formData.append('files', files);
      }

      const response = await api.post('/analyze/code', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data || {};

      let newResults;
      if (data.steps) {
        newResults = data.steps;
      } else if (data.result) {
        newResults = data.result;
      } else {
        const { id, ...rest } = data;
        newResults = rest;
      }

      setResults(newResults);
      setCurrentStep(TOTAL_STEPS);
      persist(newResults, TOTAL_STEPS); // 💾 salva após análise concluída

    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Não foi possível analisar o código. Tente novamente.';
      setError(message);
      setCurrentStep(0);
      persist({}, 0); // limpa o storage em caso de erro
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analyze">
      <h1 className="analyze__title">Analisar código</h1>
      <p className="analyze__subtitle">
        Envie um arquivo .zip ou os arquivos do seu projeto para receber uma
        explicação completa em 6 etapas.
      </p>

      <div className="analyze__notice">
        🔒 Sua chave API nunca sai do seu navegador e não é armazenada por nós.
      </div>

      <UploadZone onSubmit={handleUpload} loading={loading} />

      {error && <p className="analyze__error">{error}</p>}

      {currentStep > 0 && (
        <ProgressSteps currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      )}

      {currentStep > 0 && <ResultPanel results={results} />}
    </div>
  );
}

export default Analyze;
