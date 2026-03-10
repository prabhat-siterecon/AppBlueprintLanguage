import React, { useState, useMemo, useId, useEffect } from 'react'
import { Icons } from './Icons'
import { extractYamlFromSection, isSectionEmpty } from '../utils/parser'
import { parseYamlSection, serializeYamlSection } from '../utils/yamlForm'
import FeatureEditor from './FeatureEditor'
import DataModelEditor, { EnumEditor } from './DataModelEditor'
import TypedFieldsEditor, { hasTypedFieldsConfig } from './TypedFieldsEditor'
import CompositionEditor from './CompositionEditor'
import ServiceEditor from './ServiceEditor'

// ── SearchSelect ──────────────────────────────────────────────────────────────

function SearchSelect({ value, onChange, options, placeholder, className }) {
  const id = useId()
  return (
    <>
      <input
        list={id}
        className={className || 'form-input'}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
      />
      <datalist id={id}>
        {(options || []).map(o => <option key={o} value={o} />)}
      </datalist>
    </>
  )
}

// ── ActionStepsEditor ─────────────────────────────────────────────────────────

const STEP_TYPES = ['guard', 'api_call', 'transform', 'state_update', 'navigation']

function unq(s) {
  s = (s || '').trim()
  if ((s[0] === '"' && s.slice(-1) === '"') || (s[0] === "'" && s.slice(-1) === "'")) return s.slice(1, -1)
  return s
}

