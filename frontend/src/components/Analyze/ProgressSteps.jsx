import './ProgressSteps.css';

const STEP_LABELS = [
  'Lendo arquivos',
  'Identificando estrutura',
  'Mapeando dependências',
  'Analisando lógica',
  'Gerando explicações',
  'Finalizando relatório',
  'Simular entrevista',
];

function ProgressSteps({ currentStep, totalSteps = 7, interviewDone = false, onInterviewClick }) {
  return (
    <div className="progress-steps">
      {STEP_LABELS.slice(0, totalSteps).map((label, index) => {
        const stepNumber = index + 1;
        const isInterview = stepNumber === 7;

        let status = 'pending';
        if (isInterview) {
          status = interviewDone ? 'done' : 'optional';
        } else {
          if (stepNumber < currentStep) status = 'done';
          if (stepNumber === currentStep) status = 'active';
        }

        return (
          <div key={stepNumber} className={`progress-step progress-step--${status}`}>
            <div
              className={`progress-step__circle ${isInterview && !interviewDone ? 'progress-step__circle--optional' : ''}`}
              onClick={isInterview && !interviewDone && onInterviewClick ? onInterviewClick : undefined}
              style={isInterview && !interviewDone && onInterviewClick ? { cursor: 'pointer' } : {}}
              title={isInterview && !interviewDone ? 'Clique para simular entrevista' : ''}
            >
              {status === 'done' ? '✓' : isInterview && !interviewDone ? '⚡' : stepNumber}
            </div>
            <div className="progress-step__label">
              {label}
              {isInterview && !interviewDone && (
                <span className="progress-step__optional-tag">opcional</span>
              )}
            </div>
            {stepNumber < totalSteps && <div className="progress-step__line" />}
          </div>
        );
      })}
    </div>
  );
}

export default ProgressSteps;
