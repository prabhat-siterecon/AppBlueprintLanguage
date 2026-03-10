import React, { useId } from 'react'
import { BLUEPRINT_SCHEMA, STATUS_OPTIONS, SCOPE_OPTIONS } from '../data/schema'

function SearchSelect({ value, onChange, options, placeholder, disabled, className }) {
  const id = useId()
  return (
    <>
      <input list={id} className={className} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder || ''} disabled={disabled} />
      <datalist id={id}>
        {(options || []).map(o => <option key={o} value={o} />)}
      </datalist>
    </>
  )
}

export default function FrontmatterEditor({ frontmatter, onChange, refOptions, readOnly }) {
  const type = frontmatter.type || 'general'
  const schema = BLUEPRINT_SCHEMA[type] || BLUEPRINT_SCHEMA.general

  function renderField(key) {
    const val = frontmatter[key] || ''
    const update = (v) => onChange({ ...frontmatter, [key]: v })

    if (key === 'type') return (
      <select className="fm-compact-input" value={val} onChange={e => update(e.target.value)} disabled={readOnly}>
        {Object.keys(BLUEPRINT_SCHEMA).map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    )
    if (key === 'status') return (
      <select className="fm-compact-input" value={val} onChange={e => update(e.target.value)} disabled={readOnly}>
        <option value="">—</option>
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    )
    if (key === 'scope') return (
      <select className="fm-compact-input" value={val} onChange={e => update(e.target.value)} disabled={readOnly}>
        <option value="">—</option>
        {SCOPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    )
    if (key === 'on_load') return (
      <SearchSelect className="fm-compact-input" value={val} onChange={update} options={refOptions?.action || []} placeholder="action_id" disabled={readOnly} />
    )
    return (
      <input
        className="fm-compact-input"
        type="text"
        value={val}
        onChange={e => update(e.target.value)}
        placeholder={key === 'last_synced' ? 'ISO date' : key === 'implements' ? 'src/...' : key}
        readOnly={readOnly}
      />
    )
  }

  const moduleTags = (frontmatter.module || '').split(',').map(t => t.trim()).filter(Boolean)

  return (
    <div className="fm-compact-block">
      <div className="fm-compact-row">
        {schema.frontmatter.map(key => (
          <div key={key} className="fm-compact-field">
            <span className="fm-compact-label">{key}</span>
            {renderField(key)}
          </div>
        ))}
        <div className="fm-compact-field fm-module-field">
          <span className="fm-compact-label">module</span>
          {moduleTags.length === 0
            ? <span className="fm-compact-input" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
            : <span className="fm-module-tags">{moduleTags.map(t => <span key={t} className="fm-module-chip">{t}</span>)}</span>
          }
        </div>
      </div>
    </div>
  )
}
