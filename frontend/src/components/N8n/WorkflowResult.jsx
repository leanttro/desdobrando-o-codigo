import './WorkflowResult.css';

const RISK_LABELS = {
  alto: { label: 'Alto', className: 'risk-badge risk-badge--alto' },
  medio: { label: 'Médio', className: 'risk-badge risk-badge--medio' },
  baixo: { label: 'Baixo', className: 'risk-badge risk-badge--baixo' },
};

function WorkflowResult({ result }) {
  if (!result) return null;

  // O backend retorna { id, title, type, result: { what_it_does, nodes_explained, risks, improvements, fix_prompts }, created_at }
  // O N8nAnalyze.jsx faz setResult(response.data), então result aqui é o objeto inteiro
  const data = result.result || result;

  const {
    what_it_does,
    nodes_explained,
    risks,
    improvements,
    fix_prompts,
  } = data;

  if (!what_it_does && !nodes_explained && !risks) {
    return (
      <div className="workflow-result workflow-result--empty">
        <p>Os resultados do workflow vão aparecer aqui.</p>
      </div>
    );
  }

  return (
    <div className="workflow-result">

      {what_it_does && (
        <section className="workflow-result__section">
          <h3>O que o workflow faz</h3>
          <p>{what_it_does}</p>
        </section>
      )}

      {nodes_explained && (
        <section className="workflow-result__section">
          <h3>Nodes explicados</h3>
          <p>{nodes_explained}</p>
        </section>
      )}

      {risks && typeof risks === 'object' && (
        <section className="workflow-result__section">
          <h3>Riscos identificados</h3>
          <div className="workflow-result__risks">
            {['alto', 'medio', 'baixo'].map((level) =>
              risks[level]?.length ? (
                <div key={level} className="risk-group">
                  <span className={RISK_LABELS[level].className}>
                    {RISK_LABELS[level].label}
                  </span>
                  <ul>
                    {risks[level].map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </section>
      )}

      {improvements && (
        <section className="workflow-result__section">
          <h3>Como melhorar</h3>
          <p>{improvements}</p>
        </section>
      )}

      {Array.isArray(fix_prompts) && fix_prompts.length > 0 && (
        <section className="workflow-result__section">
          <h3>Prompts de correção</h3>
          <ul className="workflow-result__prompts">
            {fix_prompts.map((prompt, i) => (
              <li key={i} className="workflow-result__prompt">{prompt}</li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}

export default WorkflowResult;
