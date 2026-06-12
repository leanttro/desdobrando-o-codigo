import './WorkflowResult.css';

function WorkflowResult({ result }) {
  if (!result) return null;

  const { summary, nodes_explained, potential_issues, suggestions } = result;

  return (
    <div className="workflow-result">
      {summary && (
        <section className="workflow-result__section">
          <h3>Resumo do workflow</h3>
          <p>{summary}</p>
        </section>
      )}

      {Array.isArray(nodes_explained) && nodes_explained.length > 0 && (
        <section className="workflow-result__section">
          <h3>Nós do workflow</h3>
          <div className="workflow-result__nodes">
            {nodes_explained.map((node, index) => (
              <div key={index} className="workflow-result__node">
                <h4>{node.name || `Nó ${index + 1}`}</h4>
                <p>{node.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(potential_issues) && potential_issues.length > 0 && (
        <section className="workflow-result__section">
          <h3>Possíveis problemas</h3>
          <ul>
            {potential_issues.map((issue, index) => (
              <li key={index} className="workflow-result__issue">{issue}</li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(suggestions) && suggestions.length > 0 && (
        <section className="workflow-result__section">
          <h3>Sugestões de melhoria</h3>
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default WorkflowResult;
