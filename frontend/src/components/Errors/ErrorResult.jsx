import { useState } from 'react';
import './ErrorResult.css';

function ErrorResult({ result }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const { explanation, fix_prompt } = result;

  const handleCopy = async () => {
    if (!fix_prompt) return;

    try {
      await navigator.clipboard.writeText(fix_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="error-result">
      {explanation && (
        <section className="error-result__section">
          <h3>O que esse erro significa</h3>
          <p>{explanation}</p>
        </section>
      )}

      {fix_prompt && (
        <section className="error-result__section">
          <div className="error-result__prompt-header">
            <h3>Prompt de correção</h3>
            <button
              type="button"
              className="error-result__copy-button"
              onClick={handleCopy}
            >
              {copied ? 'Copiado!' : 'Copiar prompt'}
            </button>
          </div>
          <pre className="error-result__prompt">{fix_prompt}</pre>
        </section>
      )}
    </div>
  );
}

export default ErrorResult;
