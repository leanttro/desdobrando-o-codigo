import './ResultPanel.css';

function ResultPanel({ results }) {
  if (!results || Object.keys(results).length === 0) {
    return (
      <div className="result-panel result-panel--empty">
        <p>Os resultados da análise vão aparecer aqui conforme forem concluídos.</p>
      </div>
    );
  }

  return (
    <div className="result-panel">
      {Object.entries(results).map(([stepKey, content]) => (
        <div key={stepKey} className="result-panel__item">
          <h3 className="result-panel__title">{content.title || stepKey}</h3>
          <div className="result-panel__content">
            {typeof content.text === 'string' ? (
              <p>{content.text}</p>
            ) : (
              <pre className="result-panel__pre">
                {JSON.stringify(content, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ResultPanel;
