import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './InterviewMode.css';

const STEPS = {
  LOADING: 'loading',
  ANSWERING: 'answering',
  FEEDBACK: 'feedback',
  DONE: 'done',
};

function InterviewMode() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { groqKey } = useAuth();

  const questionCount = parseInt(searchParams.get('count') || '5', 10);

  const [step, setStep] = useState(STEPS.LOADING);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [analysisRes, questionsRes] = await Promise.all([
          api.get(`/history/${id}`),
          api.post('/interview/generate', {
            analysis_id: id,
            count: questionCount,
          }, {
            headers: { 'X-Groq-Key': groqKey || '' },
          }),
        ]);
        setAnalysis(analysisRes.data);
        setQuestions(questionsRes.data.questions);
        setStep(STEPS.ANSWERING);
      } catch {
        setError('Não foi possível carregar a entrevista. Verifique sua chave Groq.');
        setStep(STEPS.DONE);
      }
    };
    load();
  }, [id, questionCount]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    setFeedbackLoading(true);
    try {
      const res = await api.post('/interview/evaluate', {
        question: questions[current],
        answer: answer.trim(),
        analysis_id: id,
      }, {
        headers: { 'X-Groq-Key': groqKey || '' },
      });
      setFeedback(res.data);
      setResults(prev => [...prev, {
        question: questions[current],
        answer: answer.trim(),
        feedback: res.data,
      }]);
      setStep(STEPS.FEEDBACK);
    } catch {
      setError('Erro ao avaliar resposta.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setStep(STEPS.DONE);
    } else {
      setCurrent(c => c + 1);
      setAnswer('');
      setFeedback(null);
      setStep(STEPS.ANSWERING);
    }
  };

  const scoreColor = (score) => {
    if (score >= 8) return '#4ade80';
    if (score >= 5) return '#facc15';
    return '#f87171';
  };

  if (step === STEPS.LOADING) {
    return (
      <div className="interview__loading">
        <div className="spinner" />
        <p>Gerando perguntas baseadas no seu projeto...</p>
      </div>
    );
  }

  if (step === STEPS.DONE) {
    const avg = results.length
      ? (results.reduce((s, r) => s + (r.feedback?.score || 0), 0) / results.length).toFixed(1)
      : null;

    return (
      <div className="interview interview--done">
        <button className="interview__back" onClick={() => navigate(`/history/${id}`)}>
          ← Voltar à análise
        </button>
        <h1>Entrevista concluída 🎉</h1>
        {avg && (
          <div className="interview__avg-score" style={{ color: scoreColor(parseFloat(avg)) }}>
            Média geral: {avg}/10
          </div>
        )}
        {error && <p className="interview__error">{error}</p>}
        <div className="interview__results">
          {results.map((r, i) => (
            <div key={i} className="interview__result-card">
              <div className="interview__result-header">
                <span className="interview__result-q">Pergunta {i + 1}</span>
                <span
                  className="interview__result-score"
                  style={{ color: scoreColor(r.feedback?.score || 0) }}
                >
                  {r.feedback?.score ?? '—'}/10
                </span>
              </div>
              <p className="interview__result-question">{r.question}</p>
              <p className="interview__result-label">Sua resposta:</p>
              <p className="interview__result-answer">{r.answer}</p>
              {r.feedback?.feedback && (
                <>
                  <p className="interview__result-label">Feedback:</p>
                  <p className="interview__result-feedback">{r.feedback.feedback}</p>
                </>
              )}
              {r.feedback?.ideal && (
                <>
                  <p className="interview__result-label">Resposta ideal:</p>
                  <p className="interview__result-ideal">{r.feedback.ideal}</p>
                </>
              )}
            </div>
          ))}
        </div>
        <button className="interview__restart" onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="interview">
      <button className="interview__back" onClick={() => navigate(`/history/${id}`)}>
        ← Voltar à análise
      </button>

      <div className="interview__progress">
        <span>Pergunta {current + 1} de {questions.length}</span>
        <div className="interview__progress-bar">
          <div
            className="interview__progress-fill"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {analysis && (
        <p className="interview__project">Projeto: <strong>{analysis.title}</strong></p>
      )}

      <div className="interview__question-card">
        <p className="interview__question">{questions[current]}</p>
      </div>

      {step === STEPS.ANSWERING && (
        <>
          <textarea
            className="interview__answer"
            placeholder="Digite sua resposta aqui..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={5}
            disabled={feedbackLoading}
          />
          <button
            className="interview__submit"
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || feedbackLoading}
          >
            {feedbackLoading ? 'Avaliando...' : 'Enviar resposta →'}
          </button>
          {error && <p className="interview__error">{error}</p>}
        </>
      )}

      {step === STEPS.FEEDBACK && feedback && (
        <div className="interview__feedback">
          <div
            className="interview__score"
            style={{ color: scoreColor(feedback.score) }}
          >
            {feedback.score}/10
          </div>
          <p className="interview__feedback-text">{feedback.feedback}</p>
          {feedback.ideal && (
            <div className="interview__ideal">
              <p className="interview__ideal-label">Resposta ideal:</p>
              <p>{feedback.ideal}</p>
            </div>
          )}
          <button className="interview__next" onClick={handleNext}>
            {current + 1 >= questions.length ? 'Ver resultado final →' : 'Próxima pergunta →'}
          </button>
        </div>
      )}
    </div>
  );
}

export default InterviewMode;
