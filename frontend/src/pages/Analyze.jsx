import { useState } from 'react';
import api from '../services/api';
import UploadZone from '../components/Analyze/UploadZone';
import ProgressSteps from '../components/Analyze/ProgressSteps';
import ResultPanel from '../components/Analyze/ResultPanel';
import './Analyze.css';

const TOTAL_STEPS = 6;

function Analyze() {
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      if (data.steps) {
        setResults(data.steps);
      } else {
        setResults(data);
      }

      setCurrentStep(TOTAL_STEPS);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Não foi possível analisar o código. Tente novamente.';
      setError(message);
      setCurrentStep(0);
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

      <UploadZone onUpload={handleUpload} loading={loading} />

      {error && <p className="analyze__error">{error}</p>}

      {currentStep > 0 && (
        <ProgressSteps currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      )}

      {currentStep > 0 && <ResultPanel results={results} />}
    </div>
  );
}

export default Analyze;
