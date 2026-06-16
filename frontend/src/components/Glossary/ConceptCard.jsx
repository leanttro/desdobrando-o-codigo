import './ConceptCard.css';

const CATEGORY_COLORS = {
  Frontend: 'concept-card__cat--frontend',
  Backend: 'concept-card__cat--backend',
  Infra: 'concept-card__cat--infra',
  DevOps: 'concept-card__cat--devops',
  'Banco de dados': 'concept-card__cat--db',
  Segurança: 'concept-card__cat--sec',
  Geral: 'concept-card__cat--geral',
};

function ConceptCard({ concept, preview = false }) {
  const { term, category, short_explanation, analogy, when_you_need_it, common_error, related_terms } = concept;

  return (
    <div className={`concept-card ${preview ? 'concept-card--preview' : ''}`}>
      <div className="concept-card__top">
        <h3 className="concept-card__term">{term}</h3>
        {category && (
          <span className={`concept-card__cat ${CATEGORY_COLORS[category] || 'concept-card__cat--geral'}`}>
            {category}
          </span>
        )}
      </div>

      {short_explanation && (
        <p className="concept-card__explanation">{short_explanation}</p>
      )}

      {analogy && (
        <div className="concept-card__block concept-card__block--analogy">
          <span className="concept-card__label">Analogia</span>
          <p>{analogy}</p>
        </div>
      )}

      {when_you_need_it && (
        <div className="concept-card__block">
          <span className="concept-card__label">Quando usar</span>
          <p>{when_you_need_it}</p>
        </div>
      )}

      {common_error && (
        <div className="concept-card__block concept-card__block--error">
          <span className="concept-card__label concept-card__label--error">Erro comum</span>
          <p>{common_error}</p>
        </div>
      )}

      {related_terms && related_terms.length > 0 && (
        <div className="concept-card__related">
          {related_terms.map(t => (
            <span key={t} className="concept-card__tag">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConceptCard;
