import { useState, useMemo } from 'react'
import { Icons } from './Icons'
import { extractYamlFromSection } from '../utils/parser'

// ── Shared utilities ──────────────────────────────────────────────────────────

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

// ── Type system ───────────────────────────────────────────────────────────────

export const PRIMITIVE_TYPES = ['string', 'text', 'int', 'number', 'boolean', 'date', 'datetime']

export function parseType(typeStr) {
  const t = (typeStr || 'string').trim()
  if (t.startsWith('list:')) {
    const inner = t.slice(5)
    if (inner.startsWith('enum:'))  return { base: 'list', itemBase: 'enum',  itemRef: inner.slice(5) }
    if (inner.startsWith('model:')) return { base: 'list', itemBase: 'model', itemRef: inner.slice(6) }
    return { base: 'list', itemBase: inner || 'string' }
  }
  if (t.startsWith('enum:'))  return { base: 'enum',  ref: t.slice(5) }
  if (t.startsWith('model:')) return { base: 'model', ref: t.slice(6) }
  return { base: t }
}

function buildType(p) {
  if (p.base === 'list') {
    if (p.itemBase === 'enum')  return `list:enum:${p.itemRef  || ''}`
    if (p.itemBase === 'model') return `list:model:${p.itemRef || ''}`
    return `list:${p.itemBase || 'string'}`
  }
  if (p.base === 'enum')  return `enum:${p.ref  || ''}`
  if (p.base === 'model') return `model:${p.ref || ''}`
  return p.base || 'string'
}

// ── Enum parse / serialize ────────────────────────────────────────────────────

export function parseEnums(yaml) {
  if (!yaml || yaml.trim() === 'enums: []') return []
  const lines = yaml.split('\n')
  const enums = []
  let cur = null
  for (const line of lines) {
    if (/^  - id:/.test(line)) {
      if (cur) enums.push(cur)
      cur = { id: unquote(line.replace(/^  - id:\s*/, '')), values: '' }
    } else if (cur) {
      const m = line.match(/^    (\w+):\s*(.*)/)
      if (m) cur[m[1]] = unquote(m[2])
    }
  }
  if (cur) enums.push(cur)
  return enums
}

function serializeEnums(enums) {
  if (!enums.length) return 'enums: []'
  const lines = ['enums:']
  for (const e of enums) {
    lines.push(`  - id: ${serStr(e.id || 'new_enum')}`)
    lines.push(`    values: ${serStr(e.values || '')}`)
  }
  return lines.join('\n')
}

// ── Model parse / serialize ───────────────────────────────────────────────────

function parseModels(yaml) {
  if (!yaml || yaml.trim() === 'models: []') return []
  const lines = yaml.split('\n')
  const models = []
  let model = null, field = null, inFields = false

  const pushField = () => { if (field && model) { model.fields.push(field); field = null } }
  const pushModel = () => { pushField(); if (model) models.push(model); model = null; inFields = false }

  for (const line of lines) {
    if (/^  - id:/.test(line)) {
      pushModel()
      model = { id: unquote(line.replace(/^  - id:\s*/, '')), description: '', fields: [] }
    } else if (model && /^    fields:/.test(line)) {
      inFields = true
    } else if (inFields && /^      - name:/.test(line)) {
      pushField()
      field = { name: unquote(line.replace(/^      - name:\s*/, '')), type: 'string', required: false, description: '', default: '' }
    } else if (inFields && field) {
      const m = line.match(/^        (\w+):\s*(.*)/)
      if (m) {
        const val = unquote(m[2])
        field[m[1]] = m[1] === 'required' ? val === 'true' : val
      }
    } else if (model && !inFields) {
      const m = line.match(/^    (\w+):\s*(.*)/)
      if (m && m[1] !== 'fields') model[m[1]] = unquote(m[2])
    }
  }
  pushModel()
  return models
}

function serializeModels(models) {
  if (!models.length) return 'models: []'
  const lines = ['models:']
  for (const m of models) {
    lines.push(`  - id: ${serStr(m.id || 'new_model')}`)
    lines.push(`    description: ${serStr(m.description)}`)
    if (m.fields && m.fields.length > 0) {
      lines.push(`    fields:`)
      for (const f of m.fields) {
        lines.push(`      - name: ${serStr(f.name || 'field')}`)
        lines.push(`        type: ${serStr(f.type || 'string')}`)
        lines.push(`        required: ${f.required ? 'true' : 'false'}`)
        lines.push(`        description: ${serStr(f.description || '')}`)
        if (f.default) lines.push(`        default: ${serStr(f.default)}`)
      }
    } else {
      lines.push(`    fields: []`)
    }
  }
  return lines.join('\n')
}

