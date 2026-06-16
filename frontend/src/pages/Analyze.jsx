import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import UploadZone from '../components/Analyze/UploadZone';
import ProgressSteps from '../components/Analyze/ProgressSteps';
import ResultPanel from '../components/Analyze/ResultPanel';
import './Analyze.css';

const TOTAL_STEPS = 7;
const STORAGE_KEY = 'lastAnalysis';

function loadSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Helpers GitHub
// ---------------------------------------------------------------------------

function parseRepoUrl(url) {
  const m = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

const RELEVANT_EXTS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs',
  '.rb', '.php', '.cs', '.cpp', '.c', '.swift', '.kt', '.vue', '.svelte',
];
const CONFIG_FILES = [
  'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod',
  'pom.xml', 'build.gradle', 'Gemfile', 'composer.json',
  'pyproject.toml', 'Dockerfile', 'docker-compose.yml', 'README.md',
];

async function fetchRepoTree(owner, repo) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) throw new Error('Repositório não encontrado ou privado.');
  const data = await res.json();
  return data.tree
    .filter(f => {
      if (f.type !== 'blob') return false;
      const name = f.path.split('/').pop();
      if (CONFIG_FILES.includes(name)) return true;
      return RELEVANT_EXTS.some(ext => f.path.endsWith(ext));
    })
    .slice(0, 80);
}

