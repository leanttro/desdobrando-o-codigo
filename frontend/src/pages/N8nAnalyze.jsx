import { useState } from 'react';
import api from '../services/api';
import JsonInput from '../components/N8n/JsonInput';
import WorkflowResult from '../components/N8n/WorkflowResult';
import './N8nAnalyze.css';

function N8nAnalyze() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async (jsonValue) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/analyze/n8n', { json_input: jsonValue });
      setResult(response.data);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Não foi possível analisar o workflow. Verifique o JSON e tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="n8n-analyze">
      <h1 className="n8n-analyze__title">Analisar workflow do n8n</h1>
      <p className="n8n-analyze__subtitle">
        Cole o JSON exportado do seu workflow para entender o que cada nó faz
        e como eles se conectam.
      </p>

      <div className="n8n-analyze__notice">
        🔒 Sua chave API nunca sai do seu navegador e não é armazenada por nós.
      </div>

      <JsonInput onAnalyze={handleAnalyze} loading={loading} />

      {error && <p className="n8n-analyze__error">{error}</p>}

      <WorkflowResult result={result} />
    </div>
  );
}

export default N8nAnalyze;
