import { useState, useMemo } from 'react'
import { Icons } from './Icons'
import { extractYamlFromSection } from '../utils/parser'
import { TypeSelector, PRIMITIVE_TYPES } from './DataModelEditor'

// ── Utilities ────────────────────────────────────────────────────────────────

function unquote(s) {
  s = (s || '').trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  return s
}

function serStr(v) {
  if (!v && v !== 0) return '""'
  const s = String(v)
  if (/^[\w]+$/.test(s)) return s
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
}

function applyYaml(content, newYaml) {
  if (content && content.includes('```yaml')) {
    return content.replace(/```yaml\n[\s\S]*?```/, '```yaml\n' + newYaml + '\n```')
  }
  return '```yaml\n' + newYaml + '\n```'
}

// ── Column configs per (docType, sectionKey) ─────────────────────────────────

const COLUMN_CONFIGS = {
  'page:params':      { cols: ['name', 'type', 'source', 'required', 'default'], sourceOptions: ['route', 'query', 'prop', 'state'] },
  'page:state':       { cols: ['name', 'type', 'default'] },
  'component:params': { cols: ['name', 'type', 'required', 'default'] },
  'component:state':  { cols: ['name', 'type', 'default'] },
  'function:inputs':  { cols: ['name', 'type', 'default'] },
  'function:outputs': { cols: ['name', 'type'] },
}

function getConfig(docType, sectionKey) {
  return COLUMN_CONFIGS[`${docType}:${sectionKey}`] || null
}

// ── Parse / Serialize ────────────────────────────────────────────────────────

function parseItems(yaml, sectionKey) {
  if (!yaml || yaml.trim() === `${sectionKey}: []`) return []
  const lines = yaml.split('\n')
  const items = []
  let cur = null

  for (const line of lines) {
    if (/^  - name:/.test(line)) {
      if (cur) items.push(cur)
      cur = { name: unquote(line.replace(/^  - name:\s*/, '')), type: 'string', source: '', required: false, default: '' }
    } else if (cur) {
      const m = line.match(/^    (\w+):\s*(.*)/)
      if (m) {
        const val = unquote(m[2])
        cur[m[1]] = m[1] === 'required' ? val === 'true' : val
      }
    }
  }
  if (cur) items.push(cur)
  return items
}

function serializeItems(items, sectionKey, cols) {
  if (!items.length) return `${sectionKey}: []`
  const lines = [`${sectionKey}:`]
  for (const item of items) {
    lines.push(`  - name: ${serStr(item.name || 'field')}`)
    lines.push(`    type: ${serStr(item.type || 'string')}`)
    if (cols.includes('source')) lines.push(`    source: ${serStr(item.source || '')}`)
    if (cols.includes('required')) lines.push(`    required: ${item.required ? 'true' : 'false'}`)
    if (item.default) lines.push(`    default: ${serStr(item.default)}`)
  }
  return lines.join('\n')
}

// ── Field Row ────────────────────────────────────────────────────────────────

function TypedFieldRow({ item, cols, sourceOptions, onChange, onRemove, enums, models }) {
  const [showDefault, setShowDefault] = useState(!!item.default)
  return (
    <div className="field-row">
      <div className="field-row-main">
        <input
          className="form-input field-name-input"
          value={item.name || ''}
          onChange={e => onChange({ ...item, name: e.target.value })}
          placeholder="field_name"
        />
        <TypeSelector
          value={item.type || 'string'}
          onChange={type => onChange({ ...item, type })}
          enums={enums}
          models={models}
        />
        {cols.includes('source') && (
          <select
            className="form-input typed-source-sel"
            value={item.source || ''}
            onChange={e => onChange({ ...item, source: e.target.value })}
          >
            <option value="">source</option>
            {(sourceOptions || []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {cols.includes('required') && (
          <label className="field-req-toggle" title="Required">
            <input
              type="checkbox"
              checked={!!item.required}
              onChange={e => onChange({ ...item, required: e.target.checked })}
            />
            <span>req</span>
          </label>
        )}
        <button
          className={`btn sm field-desc-btn${showDefault ? ' active' : ''}${item.default ? ' has-desc' : ''}`}
          onClick={() => setShowDefault(d => !d)}
          title="Default value"
        >def</button>
        <button className="btn sm danger" onClick={onRemove} title="Remove">{Icons.trash}</button>
      </div>
      {showDefault && (
        <input
          className="form-input field-desc-input"
          value={item.default || ''}
          onChange={e => onChange({ ...item, default: e.target.value })}
          placeholder="Default value..."
          autoFocus={!item.default}
        />
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function TypedFieldsEditor({ content, onChange, docType, sectionKey, allEnums, allModels }) {
  const [mode, setMode] = useState('form')
  const yaml = extractYamlFromSection(content)
  const config = getConfig(docType, sectionKey)
  const cols = config?.cols || ['name', 'type', 'default']

  const items = useMemo(() => {
    try { return parseItems(yaml, sectionKey) } catch { return [] }
  }, [yaml, sectionKey])

  const update = (next) => onChange(applyYaml(content, serializeItems(next, sectionKey, cols)))
  const addItem = () => {
    const item = { name: 'field', type: 'string', default: '' }
    if (cols.includes('source')) item.source = ''
    if (cols.includes('required')) item.required = false
    update([...items, item])
  }
  const removeItem = (i) => update(items.filter((_, idx) => idx !== i))
  const updateItem = (i, item) => update(items.map((x, idx) => idx === i ? item : x))

  // Build column header spans
  const headerCols = []
  headerCols.push(<span key="name" style={{ width: 120, flexShrink: 0 }}>name</span>)
  headerCols.push(<span key="type" style={{ flex: 1 }}>type</span>)
  if (cols.includes('source')) headerCols.push(<span key="source" style={{ width: 80, flexShrink: 0 }}>source</span>)
  if (cols.includes('required')) headerCols.push(<span key="req" style={{ width: 36, flexShrink: 0 }}>req</span>)
  headerCols.push(<span key="actions" style={{ width: 52, flexShrink: 0 }} />)

  return (
    <div>
      <div className="dm-mode-bar">
        <button className={`mode-tab${mode === 'form' ? ' active' : ''}`} onClick={() => setMode('form')}>Form</button>
        <button className={`mode-tab${mode === 'yaml' ? ' active' : ''}`} onClick={() => setMode('yaml')}>YAML</button>
      </div>
      {mode === 'yaml' ? (
        <textarea
          className="yaml-editor"
          style={{ marginTop: 8 }}
          value={yaml || ''}
          onChange={e => onChange(applyYaml(content, e.target.value))}
          spellCheck={false}
        />
      ) : (
        <div className="datamodel-editor">
          {items.length > 0 && (
            <div className="model-fields-head" style={{ marginBottom: 2 }}>
              {headerCols}
            </div>
          )}
          {items.map((item, i) => (
            <TypedFieldRow
              key={i}
              item={item}
              cols={cols}
              sourceOptions={config?.sourceOptions}
              onChange={u => updateItem(i, u)}
              onRemove={() => removeItem(i)}
              enums={allEnums || []}
              models={allModels || []}
            />
          ))}
          <button className="btn sm" style={{ marginTop: 6 }} onClick={addItem}>
            {Icons.plus} Add Field
          </button>
        </div>
      )}
    </div>
  )
}

export { getConfig as hasTypedFieldsConfig }
