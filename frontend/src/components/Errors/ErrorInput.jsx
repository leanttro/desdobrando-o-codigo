import { useState } from 'react';
import './ErrorInput.css';

function ErrorInput({ onIdentify, loading }) {
  const [errorValue, setErrorValue] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleChange = (e) => {
    setErrorValue(e.target.value);
    if (validationError) setValidationError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!errorValue.trim()) {
      setValidationError('Cole a mensagem de erro antes de continuar.');
      return;
    }

    onIdentify(errorValue);
  };

  return (
    <form className="error-input" onSubmit={handleSubmit}>
      <label htmlFor="error-text" className="error-input__label">
        Cole o erro que você recebeu (stack trace, log, mensagem do terminal etc.)
      </label>
      <textarea
        id="error-text"
        className="error-input__textarea"
        value={errorValue}
        onChange={handleChange}
        placeholder="Ex: TypeError: Cannot read properties of undefined (reading 'map')..."
        rows={10}
        disabled={loading}
      />
      {validationError && <p className="error-input__error">{validationError}</p>}
      <button type="submit" className="error-input__button" disabled={loading}>
        {loading ? 'Identificando...' : 'Identificar erro'}
      </button>
    </form>
  );
}

export default ErrorInput;
