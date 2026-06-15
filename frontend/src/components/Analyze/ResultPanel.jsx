import './ResultPanel.css';

const STEP_LABELS = {
  step_2: 'Linguagens & Estrutura',
  step_3: 'Visão geral do projeto',
  step_4: 'Bibliotecas & Rotas',
  step_5: 'Riscos identificados',
  step_6: 'Como fazer deploy',
  step_7: 'Perguntas & Respostas',
};

const RISK_LABELS = {
  alto: { label: 'Alto', className: 'risk-badge risk-badge--alto' },
  medio: { label: 'Médio', className: 'risk-badge risk-badge--medio' },
  baixo: { label: 'Baixo', className: 'risk-badge risk-badge--baixo' },
};

function RenderValue({ value }) {
  // String simples
  if (typeof value === 'string') {
    return <p className="result-panel__text">{value}</p>;
  }

  // Array de strings
  if (Array.isArray(value)) {
    return (
      <ul className="result-panel__list">
        {value.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  // Objeto com chaves alto/medio/baixo → riscos
  if (value && typeof value === 'object') {
    const riskKeys = ['alto', 'medio', 'baixo'];
    const isRisks = riskKeys.some((k) => k in value);

    if (isRisks) {
      return (
        <div className="result-panel__risks">
          {riskKeys.map((level) =>
            value[level]?.length ? (
              <div key={level} className="risk-group">
                <span className={RISK_LABELS[level].className}>
                  {RISK_LABELS[level].label}
                </span>
                <ul className="result-panel__list">
                  {value[level].map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      );
    }

    // Objeto com perguntas/respostas
    if ('perguntas' in value || 'respostas' in value) {
      const perguntas = value.perguntas || [];
      const respostas = value.respostas || [];
      return (
        <div className="result-panel__qa">
          {perguntas.map((q, i) => (
            <div key={i} className="qa-item">
              <p className="qa-item__question">❓ {q}</p>
              {respostas[i] && (
                <p className="qa-item__answer">{respostas[i]}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Objeto genérico → chave: valor
    return (
      <div className="result-panel__map">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="map-item">
            <span className="map-item__key">{k}</span>
            <RenderValue value={v} />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

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
          <h3 className="result-panel__title">
            {STEP_LABELS[stepKey] || stepKey}
          </h3>
          <div className="result-panel__content">
            <RenderValue value={content} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ResultPanel;
