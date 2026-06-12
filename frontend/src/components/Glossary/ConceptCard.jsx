import './ConceptCard.css';

function ConceptCard({ concept }) {
  const { term, short_explanation, analogy, when_you_need_it } = concept;

  return (
    <div className="concept-card">
      <h3 className="concept-card__term">{term}</h3>

      {short_explanation && (
        <p className="concept-card__explanation">{short_explanation}</p>
      )}

      {analogy && (
        <div className="concept-card__block">
          <span className="concept-card__label">Analogia</span>
          <p>{analogy}</p>
        </div>
      )}

      {when_you_need_it && (
        <div className="concept-card__block">
          <span className="concept-card__label">Quando você precisa disso</span>
          <p>{when_you_need_it}</p>
        </div>
      )}
    </div>
  );
}

export default ConceptCard;
