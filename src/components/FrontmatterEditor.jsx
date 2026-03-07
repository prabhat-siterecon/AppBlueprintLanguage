import React from 'react'
import { BLUEPRINT_SCHEMA, STATUS_OPTIONS, SCOPE_OPTIONS } from '../data/schema'

export default function FrontmatterEditor({ frontmatter, onChange, refOptions }) {
  const type = frontmatter.type || 'general'
  const schema = BLUEPRINT_SCHEMA[type] || BLUEPRINT_SCHEMA.general

  return (
    <div className="editor-section">
      <div className="section-header">
        <h3>Frontmatter</h3>
      </div>
      <div className="section-body">
        <div className="frontmatter-grid">
          {schema.frontmatter.map((key) => (
            <React.Fragment key={key}>
              <div className="fm-label">{key}:</div>
              <div className="fm-value">
                {key === 'status' ? (
                  <select
                    value={frontmatter[key] || ''}
                    onChange={(e) => onChange({ ...frontmatter, [key]: e.target.value })}
                  >
                    <option value="">—</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : key === 'on_load' ? (
                  refOptions?.action?.length > 0 ? (
                    <select value={frontmatter[key] || ''} onChange={e => onChange({ ...frontmatter, [key]: e.target.value })}>
                      <option value="">— none —</option>
                      {refOptions.action.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={frontmatter[key] || ''} placeholder="action_id" onChange={e => onChange({ ...frontmatter, [key]: e.target.value })} />
                  )
                ) : key === 'scope' ? (
                  <select
                    value={frontmatter[key] || ''}
                    onChange={(e) => onChange({ ...frontmatter, [key]: e.target.value })}
                  >
                    <option value="">—</option>
                    {SCOPE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : key === 'type' ? (
                  <select
                    value={frontmatter[key] || ''}
                    onChange={(e) => onChange({ ...frontmatter, [key]: e.target.value })}
                  >
                    {Object.keys(BLUEPRINT_SCHEMA).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={frontmatter[key] || ''}
                    placeholder={
                      key === 'last_synced' ? new Date().toISOString() :
                      key === 'implements' ? 'src/...' : ''
                    }
                    onChange={(e) => onChange({ ...frontmatter, [key]: e.target.value })}
                  />
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