function serStep(v) {
  if (!v) return ''
  const s = String(v)
  if (/^[\w.\-/]+$/.test(s)) return s
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function parseActionSteps(yaml) {
  if (!yaml || yaml.trim() === 'steps: []') return []
  const lines = yaml.split('\n')
  const items = []
  let cur = null
  for (const line of lines) {
    if (/^  - id:/.test(line)) {
      if (cur) items.push(cur)
      cur = { id: unq(line.replace(/^  - id:\s*/, '')), type: 'api_call', description: '', ref: '' }
    } else if (cur) {
      const m = line.match(/^    (\w+):\s*(.*)/)
      if (m) cur[m[1]] = unq(m[2])
    }
  }
  if (cur) items.push(cur)
  return items
}

function serActionSteps(items) {
  if (!items.length) return 'steps: []'
  const lines = ['steps:']
  for (const it of items) {
    lines.push(`  - id: ${serStep(it.id || 'step')}`)
    lines.push(`    type: ${it.type || 'api_call'}`)
    if (it.description) lines.push(`    description: ${serStep(it.description)}`)
    if (it.ref) lines.push(`    ref: ${serStep(it.ref)}`)
  }
  return lines.join('\n')
}

function getStepRefConfig(stepType, refOptions) {
  // Combine service doc IDs + svc.endpoint refs for api calls
  const apiOpts = [...(refOptions?.service || []), ...(refOptions?.serviceEndpoints || [])]
  switch (stepType) {
    case 'api_call':    return { opts: apiOpts, ph: 'svc_id or svc_id.endpoint_id' }
    case 'guard':
    case 'transform':   return { opts: refOptions?.function || [], ph: 'function_id' }
    case 'navigation':  return { opts: refOptions?.page     || [], ph: 'page_id' }
    case 'state_update':return { opts: [], ph: 'state.key' }
    default:            return { opts: [...(refOptions?.function || []), ...apiOpts], ph: 'ref_id' }
  }
}

function ActionStepRow({ item, onChange, onRemove, refOptions }) {
  const { opts, ph } = getStepRefConfig(item.type, refOptions)
  return (
    <div className="field-row">
      <div className="field-row-main">
        <input
          className="form-input field-name-input"
          value={item.id || ''}
          onChange={e => onChange({ ...item, id: e.target.value })}
          placeholder="step_id"
          style={{ width: 100, flexShrink: 0 }}
        />
        <select
          className="form-input"
          style={{ width: 110, flexShrink: 0 }}
          value={item.type || 'api_call'}
          onChange={e => onChange({ ...item, type: e.target.value, ref: '' })}
        >
          {STEP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          className="form-input"
          value={item.description || ''}
          onChange={e => onChange({ ...item, description: e.target.value })}
          placeholder="description"
          style={{ flex: 1 }}
        />
        <SearchSelect
          value={item.ref || ''}
          onChange={v => onChange({ ...item, ref: v })}
          options={opts}
          placeholder={ph}
          className="form-input"
        />
        <button className="btn sm danger" onClick={onRemove} title="Remove">{Icons.trash}</button>
      </div>
    </div>
  )
}

function ActionStepsEditor({ content, onChange, refOptions }) {
  const [mode, setMode] = useState('form')
  const yaml = extractYamlFromSection(content)

  const items = useMemo(() => {
    try { return parseActionSteps(yaml) } catch { return [] }
  }, [yaml])

  const applyYaml = (newYaml) => {
    if (content && content.includes('```yaml'))
      return onChange(content.replace(/```yaml\n[\s\S]*?```/, '```yaml\n' + newYaml + '\n```'))
    onChange('```yaml\n' + newYaml + '\n```')
  }

  const update = (next) => applyYaml(serActionSteps(next))
  const addItem = () => update([...items, { id: 'step_' + (items.length + 1), type: 'api_call', description: '', ref: '' }])
  const removeItem = (i) => update(items.filter((_, idx) => idx !== i))
  const updateItem = (i, item) => update(items.map((x, idx) => idx === i ? item : x))

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
          onChange={e => applyYaml(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <div className="datamodel-editor">
          {items.length > 0 && (
            <div className="model-fields-head" style={{ marginBottom: 2 }}>
              <span style={{ width: 100, flexShrink: 0 }}>id</span>
              <span style={{ width: 110, flexShrink: 0 }}>type</span>
              <span style={{ flex: 1 }}>description</span>
              <span style={{ flex: 1 }}>ref</span>
              <span style={{ width: 32, flexShrink: 0 }} />
            </div>
          )}
          {items.map((item, i) => (
            <ActionStepRow
              key={i}
              item={item}
              onChange={u => updateItem(i, u)}
              onRemove={() => removeItem(i)}
              refOptions={refOptions}
            />
          ))}
          <button className="btn sm" style={{ marginTop: 6 }} onClick={addItem}>
            {Icons.plus} Add Step
          </button>
        </div>
      )}
    </div>
  )
}

// ── SectionEditor ─────────────────────────────────────────────────────────────

export default function SectionEditor({ heading, content, onChange, schema, isActive, onActivate, refOptions, docType, docSections, allEnums, allModels, readOnly, isCustom, onDelete, onRename, collapseSignal, expandSignal }) {
  const [expanded, setExpanded] = useState(true)
  const [formMode, setFormMode] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(heading)

  useEffect(() => { if (collapseSignal > 0) setExpanded(false) }, [collapseSignal])
  useEffect(() => { if (expandSignal > 0 && !content.trimStart().startsWith('<!-- disabled - not applicable -->')) setExpanded(true) }, [expandSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  const SKIP_MARKER     = '<!-- skip -->'
  const DISABLED_MARKER = '<!-- disabled - not applicable -->'

  // Parse markers — disabled takes outer position, skip is nested inside
  const contentStart  = content.trimStart()
  const isDisabled    = contentStart.startsWith(DISABLED_MARKER)
  const afterDisabled = isDisabled ? contentStart.slice(DISABLED_MARKER.length).trimStart() : contentStart
  const isSkipped     = afterDisabled.startsWith(SKIP_MARKER)
  const effectiveContent = isSkipped ? afterDisabled.slice(SKIP_MARKER.length).trimStart() : afterDisabled

  // Toggle skip (mutually exclusive with disable)
  const toggleSkip = () => {
    if (isSkipped) {
      onChange(isDisabled ? DISABLED_MARKER + '\n' + effectiveContent : effectiveContent)
    } else {
      onChange(SKIP_MARKER + '\n' + effectiveContent) // remove disabled if present
    }
  }

  // Toggle disable — collapses the section, strips both markers from stored content
  const toggleDisable = () => {
    if (isDisabled) {
      // Enable: restore clean effective content (no disabled marker)
      onChange(effectiveContent)
    } else {
      // Disable: store with disabled marker, collapse, strip skip marker
      onChange(DISABLED_MARKER + '\n' + effectiveContent)
      setExpanded(false)
    }
  }

  const empty = isSectionEmpty(effectiveContent)
  const yaml = extractYamlFromSection(effectiveContent)
  const sectionKey = heading.toLowerCase().replace(/\s+/g, '_')
  const fieldTypes = schema?.fieldTypes?.[sectionKey] || {}
  const hasSchema = Object.keys(fieldTypes).filter(k => k !== '_array').length > 0

  const parsed = useMemo(() => {
    if (!yaml || !hasSchema) return null
    try { return parseYamlSection(yaml, !!fieldTypes._array) } catch { return null }
  }, [yaml, hasSchema, fieldTypes._array])

  const canForm = formMode && parsed !== null
  const isTypedFields = !!hasTypedFieldsConfig(docType, sectionKey)
  const isComposition = sectionKey === 'composition'
  const isService = docType === 'service' && (sectionKey === 'services' || sectionKey === 'queries')
  const isActionSteps = docType === 'action' && sectionKey === 'steps'

  const handleYamlChange = (newYaml) => {
    const newContent = effectiveContent.replace(/```yaml\n[\s\S]*?```/, '```yaml\n' + newYaml + '\n```')
    onChange(isSkipped ? SKIP_MARKER + '\n' + newContent : newContent)
  }

  const handleFormChange = (newParsed) => {
    handleYamlChange(serializeYamlSection(newParsed))
  }

  return (
    <div
      className={`editor-section ${empty ? 'empty' : ''} ${isActive ? 'section-active' : ''} ${isSkipped ? 'section-skipped' : ''} ${isDisabled ? 'section-disabled' : ''}`}
      onClick={!isDisabled ? onActivate : undefined}
    >
      <div
        className="section-header"
        style={{ cursor: 'pointer' }}
        onClick={e => {
          e.stopPropagation()
          if (!isDisabled) { onActivate?.(); setExpanded(ex => !ex) }
        }}
      >
        <h3>
          {!isDisabled && (
            <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-flex', transition: 'transform 0.15s' }}>
              {Icons.chevron}
            </span>
          )}
          {isDisabled && <span className="section-disabled-icon">—</span>}
          {renaming ? (
            <input
              className="section-rename-input"
              value={renameVal}
              autoFocus
              onChange={e => setRenameVal(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter') { onRename(renameVal); setRenaming(false) }
                if (e.key === 'Escape') { setRenameVal(heading); setRenaming(false) }
              }}
              onBlur={() => { onRename(renameVal); setRenaming(false) }}
            />
          ) : (
            <span style={isDisabled ? { textDecoration: 'line-through', opacity: 0.6 } : {}}>{heading}</span>
          )}
          {isDisabled && <span className="section-na-badge">N/A</span>}
          {!isDisabled && empty && !renaming && <span className="empty-badge">EMPTY</span>}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isDisabled && sectionKey !== 'features' && !(docType === 'datamodel' && (sectionKey === 'models' || sectionKey === 'enums')) && !isTypedFields && !isComposition && !isService && !isActionSteps && (
            <>
              {hasSchema && yaml !== null && (
                <div className="mode-tabs" onClick={e => e.stopPropagation()}>
                  <button className={'mode-tab' + (!formMode ? ' active' : '')} onClick={() => setFormMode(false)}>YAML</button>
                  <button className={'mode-tab' + (formMode ? ' active' : '')} onClick={() => setFormMode(true)}>Form</button>
                </div>
              )}
              {!formMode && hasSchema && (
                <div className="schema-hint">
                  {Object.entries(fieldTypes).filter(([k]) => k !== '_array').map(([k, v]) => (
                    <span key={k} className="schema-chip">{k}: {v}</span>
                  ))}
                </div>
              )}
            </>
          )}
          {!readOnly && (
            <div className="section-custom-actions" onClick={e => e.stopPropagation()}>
              {isDisabled ? (
                <button
                  className="btn sm section-enable-btn"
                  title="Re-enable this section"
                  onClick={toggleDisable}
                >Enable</button>
              ) : (<>
                <button
                  className={`btn sm${isSkipped ? ' active' : ''}`}
                  title={isSkipped ? 'Mark active' : 'Mark for later'}
                  onClick={toggleSkip}
                  style={isSkipped ? { color: 'var(--yellow)' } : {}}
                >later</button>
                <button
                  className="btn sm section-disable-btn"
                  title="Mark as not applicable"
                  onClick={toggleDisable}
                >N/A</button>
                {isCustom && (<>
                  <button
                    className="btn sm"
                    title="Rename section"
                    onClick={() => { setRenameVal(heading); setRenaming(true) }}
                  >{Icons.edit}</button>
                  <button
                    className="btn sm danger"
                    title="Delete section"
                    onClick={() => { if (confirm(`Delete section "${heading}"?`)) onDelete() }}
                  >{Icons.trash}</button>
                </>)}
              </>)}
            </div>
          )}
        </div>
      </div>
      {expanded && !isDisabled && (
        <div className={`section-body${isSkipped ? ' section-body-skipped' : ''}`}>
          {isSkipped && (
            <div className="section-skip-banner">
              Marked for later — content is preserved but not active.
              <button className="btn sm" style={{ marginLeft: 8 }} onClick={e => { e.stopPropagation(); toggleSkip() }}>Mark active</button>
            </div>
          )}
          {sectionKey === 'features' ? (
            <FeatureEditor content={effectiveContent} onChange={c => onChange(isSkipped ? SKIP_MARKER + '\n' + c : c)} refOptions={refOptions} />
          ) : isActionSteps ? (
            <ActionStepsEditor content={effectiveContent} onChange={c => onChange(isSkipped ? SKIP_MARKER + '\n' + c : c)} refOptions={refOptions} />
          ) : docType === 'datamodel' && sectionKey === 'models' ? (
            <DataModelEditor content={effectiveContent} onChange={c => onChange(isSkipped ? SKIP_MARKER + '\n' + c : c)} docSections={docSections} />
          ) : docType === 'datamodel' && sectionKey === 'enums' ? (
            <EnumEditor content={effectiveContent} onChange={c => onChange(isSkipped ? SKIP_MARKER + '\n' + c : c)} />
          ) : isTypedFields ? (
            <TypedFieldsEditor content={effectiveContent} onChange={c => onChange(isSkipped ? SKIP_MARKER + '\n' + c : c)} docType={docType} sectionKey={sectionKey} allEnums={allEnums} allModels={allModels} />
          ) : isComposition ? (
            <CompositionEditor content={effectiveContent} onChange={c => onChange(isSkipped ? SKIP_MARKER + '\n' + c : c)} refOptions={refOptions} />
          ) : isService ? (
            <ServiceEditor content={effectiveContent} onChange={c => onChange(isSkipped ? SKIP_MARKER + '\n' + c : c)} />
          ) : canForm ? (
            fieldTypes._array
              ? <ArrayFormEditor fields={Object.entries(fieldTypes).filter(([k]) => k !== '_array')} parsed={parsed} onChange={handleFormChange} refOptions={refOptions} />
              : <ObjectFormEditor fields={Object.entries(fieldTypes).filter(([k]) => k !== '_array')} parsed={parsed} onChange={handleFormChange} refOptions={refOptions} />
          ) : yaml !== null ? (
            <textarea className="yaml-editor" value={yaml} onChange={e => handleYamlChange(e.target.value)} spellCheck={false} readOnly={readOnly} />
          ) : (
            <textarea className="desc-editor" value={effectiveContent} onChange={e => onChange(isSkipped ? SKIP_MARKER + '\n' + e.target.value : e.target.value)} readOnly={readOnly} />
          )}
        </div>
      )}
    </div>
  )
}

function ObjectFormEditor({ fields, parsed, onChange, refOptions }) {
  const data = parsed.data || {}
  const update = (key, value) => onChange({ ...parsed, data: { ...data, [key]: value } })

  return (
    <div className="form-editor">
      {fields.map(([key, type]) => (
        <div key={key} className="form-row">
          <label className="form-label">{key}</label>
          <div className="form-control">
            <TypeInput type={type} value={data[key] ?? ''} onChange={v => update(key, v)} refOptions={refOptions} />
            <span className="form-type-hint">{type}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ArrayFormEditor({ fields, parsed, onChange, refOptions }) {
  const items = parsed.items || []

  const addRow = () => {
    const row = {}
    fields.forEach(([k]) => { row[k] = '' })
    onChange({ ...parsed, items: [...items, row] })
  }

  const removeRow = (idx) => onChange({ ...parsed, items: items.filter((_, i) => i !== idx) })

  const updateRow = (idx, key, value) => {
    onChange({ ...parsed, items: items.map((item, i) => i === idx ? { ...item, [key]: value } : item) })
  }

  return (
    <div className="form-editor array-form">
      {items.length > 0 && (
        <div className="array-header">
          {fields.map(([k]) => <span key={k} className="array-col-head">{k}</span>)}
          <span className="array-col-head" style={{ width: 28, minWidth: 28, flex: 'none' }} />
        </div>
      )}
      {items.map((item, idx) => (
        <div key={idx} className="array-row">
          {fields.map(([key, type]) => (
            <div key={key} className="array-cell">
              <TypeInput type={type} value={item[key] ?? ''} onChange={v => updateRow(idx, key, v)} compact refOptions={refOptions} />
            </div>
          ))}
          <button className="btn sm danger" style={{ flex: 'none' }} onClick={() => removeRow(idx)} title="Remove">{Icons.trash}</button>
        </div>
      ))}
      <button className="btn sm" style={{ marginTop: 8 }} onClick={addRow}>{Icons.plus} Add Row</button>
    </div>
  )
}

function TypeInput({ type, value, onChange, compact, refOptions }) {
  if (type === 'boolean') {
    return (
      <label className="toggle-label">
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
        <span>{value ? 'true' : 'false'}</span>
      </label>
    )
  }

  if (type === 'number' || type === 'integer') {
    return (
      <input
        type="number"
        className="form-input"
        value={value === '' || value === null ? '' : value}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        step={type === 'integer' ? 1 : 'any'}
      />
    )
  }

  if (type === 'date-time') {
    const dtVal = typeof value === 'string' && value ? value.replace('Z', '').slice(0, 16) : ''
    return (
      <input
        type="datetime-local"
        className="form-input"
        value={dtVal}
        onChange={e => onChange(e.target.value ? e.target.value + ':00Z' : '')}
      />
    )
  }

  if (type === 'date') {
    return <input type="date" className="form-input" value={value || ''} onChange={e => onChange(e.target.value)} />
  }

  if (type.startsWith('enum:')) {
    const options = type.slice(5).split('|')
    return (
      <select className="form-input" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (type === 'string_list' || type === 'object' || type === 'action_list' || type === 'any') {
    const displayVal = Array.isArray(value) ? '[]' : (typeof value === 'object' && value !== null ? '{}' : String(value ?? ''))
    return (
      <textarea
        className="form-input form-textarea"
        value={displayVal}
        onChange={e => onChange(e.target.value)}
        rows={compact ? 1 : 2}
      />
    )
  }

  if (type.startsWith('ref:')) {
    const refType = type.slice(4)
    const options = refOptions?.[refType] || []
    return <SearchSelect value={value || ''} onChange={onChange} options={options} placeholder={`${refType}_id`} />
  }

  // string, default
  return <input type="text" className="form-input" value={value || ''} onChange={e => onChange(e.target.value)} />
}
