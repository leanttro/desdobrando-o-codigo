import { useEffect, useState } from 'react';
import api from '../services/api';
import ConceptCard from '../components/Glossary/ConceptCard';
import './Glossary.css';

function Glossary() {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchGlossary = async () => {
      try {
        const response = await api.get('/glossary');
        if (isMounted) {
          setConcepts(response.data || []);
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

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="glossary">
      <h1 className="glossary__title">Glossário</h1>
      <p className="glossary__subtitle">
        Termos técnicos explicados em linguagem simples, com analogias do dia a dia.
      </p>

      {loading && <p className="glossary__info">Carregando conceitos...</p>}
      {error && <p className="glossary__error">{error}</p>}

      {!loading && !error && concepts.length === 0 && (
        <p className="glossary__info">Nenhum conceito disponível por enquanto.</p>
      )}

      {!loading && !error && concepts.length > 0 && (
        <div className="glossary__grid">
          {concepts.map((concept, index) => (
            <ConceptCard key={concept.term || index} concept={concept} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Glossary;