async function fetchFileContent(owner, repo, path) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.encoding === 'base64' && data.content) {
    return atob(data.content.replace(/\n/g, ''));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

function Analyze() {
  const saved = loadSaved();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(saved.currentStep || 0);
  const [results, setResults] = useState(saved.results || {});
  const [analysisId, setAnalysisId] = useState(saved.analysisId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modo: 'upload' ou 'github'
  const [mode, setMode] = useState('upload');

  // GitHub
  const [repoUrl, setRepoUrl] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);
  const [repoFiles, setRepoFiles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState('');

  function persist(newResults, newStep, newId) {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ results: newResults, currentStep: newStep, analysisId: newId })
      );
    } catch {}
  }

  // ── Upload normal ─────────────────────────────────────────────────────────
  const handleUpload = async (files) => {
    setLoading(true);
    setError('');
    setResults({});
    setAnalysisId(null);
    setCurrentStep(1);

    try {
      const formData = new FormData();
      if (Array.isArray(files)) {
        files.forEach((file) => formData.append('files', file));
      } else {
        formData.append('files', files);
      }

      const response = await api.post('/analyze/code', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data || {};
      const id = data.id || null;
      let newResults;
      if (data.steps) {
        newResults = data.steps;
      } else if (data.result) {
        newResults = data.result;
      } else {
        const { id: _id, ...rest } = data;
        newResults = rest;
      }

      setResults(newResults);
      setAnalysisId(id);
      setCurrentStep(6); // etapa 6 = análise concluída; 7 = simulado (opcional)
      persist(newResults, 6, id);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Não foi possível analisar o código. Tente novamente.';
      setError(message);
      setCurrentStep(0);
      persist({}, 0, null);
    } finally {
      setLoading(false);
    }
  };

  // ── Busca árvore do GitHub ────────────────────────────────────────────────
  const handleFetchTree = async () => {
    const parsed = parseRepoUrl(repoUrl.trim());
    if (!parsed) {
      setTreeError('URL inválida. Use: https://github.com/usuario/repositorio');
      return;
    }
    setTreeLoading(true);
    setTreeError('');
    setRepoFiles([]);
    setSelected([]);
    setRepoInfo(parsed);

    try {
      const files = await fetchRepoTree(parsed.owner, parsed.repo);
      setRepoFiles(files.map(f => f.path));
      setSelected(files.map(f => f.path));
    } catch (err) {
      setTreeError(err.message || 'Erro ao buscar repositório.');
    } finally {
      setTreeLoading(false);
    }
  };

  const toggleFile = (path) => {
    setSelected(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const toggleAll = () => {
    setSelected(prev => prev.length === repoFiles.length ? [] : [...repoFiles]);
  };

  // ── Analisa arquivos do GitHub ────────────────────────────────────────────
  const handleAnalyzeGithub = async () => {
    if (!selected.length || !repoInfo) return;
    setLoading(true);
    setError('');
    setResults({});
    setAnalysisId(null);
    setCurrentStep(1);

    try {
      const toFetch = selected.slice(0, 20);
      const contents = await Promise.all(
        toFetch.map(async (path) => {
          const text = await fetchFileContent(repoInfo.owner, repoInfo.repo, path);
          return text ? `### ${path}\n\`\`\`\n${text.slice(0, 3000)}\n\`\`\`` : null;
        })
      );

      const combined = contents.filter(Boolean).join('\n\n');

      const blob = new Blob([combined], { type: 'text/plain' });
      const file = new File([blob], `${repoInfo.repo}.txt`, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('files', file);

      const response = await api.post('/analyze/code', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data || {};
      const id = data.id || null;
      let newResults;
      if (data.steps) {
        newResults = data.steps;
      } else if (data.result) {
        newResults = data.result;
      } else {
        const { id: _id, ...rest } = data;
        newResults = rest;
      }

      setResults(newResults);
      setAnalysisId(id);
      setCurrentStep(6);
      persist(newResults, 6, id);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        'Não foi possível analisar o repositório. Tente novamente.';
      setError(message);
      setCurrentStep(0);
      persist({}, 0, null);
    } finally {
      setLoading(false);
    }
  };

  const handleInterviewClick = () => {
    if (analysisId) {
      navigate(`/interview/${analysisId}`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="analyze">
      <h1 className="analyze__title">Analisar código</h1>
      <p className="analyze__subtitle">
        Envie um arquivo .zip, faça upload dos arquivos ou cole o link de um
        repositório do GitHub para receber uma explicação completa em 6 etapas.
      </p>

      <div className="analyze__notice">
        🔒 Sua chave API nunca sai do seu navegador e não é armazenada por nós.
      </div>

      {/* Seletor de modo */}
      <div className="analyze__mode-tabs">
        <button
          className={`analyze__mode-tab ${mode === 'upload' ? 'analyze__mode-tab--active' : ''}`}
          onClick={() => setMode('upload')}
        >
          📁 Upload de arquivos
        </button>
        <button
          className={`analyze__mode-tab ${mode === 'github' ? 'analyze__mode-tab--active' : ''}`}
          onClick={() => setMode('github')}
        >
          🐙 Link do GitHub
        </button>
      </div>

      {/* Modo upload */}
      {mode === 'upload' && (
        <UploadZone onSubmit={handleUpload} loading={loading} />
      )}

      {/* Modo GitHub */}
      {mode === 'github' && (
        <div className="analyze__github">
          <div className="analyze__github-input-row">
            <input
              type="text"
              className="analyze__github-input"
              placeholder="https://github.com/usuario/repositorio"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetchTree()}
              disabled={treeLoading || loading}
            />
            <button
              className="analyze__github-btn"
              onClick={handleFetchTree}
              disabled={treeLoading || loading || !repoUrl.trim()}
            >
              {treeLoading ? 'Buscando...' : 'Buscar arquivos'}
            </button>
          </div>

          {treeError && <p className="analyze__error">{treeError}</p>}

          {repoFiles.length > 0 && (
            <div className="analyze__filetree">
              <div className="analyze__filetree-header">
                <span>{repoInfo?.owner}/{repoInfo?.repo}</span>
                <button className="analyze__toggle-all" onClick={toggleAll}>
                  {selected.length === repoFiles.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              <div className="analyze__filelist">
                {repoFiles.map(path => (
                  <label key={path} className="analyze__file-item">
                    <input
                      type="checkbox"
                      checked={selected.includes(path)}
                      onChange={() => toggleFile(path)}
                    />
                    <span className="analyze__file-path">{path}</span>
                  </label>
                ))}
              </div>

              <div className="analyze__filetree-footer">
                <span className="analyze__selected-count">
                  {selected.length} arquivo{selected.length !== 1 ? 's' : ''} selecionado{selected.length !== 1 ? 's' : ''}
                </span>
                <button
                  className="analyze__github-analyze-btn"
                  onClick={handleAnalyzeGithub}
                  disabled={!selected.length || loading}
                >
                  {loading ? 'Analisando...' : `Analisar ${selected.length} arquivo${selected.length !== 1 ? 's' : ''} →`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="analyze__error">{error}</p>}

      {currentStep > 0 && (
        <ProgressSteps
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          interviewDone={currentStep === TOTAL_STEPS}
          onInterviewClick={analysisId ? handleInterviewClick : undefined}
        />
      )}

      {/* Botão de simulado — aparece quando análise termina e ainda não foi feito */}
      {currentStep === 6 && analysisId && (
        <div className="analyze__interview-cta">
          <div>
            <strong>⚡ Quer se preparar pra defender esse projeto?</strong>
            <p>Simule uma entrevista técnica baseada no código que você acabou de analisar.</p>
          </div>
          <button className="btn-interview" onClick={handleInterviewClick}>
            Simular entrevista →
          </button>
        </div>
      )}

      {currentStep > 0 && <ResultPanel results={results} />}
    </div>
  );
}

export default Analyze;
