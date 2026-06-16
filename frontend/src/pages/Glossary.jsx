import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConceptCard from '../components/Glossary/ConceptCard';
import './Glossary.css';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CATEGORIES = ['Todos', 'Frontend', 'Backend', 'Infra', 'Banco de dados', 'DevOps', 'Segurança', 'Geral'];

function Glossary() {
  const { groqKey } = useAuth();

  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Busca e filtro
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  // Geração com IA
  const [generating, setGenerating] = useState(false);
  const [generatedConcept, setGeneratedConcept] = useState(null);
  const [genError, setGenError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchGlossary = async () => {
      try {
        const response = await api.get('/glossary');
        if (isMounted) {
          setConcepts(response.data?.glossary || []);
        }
      } catch {
        if (isMounted) {
          setError('Não foi possível carregar o glossário agora.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGlossary();
    return () => { isMounted = false; };
  }, []);

  const filtered = useMemo(() => {
    return concepts.filter(c => {
      const matchSearch = !search || c.term?.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory === 'Todos' || c.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [concepts, search, activeCategory]);

  const noResults = !loading && !error && search.trim() && filtered.length === 0;
  const hasResults = !loading && !error && filtered.length > 0;

  const handleGenerate = async () => {
    const term = search.trim();
    if (!term) return;

    if (!groqKey) {
      setGenError('Configure sua chave Groq nas configurações para usar essa função.');
      return;
    }

    setGenerating(true);
    setGenError('');
    setGeneratedConcept(null);
    setSaveSuccess(false);

    const prompt = `Gere uma definição técnica para o termo "${term}" no contexto de desenvolvimento de software.
Responda SOMENTE com um objeto JSON válido, sem texto adicional, sem markdown, sem \`\`\`.
O JSON deve ter exatamente estas chaves:
{
  "term": "nome do termo",
  "category": "uma de: Frontend, Backend, Infra, Banco de dados, DevOps, Segurança, Geral",
  "short_explanation": "explicação clara em 2-3 frases",
  "analogy": "analogia do dia a dia para entender o conceito",
  "when_you_need_it": "situações práticas em que esse conceito é necessário",
  "common_error": "erro comum que iniciantes cometem com esse conceito",
  "related_terms": ["termo1", "termo2", "termo3"]
}`;

    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
          temperature: 0.4,
        }),
      });

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setGeneratedConcept(parsed);
    } catch {
      setGenError('Não consegui gerar a definição. Verifique sua chave Groq e tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedConcept) return;
    setSaving(true);
    try {
      await api.post('/glossary', generatedConcept);
      setConcepts(prev => [...prev, generatedConcept]);
      setSaveSuccess(true);
      setGeneratedConcept(null);
      setSearch('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setGenError('Erro ao salvar o conceito. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setGeneratedConcept(null);
    setGenError('');
  };

  return (
    <div className="glossary">
      <div className="glossary__header">
        <h1 className="glossary__title">Glossário</h1>
        <p className="glossary__subtitle">
          Termos técnicos explicados em linguagem simples, com analogias do dia a dia.
        </p>
      </div>

      {/* Barra de busca + geração */}
      <div className="glossary__search-bar">
        <div className="glossary__search-input-wrap">
          <span className="glossary__search-icon">⌕</span>
          <input
            className="glossary__search-input"
            type="text"
            placeholder="Buscar ou adicionar um termo..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setGeneratedConcept(null);
              setGenError('');
              setSaveSuccess(false);
            }}
            onKeyDown={e => e.key === 'Enter' && noResults && handleGenerate()}
          />
          {search && (
            <button className="glossary__search-clear" onClick={() => { setSearch(''); setGeneratedConcept(null); setGenError(''); }}>✕</button>
          )}
        </div>
      </div>

      {/* Filtros por categoria */}
      <div className="glossary__categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`glossary__category-btn ${activeCategory === cat ? 'glossary__category-btn--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {saveSuccess && (
        <div className="glossary__save-success">
          ✓ Termo salvo no glossário com sucesso!
        </div>
      )}

      {/* Estado: carregando */}
      {loading && <p className="glossary__info">Carregando conceitos...</p>}
      {error && <p className="glossary__error">{error}</p>}

      {/* Estado: nenhum resultado + CTA de geração */}
      {noResults && !generatedConcept && (
        <div className="glossary__empty-state">
          <p className="glossary__empty-title">
            Nenhum resultado para <strong>"{search}"</strong>
          </p>
          <p className="glossary__empty-desc">
            Quer que a IA gere uma definição completa e você salva no glossário?
          </p>
          {genError && <p className="glossary__gen-error">{genError}</p>}
          <button
            className="glossary__gen-btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Gerando definição...' : `✦ Gerar definição para "${search}"`}
          </button>
        </div>
      )}

      {/* Card gerado pela IA — preview antes de salvar */}
      {generatedConcept && (
        <div className="glossary__gen-preview">
          <div className="glossary__gen-preview-header">
            <span className="glossary__gen-badge">✦ Gerado pela IA — revise antes de salvar</span>
            <button className="glossary__gen-discard" onClick={handleDiscard}>Descartar</button>
          </div>
          <ConceptCard concept={generatedConcept} preview />
          <div className="glossary__gen-actions">
            <button className="glossary__gen-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : '✓ Salvar no glossário'}
            </button>
            <button className="glossary__gen-discard-btn" onClick={handleDiscard}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Grid de cards */}
      {hasResults && (
        <div className="glossary__grid">
          {filtered.map((concept, index) => (
            <ConceptCard key={concept.term || index} concept={concept} />
          ))}
        </div>
      )}

      {!loading && !error && !search && concepts.length === 0 && (
        <p className="glossary__info">Nenhum conceito disponível por enquanto.</p>
      )}
    </div>
  );
}

export default Glossary;
