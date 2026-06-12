import './ProgressSteps.css';

const STEP_LABELS = [
  'Lendo arquivos',
  'Identificando estrutura',
  'Mapeando dependências',
  'Analisando lógica',
  'Gerando explicações',
  'Finalizando relatório',
];

function ProgressSteps({ currentStep, totalSteps = 6 }) {
  return (
    <div className="progress-steps">
      {STEP_LABELS.slice(0, totalSteps).map((label, index) => {
        const stepNumber = index + 1;
        let status = 'pending';
        if (stepNumber < currentStep) status = 'done';
        if (stepNumber === currentStep) status = 'active';

        return (
          <div key={stepNumber} className={`progress-step progress-step--${status}`}>
            <div className="progress-step__circle">
              {status === 'done' ? '✓' : stepNumber}
            </div>
            <div className="progress-step__label">{label}</div>
            {stepNumber < totalSteps && <div className="progress-step__line" />}
          </div>
        );
      })}
    </div>
  );
}

export default ProgressSteps;
