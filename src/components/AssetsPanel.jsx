import { useState, useRef, useCallback } from 'react'
import { Icons } from './Icons'

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
const CODE_EXTS  = new Set(['html', 'jsx', 'tsx', 'js', 'ts', 'css'])

function getExt(path) { return path.split('.').pop().toLowerCase() }
function isImagePath(path) { return IMAGE_EXTS.has(getExt(path)) }
function isCodePath(path) { return CODE_EXTS.has(getExt(path)) }

function getImageNum(path, basename) {
  const fname = path.split('/').pop()
  const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = fname.match(new RegExp('^' + escaped + '-(\\d+)\\.'))
  return m ? parseInt(m[1]) : 0
}

function nextImageNumber(imageFiles, basename) {
  let max = 0
  imageFiles.forEach(f => { max = Math.max(max, getImageNum(f.path, basename)) })
  return max + 1
}

const CODE_COLORS = {
  html: '#FB923C', jsx: '#60A5FA', tsx: '#60A5FA',
  js: '#FBBF24',  ts: '#60A5FA', css: '#A78BFA',
}

function ExtBadge({ ext }) {
  return (
    <span className="asset-ext-badge" style={{ color: CODE_COLORS[ext] || 'var(--text-muted)' }}>
      .{ext}
    </span>
  )
}

// ── CodeFile ──────────────────────────────────────────────────────────────────
function CodeFile({ file, onUpdate, onDelete, readOnly }) {
  const [expanded, setExpanded] = useState(true)
  const ext = getExt(file.path)
  const fname = file.path.split('/').pop()

  return (
    <div className="asset-code-file">
      <div className="asset-code-file-header" onClick={() => setExpanded(v => !v)}>
        <span className={`asset-chevron${expanded ? ' open' : ''}`}>{Icons.chevron}</span>
        <ExtBadge ext={ext} />
        <span className="asset-code-fname">{fname}</span>
        {!readOnly && (
          <button
            className="btn sm danger asset-del-btn"
            title="Delete code file"
            onClick={e => { e.stopPropagation(); if (confirm(`Delete ${fname}?`)) onDelete() }}
          >
            {Icons.trash}
          </button>
        )}
      </div>
      {expanded && (
        <textarea
          className="asset-code-editor"
          value={file.content}
          onChange={e => !readOnly && onUpdate(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          placeholder={`// ${fname} — reference code`}
        />
      )}
    </div>
  )
}

// ── AssetsPanel ───────────────────────────────────────────────────────────────
export default function AssetsPanel({ currentFile, files, onAddAsset, onUpdateFile, onDeleteFile, readOnly }) {
  const [expanded, setExpanded] = useState(true)
  const [lightbox, setLightbox]  = useState(null)
  const imgRef  = useRef(null)
  const codeRef = useRef(null)

  const folder   = currentFile.path.split('/').slice(0, -1).join('/')
  const fname    = currentFile.path.split('/').pop()
  const basename = fname.replace(/\.[^.]+$/, '')

  const assetsFolder = folder + '/assets'
  const codeFolder   = folder + '/code'

  const imageFiles = files
    .filter(f => f.path.startsWith(assetsFolder + '/' + basename + '-') && isImagePath(f.path))
    .sort((a, b) => getImageNum(a.path, basename) - getImageNum(b.path, basename))

  const codeFiles = files
    .filter(f => f.path.startsWith(codeFolder + '/' + basename + '.') && isCodePath(f.path))
    .sort((a, b) => a.path.localeCompare(b.path))

  const total = imageFiles.length + codeFiles.length

  // ── Upload handlers ────────────────────────────────────────────────────────

  const handleImgUpload = useCallback((e) => {
    const uploads = Array.from(e.target.files)
    let nextNum = nextImageNumber(imageFiles, basename)
    uploads.forEach(file => {
      const ext = getExt(file.name)
      if (!IMAGE_EXTS.has(ext)) return
      const path = assetsFolder + '/' + basename + '-' + (nextNum++) + '.' + ext
      const reader = new FileReader()
      reader.onload = ev => onAddAsset(path, ev.target.result)
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }, [imageFiles, basename, assetsFolder, onAddAsset])

  const handleCodeUpload = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const ext = getExt(file.name)
    if (!CODE_EXTS.has(ext)) return
    const path = codeFolder + '/' + basename + '.' + ext
    const reader = new FileReader()
    reader.onload = ev => {
      if (files.some(f => f.path === path)) onUpdateFile(path, ev.target.result)
      else onAddAsset(path, ev.target.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [codeFolder, basename, files, onAddAsset, onUpdateFile])

  const createCodeFile = useCallback((ext) => {
    const path = codeFolder + '/' + basename + '.' + ext
    if (files.some(f => f.path === path)) return // already exists
    const placeholder = ext === 'html'
      ? `<!-- ${basename} reference markup -->\n<div class="${basename}">\n\n</div>`
      : `// ${basename} reference\n`
    onAddAsset(path, placeholder)
  }, [codeFolder, basename, files, onAddAsset])

  return (
    <div className="assets-panel">
      {/* Header */}
      <div className="assets-panel-hdr" onClick={() => setExpanded(v => !v)}>
        <span className={`asset-chevron${expanded ? ' open' : ''}`}>{Icons.chevron}</span>
        <span className="assets-panel-title">{Icons.image} Reference Assets</span>
        {total > 0 && <span className="assets-total-badge">{total}</span>}
        {!readOnly && (
          <div className="assets-hdr-actions" onClick={e => e.stopPropagation()}>
            <label className="btn sm" title="Upload image(s)">
              {Icons.image}
              <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImgUpload} />
            </label>
            <button className="btn sm" title="Create HTML reference" onClick={() => createCodeFile('html')}>HTML</button>
            <button className="btn sm" title="Create JSX reference"  onClick={() => createCodeFile('jsx')}>JSX</button>
            <label className="btn sm" title="Upload code file">
              {Icons.upload}
              <input ref={codeRef} type="file" accept=".html,.jsx,.tsx,.js,.ts,.css" style={{ display: 'none' }} onChange={handleCodeUpload} />
            </label>
          </div>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div className="assets-panel-body">
          {total === 0 && (
            <div className="assets-empty">
              No reference assets yet.{!readOnly && ' Add images (wireframes/mockups) or code snippets above.'}
            </div>
          )}

          {/* Image gallery */}
          {imageFiles.length > 0 && (
            <div className="assets-img-grid">
              {imageFiles.map((f, i) => (
                <div key={f.path} className="asset-thumb" title={f.path.split('/').pop()}>
                  <img src={f.content} alt={f.path.split('/').pop()} onClick={() => setLightbox(f)} />
                  <span className="asset-thumb-num">{i + 1}</span>
                  {!readOnly && (
                    <button
                      className="asset-thumb-del"
                      title="Remove image"
                      onClick={() => { if (confirm('Remove this image?')) onDeleteFile(f.path) }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Code files */}
          {codeFiles.map(f => (
            <CodeFile
              key={f.path}
              file={f}
              onUpdate={content => onUpdateFile(f.path, content)}
              onDelete={() => onDeleteFile(f.path)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-box" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>×</button>
            <img src={lightbox.content} alt={lightbox.path.split('/').pop()} />
            <div className="lightbox-caption">{lightbox.path}</div>
          </div>
        </div>
      )}
    </div>
  )
}
