import React, { useState, useRef } from 'react'
import './Analyze.css'

const ALLOWED_EXT = ['.zip', '.js', '.ts', '.py', '.jsx', '.tsx', '.json', '.env', '.txt', '.md', '.yaml', '.yml', '.toml', '.sh']
const MAX_FILES = 30
const MAX_SIZE_MB = 20

export default function UploadZone({ onSubmit, loading }) {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const validate = (fileList) => {
    const valid = []
    for (const f of fileList) {
      const ext = '.' + f.name.split('.').pop().toLowerCase()
      if (!ALLOWED_EXT.includes(ext) && !f.name.endsWith('.zip')) continue
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`${f.name} é muito grande (máx ${MAX_SIZE_MB}MB).`)
        return []
      }
      valid.push(f)
    }
    return valid
  }

  const addFiles = (incoming) => {
    setError('')
    const valid = validate(Array.from(incoming))
    setFiles((prev) => {
      const merged = [...prev, ...valid]
      if (merged.length > MAX_FILES) {
        setError(`Máximo de ${MAX_FILES} arquivos por análise.`)
        return prev
      }
      return merged
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const removeFile = (i) => setFiles((f) => f.filter((_, idx) => idx !== i))

  const handleSubmit = () => {
    if (!files.length) return
    onSubmit(files)
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const fmtSize = (b) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)}KB` : `${(b / (1024 * 1024)).toFixed(1)}MB`

  return (
    <div className="upload-zone-wrapper">
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''} ${files.length ? 'has-files' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !files.length && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          accept={ALLOWED_EXT.join(',')}
          onChange={(e) => addFiles(e.target.files)}
        />

        {!files.length ? (
          <div className="upload-empty">
            <div className="upload-icon">📂</div>
            <p className="upload-title">Arraste arquivos ou clique para selecionar</p>
            <p className="upload-hint">
              Aceita .zip ou arquivos soltos: {ALLOWED_EXT.slice(0, 6).join(', ')}…
            </p>
          </div>
        ) : (
          <div className="file-list" onClick={(e) => e.stopPropagation()}>
            {files.map((f, i) => (
              <div key={i} className="file-item">
                <span className="file-icon">{f.name.endsWith('.zip') ? '📦' : '📄'}</span>
                <span className="file-name">{f.name}</span>
                <span className="file-size">{fmtSize(f.size)}</span>
                <button className="file-remove" onClick={() => removeFile(i)} title="Remover">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}

      {files.length > 0 && (
        <div className="upload-footer">
          <div className="upload-meta">
            <span>{files.length} arquivo{files.length > 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{fmtSize(totalSize)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => inputRef.current.click()}>
              + Adicionar
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])}>
              Limpar tudo
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <><span className="spinner" />Analisando...</> : '⚡ Analisar código'}
          </button>
        </div>
      )}
    </div>
  )
}