function getPrimaryIds(models) {
  const nested = new Set()
  for (const m of models) {
    for (const f of m.fields || []) {
      const t = f.type || ''
      if (t.startsWith('model:'))      nested.add(t.slice(6))
      else if (t.startsWith('list:model:')) nested.add(t.slice(11))
    }
  }
  return new Set(models.map(m => m.id).filter(id => !nested.has(id)))
}

// ── Type Badge ────────────────────────────────────────────────────────────────

export function TypeBadge({ typeStr }) {
  const p = parseType(typeStr)
  let cls = 'type-badge-other'
  if (PRIMITIVE_TYPES.includes(p.base)) cls = `type-badge-${p.base}`
  else if (p.base === 'enum')  cls = 'type-badge-enum'
  else if (p.base === 'model') cls = 'type-badge-model'
  else if (p.base === 'list')  cls = 'type-badge-list'

  const label = p.base === 'list'
    ? `[ ${p.itemBase === 'enum' ? `enum:${p.itemRef}` : p.itemBase === 'model' ? `model:${p.itemRef}` : p.itemBase} ]`
    : p.base === 'enum'  ? `enum:${p.ref}`
    : p.base === 'model' ? `model:${p.ref}`
    : p.base

  return <span className={`type-badge ${cls}`}>{label}</span>
}

// ── Type Selector ─────────────────────────────────────────────────────────────

