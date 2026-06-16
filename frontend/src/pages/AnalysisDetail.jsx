import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ResultPanel from '../components/Analyze/ResultPanel';
import ProgressSteps from '../components/Analyze/ProgressSteps';
import './AnalysisDetail.css';

const TOTAL_STEPS = 6;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildAnalysisContext(analysis) {
  const r = analysis?.result || {};
  const parts = [`Projeto: ${analysis?.title || 'sem título'}`];
  if (r.step_2) parts.push(`Linguagens e estrutura: ${r.step_2}`);
  if (r.step_3) parts.push(`Visão geral: ${r.step_3}`);
  if (r.step_4) parts.push(`Bibliotecas e dependências: ${r.step_4}`);
  if (r.step_5) {
    const risks = r.step_5;
    if (typeof risks === 'object') {
      const all = [...(risks.alto||[]), ...(risks.medio||[]), ...(risks.baixo||[])];
      if (all.length) parts.push(`Riscos: ${all.join('; ')}`);
    }
  }
  if (r.step_6) parts.push(`Deploy: ${r.step_6}`);
  return parts.join('\n\n');
}

function AnalysisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { groqKey } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const simuladosRef = useRef(null);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Olá! Pode me perguntar qualquer coisa sobre essa análise — termos, decisões técnicas, bibliotecas usadas, riscos... 😊' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    if (window.location.hash === '#simulados' && simuladosRef.current) {
      simuladosRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysis]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await api.get(`/history/${id}`);
        setAnalysis(response.data);
      } catch {
        setError('Não foi possível carregar essa análise.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    if (!groqKey) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Configure sua chave Groq nas configurações para usar o chat.' }]);
      return;
    }

    const userMsg = { role: 'user', content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    const context = buildAnalysisContext(analysis);
    const systemPrompt = `Você é um assistente especializado em desenvolvimento de software que ajuda o usuário a entender a análise do projeto dele.

Contexto do projeto analisado:
${context}

Responda de forma clara e didática. Quando mencionar termos técnicos, explique como eles se aplicam especificamente a esse projeto. Seja objetivo e amigável. Responda em português.`;

    const history = chatMessages
      .filter(m => m.role !== 'assistant' || chatMessages.indexOf(m) > 0)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: text },
          ],
          max_tokens: 600,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Não consegui gerar uma resposta. Tente novamente.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao conectar com o Groq. Verifique sua chave.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleStartInterview = () => {
    navigate(`/interview/${id}?count=${questionCount}`);
  };

  if (loading) {
    return (
      <div className="analysis-detail__loading">
        <div className="spinner" />
        <p>Carregando análise...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-detail__error">
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')}>← Voltar</button>
      </div>
    );
  }

  const isCode = analysis.type === 'code';

  return (
    <div className="analysis-detail">
      <button className="analysis-detail__back" onClick={() => navigate('/dashboard')}>
        ← Voltar ao Dashboard
      </button>

      <div className="analysis-detail__header">
        <span className="analysis-detail__type-badge">
          {isCode ? 'Análise de Código' : 'Análise n8n'}
        </span>
        <h1 className="analysis-detail__title">{analysis.title}</h1>
        <p className="analysis-detail__date">
          {new Date(analysis.created_at).toLocaleString('pt-BR')}
        </p>

        {isCode && (
          <button
            className="analysis-detail__interview-btn"
            onClick={() => setShowModal(true)}
          >
            🎯 Simular entrevista
          </button>
        )}
      </div>

      {isCode && (
        <ProgressSteps currentStep={TOTAL_STEPS} totalSteps={TOTAL_STEPS} />
      )}

      <ResultPanel results={analysis.result} />

      <div ref={simuladosRef} id="simulados" />

      {/* ── Chatbot flutuante ── */}
      {chatOpen && (
        <div className="analysis-chat__window">
          <div className="analysis-chat__header">
            <span>💬 Tirar dúvidas sobre a análise</span>
            <button className="analysis-chat__close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="analysis-chat__messages">
            {chatMessages.map((m, i) => (
              <div key={i} className={`analysis-chat__msg analysis-chat__msg--${m.role}`}>
                {m.content}
              </div>
            ))}
            {chatLoading && (
              <div className="analysis-chat__msg analysis-chat__msg--assistant analysis-chat__msg--loading">
                <span className="chat-dot" /><span className="chat-dot" /><span className="chat-dot" />
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className="analysis-chat__input-row">
            <input
              className="analysis-chat__input"
              placeholder="O que é Axios? Como funciona o deploy?..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              disabled={chatLoading}
            />
            <button
              className="analysis-chat__send"
              onClick={handleSendChat}
              disabled={!chatInput.trim() || chatLoading}
            >→</button>
          </div>
        </div>
      )}

      <button
        className="analysis-chat__fab"
        onClick={() => setChatOpen(o => !o)}
        title="Tirar dúvidas sobre a análise"
      >
        {chatOpen ? '✕' : '💬'}
      </button>

      {showModal && (
        <div className="interview-modal__overlay" onClick={() => setShowModal(false)}>
          <div className="interview-modal" onClick={e => e.stopPropagation()}>
            <h2>Simular entrevista</h2>
            <p>Quantas perguntas você quer responder?</p>
            <div className="interview-modal__options">
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  className={`interview-modal__option ${questionCount === n ? 'interview-modal__option--active' : ''}`}
                  onClick={() => setQuestionCount(n)}
                >
                  {n} perguntas
                </button>
              ))}
            </div>
            <div className="interview-modal__actions">
              <button className="interview-modal__cancel" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="interview-modal__start" onClick={handleStartInterview}>
                Começar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisDetail;
