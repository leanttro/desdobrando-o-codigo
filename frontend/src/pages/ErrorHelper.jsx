import { useState, useEffect } from 'react';
import api from '../services/api';
import ErrorInput from '../components/Errors/ErrorInput';
import ErrorResult from '../components/Errors/ErrorResult';
import './ErrorHelper.css';

const STORAGE_KEY = 'errorhelper_last_result';

function ErrorHelper() {
  const [result, setResult] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleIdentify = async (errorValue) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/errors/identify', { error_input: errorValue });
      setResult(response.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Não foi possível identificar o erro agora. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="error-helper">
      <h1 className="error-helper__title">Identificar erro</h1>
      <p className="error-helper__subtitle">
        Cole a mensagem de erro que você recebeu e receba uma explicação clara,
        além de um prompt pronto para corrigir o problema.
      </p>

      <div className="error-helper__notice">
        🔒 Sua chave API nunca sai do seu navegador e não é armazenada por nós.
      </div>

      <ErrorInput onIdentify={handleIdentify} loading={loading} />

      {error && <p className="error-helper__error">{error}</p>}

      <ErrorResult result={result} />
    </div>
  );
}

export default ErrorHelper;
