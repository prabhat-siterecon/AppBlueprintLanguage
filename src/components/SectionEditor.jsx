import React, { useState, useMemo } from 'react'
import { Icons } from './Icons'
import { extractYamlFromSection, isSectionEmpty } from '../utils/parser'
import { parseYamlSection, serializeYamlSection } from '../utils/yamlForm'
import FeatureEditor from './FeatureEditor'
import DataModelEditor, { EnumEditor } from './DataModelEditor'
import TypedFieldsEditor, { hasTypedFieldsConfig } from './TypedFieldsEditor'
import CompositionEditor from './CompositionEditor'
import ServiceEditor from './ServiceEditor'

export default function SectionEditor({ heading, content, onChange, schema, isActive, onActivate, refOptions, docType, docSections, allEnums, allModels }) {
  const [expanded, setExpanded] = useState(true)
  const [formMode, setFormMode] = useState(false)

  const empty = isSectionEmpty(content)
  const yaml = extractYamlFromSection(content)
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
  const isService = docType === 'service' && sectionKey === 'services'

  const handleYamlChange = (newYaml) => {
    const newContent = content.replace(/```yaml\n[\s\S]*?```/, '```yaml\n' + newYaml + '\n```')
    onChange(newContent)
  }

  const handleFormChange = (newParsed) => {
    handleYamlChange(serializeYamlSection(newParsed))
  }

  return (
    <div className={`editor-section ${empty ? 'empty' : ''} ${isActive ? 'section-active' : ''}`}>
      <div className="section-header" onClick={() => { setExpanded(e => !e); onActivate?.() }}>
        <h3>
          <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-flex', transition: 'transform 0.15s' }}>
            {Icons.chevron}
          </span>
          {heading}
          {empty && <span className="empty-badge">EMPTY</span>}
        </h3>
        {sectionKey !== 'features' && !(docType === 'datamodel' && (sectionKey === 'models' || sectionKey === 'enums')) && !isTypedFields && !isComposition && !isService && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          </div>
        )}
      </div>
      {expanded && (
        <div className="section-body">
          {sectionKey === 'features' ? (
            <FeatureEditor content={content} onChange={onChange} refOptions={refOptions} />
          ) : docType === 'datamodel' && sectionKey === 'models' ? (
            <DataModelEditor content={content} onChange={onChange} docSections={docSections} />
          ) : docType === 'datamodel' && sectionKey === 'enums' ? (
            <EnumEditor content={content} onChange={onChange} />
          ) : isTypedFields ? (
            <TypedFieldsEditor content={content} onChange={onChange} docType={docType} sectionKey={sectionKey} allEnums={allEnums} allModels={allModels} />
          ) : isComposition ? (
            <CompositionEditor content={content} onChange={onChange} refOptions={refOptions} />
          ) : isService ? (
            <ServiceEditor content={content} onChange={onChange} />
          ) : canForm ? (
            fieldTypes._array
              ? <ArrayFormEditor fields={Object.entries(fieldTypes).filter(([k]) => k !== '_array')} parsed={parsed} onChange={handleFormChange} refOptions={refOptions} />
              : <ObjectFormEditor fields={Object.entries(fieldTypes).filter(([k]) => k !== '_array')} parsed={parsed} onChange={handleFormChange} refOptions={refOptions} />
          ) : yaml !== null ? (
            <textarea className="yaml-editor" value={yaml} onChange={e => handleYamlChange(e.target.value)} spellCheck={false} />
          ) : (
            <textarea className="desc-editor" value={content} onChange={e => onChange(e.target.value)} />
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
    if (options.length > 0) {
      return (
        <select className="form-input" value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">— select {refType} —</option>
          {options.map(id => <option key={id} value={id}>{id}</option>)}
        </select>
      )
    }
    return <input type="text" className="form-input" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={`${refType}_id`} />
  }

  // string, default
  return <input type="text" className="form-input" value={value || ''} onChange={e => onChange(e.target.value)} />
}