export function TypeSelector({ value, onChange, enums, models, selfId }) {
  const p = parseType(value)
  const others = (models || []).filter(m => m.id !== selfId)

  const setBase = (base) => {
    if (base === 'enum')  onChange(`enum:${enums[0]?.id  || ''}`)
    else if (base === 'model') onChange(`model:${others[0]?.id || ''}`)
    else if (base === 'list')  onChange('list:string')
    else onChange(base)
  }

  const setListItemBase = (itemBase) => {
    if (itemBase === 'enum')  onChange(`list:enum:${enums[0]?.id  || ''}`)
    else if (itemBase === 'model') onChange(`list:model:${others[0]?.id || ''}`)
    else onChange(`list:${itemBase}`)
  }

  return (
    <div className="type-selector">
      <select className="form-input type-sel" value={p.base} onChange={e => setBase(e.target.value)}>
        <optgroup label="Primitive">
          {PRIMITIVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </optgroup>
        <optgroup label="Reference">
          <option value="enum">enum →</option>
          <option value="model">model →</option>
          <option value="list">list [ ]</option>
        </optgroup>
      </select>

      {p.base === 'enum' && (
        <select className="form-input type-sel-ref" value={p.ref || ''} onChange={e => onChange(buildType({ ...p, ref: e.target.value }))}>
          {enums.length === 0 && <option value="">— no enums —</option>}
          {enums.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
        </select>
      )}

      {p.base === 'model' && (
        <select className="form-input type-sel-ref" value={p.ref || ''} onChange={e => onChange(buildType({ ...p, ref: e.target.value }))}>
          {others.length === 0 && <option value="">— no models —</option>}
          {others.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
        </select>
      )}

      {p.base === 'list' && <>
        <select className="form-input type-sel" value={p.itemBase || 'string'} onChange={e => setListItemBase(e.target.value)}>
          <optgroup label="Primitive">
            {PRIMITIVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
          <optgroup label="Reference">
            <option value="enum">enum →</option>
            <option value="model">model →</option>
          </optgroup>
        </select>
        {p.itemBase === 'enum' && (
          <select className="form-input type-sel-ref" value={p.itemRef || ''} onChange={e => onChange(buildType({ ...p, itemRef: e.target.value }))}>
            {enums.length === 0 && <option value="">— no enums —</option>}
            {enums.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
          </select>
        )}
        {p.itemBase === 'model' && (
          <select className="form-input type-sel-ref" value={p.itemRef || ''} onChange={e => onChange(buildType({ ...p, itemRef: e.target.value }))}>
            {others.length === 0 && <option value="">— no models —</option>}
            {others.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>
        )}
      </>}
    </div>
  )
}

// ── Field Row ─────────────────────────────────────────────────────────────────

function FieldRow({ field, onChange, onRemove, enums, models, selfId }) {
  const [showDesc, setShowDesc] = useState(!!field.description)
  const [showDefault, setShowDefault] = useState(!!field.default)
  return (
    <div className="field-row">
      <div className="field-row-main">
        <input
          className="form-input field-name-input"
          value={field.name || ''}
          onChange={e => onChange({ ...field, name: e.target.value })}
          placeholder="field_name"
        />
        <TypeSelector
          value={field.type || 'string'}
          onChange={type => onChange({ ...field, type })}
          enums={enums}
          models={models}
          selfId={selfId}
        />
        <label className="field-req-toggle" title="Required">
          <input
            type="checkbox"
            checked={!!field.required}
            onChange={e => onChange({ ...field, required: e.target.checked })}
          />
          <span>req</span>
        </label>
        <button
          className={`btn sm field-desc-btn${showDefault ? ' active' : ''}${field.default ? ' has-desc' : ''}`}
          onClick={() => setShowDefault(d => !d)}
          title="Default value"
        >def</button>
        <button
          className={`btn sm field-desc-btn${showDesc ? ' active' : ''}${field.description ? ' has-desc' : ''}`}
          onClick={() => setShowDesc(d => !d)}
          title="Description"
        >···</button>
        <button className="btn sm danger" onClick={onRemove} title="Remove">{Icons.trash}</button>
      </div>
      {showDefault && (
        <input
          className="form-input field-desc-input"
          value={field.default || ''}
          onChange={e => onChange({ ...field, default: e.target.value })}
          placeholder="Default value..."
          autoFocus={!field.default}
        />
      )}
      {showDesc && (
        <input
          className="form-input field-desc-input"
          value={field.description || ''}
          onChange={e => onChange({ ...field, description: e.target.value })}
          placeholder="Field description..."
          autoFocus={!field.description}
        />
      )}
    </div>
  )
}

// ── Model Item ────────────────────────────────────────────────────────────────

function ModelItem({ model, onChange, onRemove, onDuplicate, enums, models, isPrimary }) {
  const [expanded, setExpanded] = useState(true)

  const addField = () => onChange({
    ...model,
    fields: [...(model.fields || []), { name: 'field', type: 'string', required: false, description: '', default: '' }],
  })
  const updateField = (i, f) => onChange({ ...model, fields: model.fields.map((x, idx) => idx === i ? f : x) })
  const removeField = (i) => onChange({ ...model, fields: model.fields.filter((_, idx) => idx !== i) })

  return (
    <div className="model-item">
      <div className="model-item-header" onClick={() => setExpanded(e => !e)}>
        <span className="feature-chevron" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}>
          {Icons.chevron}
        </span>
        <span className="model-item-id">{model.id || 'untitled'}</span>
        {isPrimary && <span className="model-primary-badge">PRIMARY</span>}
        <div className="feature-item-actions" onClick={e => e.stopPropagation()}>
          <button className="btn sm" onClick={onDuplicate} title="Duplicate">{Icons.duplicate}</button>
          <button className="btn sm danger" onClick={onRemove} title="Remove">{Icons.trash}</button>
        </div>
      </div>

      {expanded && (
        <div className="model-item-body">
          <div className="model-meta-row">
            <div className="feature-field" style={{ flex: '0 0 180px' }}>
              <label className="feature-field-label">ID / Name</label>
              <input
                className="form-input"
                value={model.id || ''}
                onChange={e => onChange({ ...model, id: e.target.value })}
                placeholder="model_id"
              />
            </div>
            <div className="feature-field" style={{ flex: 1 }}>
              <label className="feature-field-label">Description</label>
              <input
                className="form-input"
                value={model.description || ''}
                onChange={e => onChange({ ...model, description: e.target.value })}
                placeholder="What does this model represent?"
              />
            </div>
          </div>

          <div className="model-fields-section">
            {(model.fields || []).length > 0 && (
              <div className="model-fields-head">
                <span style={{ width: 120, flexShrink: 0 }}>name</span>
                <span style={{ flex: 1 }}>type</span>
                <span style={{ width: 36, flexShrink: 0 }}>req</span>
                <span style={{ width: 74, flexShrink: 0 }} />
              </div>
            )}
            {(model.fields || []).map((f, i) => (
              <FieldRow
                key={i}
                field={f}
                onChange={u => updateField(i, u)}
                onRemove={() => removeField(i)}
                enums={enums}
                models={models}
                selfId={model.id}
              />
            ))}
            <button className="btn sm" style={{ marginTop: 6 }} onClick={addField}>
              {Icons.plus} Add Field
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Enum Item ─────────────────────────────────────────────────────────────────

function EnumItem({ enumDef, onChange, onRemove }) {
  const [newVal, setNewVal] = useState('')
  const values = enumDef.values
    ? enumDef.values.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const addValue = () => {
    const v = newVal.trim()
    if (!v || values.includes(v)) return
    onChange({ ...enumDef, values: [...values, v].join(', ') })
    setNewVal('')
  }
  const removeValue = (v) => onChange({ ...enumDef, values: values.filter(x => x !== v).join(', ') })

  return (
    <div className="enum-item">
      <div className="enum-item-header">
        <span className="feature-item-kind">enum</span>
        <input
          className="form-input enum-id-input"
          value={enumDef.id || ''}
          onChange={e => onChange({ ...enumDef, id: e.target.value })}
          placeholder="enum_id"
        />
        <button className="btn sm danger" style={{ marginLeft: 'auto' }} onClick={onRemove} title="Remove">{Icons.trash}</button>
      </div>
      <div className="enum-values">
        <div className="enum-chips">
          {values.map(v => (
            <span key={v} className="enum-value-chip">
              {v}
              <button className="enum-chip-del" onClick={() => removeValue(v)}>×</button>
            </span>
          ))}
          <div className="enum-add-row">
            <input
              className="form-input"
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addValue()}
              placeholder="add value…"
              style={{ width: 110 }}
            />
            <button className="btn sm" onClick={addValue}>{Icons.plus}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EnumEditor (named export) ─────────────────────────────────────────────────

export function EnumEditor({ content, onChange }) {
  const [mode, setMode] = useState('form')
  const yaml = extractYamlFromSection(content)

  const enums = useMemo(() => {
    try { return parseEnums(yaml) } catch { return [] }
  }, [yaml])

  const update = (next) => onChange(applyYaml(content, serializeEnums(next)))
  const addEnum   = ()     => update([...enums, { id: 'new_enum', values: '' }])
  const removeEnum = (i)   => update(enums.filter((_, idx) => idx !== i))
  const updateEnum = (i, e) => update(enums.map((x, idx) => idx === i ? e : x))

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
        <div className="enum-editor">
          {enums.map((e, i) => (
            <EnumItem
              key={i}
              enumDef={e}
              onChange={u => updateEnum(i, u)}
              onRemove={() => removeEnum(i)}
            />
          ))}
          <button className="btn add-section-btn" style={{ marginTop: enums.length ? 8 : 0 }} onClick={addEnum}>
            {Icons.plus} Add Enum
          </button>
        </div>
      )}
    </div>
  )
}

// ── DataModelEditor (default export) ─────────────────────────────────────────

export default function DataModelEditor({ content, onChange, docSections }) {
  const [mode, setMode] = useState('form')
  const yaml = extractYamlFromSection(content)

  // Extract enums from the sibling enums section of the same document
  const docEnums = useMemo(() => {
    const enumSec = (docSections || []).find(s => s.heading.toLowerCase() === 'enums')
    if (!enumSec) return []
    const enumYaml = extractYamlFromSection(enumSec.content)
    try { return enumYaml ? parseEnums(enumYaml) : [] } catch { return [] }
  }, [docSections])

  const models = useMemo(() => {
    try { return parseModels(yaml) } catch { return [] }
  }, [yaml])

  const primaryIds = useMemo(() => getPrimaryIds(models), [models])

  const update = (next) => onChange(applyYaml(content, serializeModels(next)))
  const addModel      = ()     => update([...models, { id: 'new_model', description: '', fields: [] }])
  const removeModel   = (i)   => update(models.filter((_, idx) => idx !== i))
  const updateModel   = (i, m) => update(models.map((x, idx) => idx === i ? m : x))
  const duplicateModel = (i)  => {
    const copy = { ...models[i], id: models[i].id + '_copy', fields: [...(models[i].fields || [])] }
    const next = [...models]; next.splice(i + 1, 0, copy); update(next)
  }

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
          {models.map((model, i) => (
            <ModelItem
              key={i}
              model={model}
              onChange={m => updateModel(i, m)}
              onRemove={() => removeModel(i)}
              onDuplicate={() => duplicateModel(i)}
              enums={docEnums}
              models={models}
              isPrimary={primaryIds.has(model.id)}
            />
          ))}
          <button className="btn add-section-btn" style={{ marginTop: models.length ? 8 : 0 }} onClick={addModel}>
            {Icons.plus} Add Model
          </button>
        </div>
      )}
    </div>
  )
}
