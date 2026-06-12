import { useState } from 'react';
import './JsonInput.css';

function JsonInput({ onAnalyze, loading }) {
  const [jsonValue, setJsonValue] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setJsonValue(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!jsonValue.trim()) {
      setError('Cole o JSON do workflow do n8n antes de analisar.');
      return;
    }

    try {
      JSON.parse(jsonValue);
    } catch {
      setError('O texto colado não é um JSON válido. Verifique e tente novamente.');
      return;
    }

    onAnalyze(jsonValue);
  };

  return (
    <form className="json-input" onSubmit={handleSubmit}>
      <label htmlFor="n8n-json" className="json-input__label">
        Cole o JSON exportado do seu workflow do n8n
      </label>
      <textarea
        id="n8n-json"
        className="json-input__textarea"
        value={jsonValue}
        onChange={handleChange}
        placeholder='{ "nodes": [...], "connections": {...} }'
        rows={14}
        disabled={loading}
      />
      {error && <p className="json-input__error">{error}</p>}
      <button type="submit" className="json-input__button" disabled={loading}>
        {loading ? 'Analisando...' : 'Analisar workflow'}
      </button>
    </form>
  );
}

export default JsonInput;
