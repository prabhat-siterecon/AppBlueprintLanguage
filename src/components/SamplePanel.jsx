import React from 'react'
import { generateSampleYaml, typeColor } from '../utils/yamlForm'

export default function SamplePanel({ sectionKey, fieldTypes }) {
  if (!sectionKey || !fieldTypes) {
    return (
      <div className="sample-panel sample-panel-empty">
        <p>Click a section header to see its schema and a sample YAML snippet.</p>
      </div>
    )
  }

  const fields = Object.entries(fieldTypes).filter(([k]) => k !== '_array')
  const isArray = !!fieldTypes._array
  const sample = generateSampleYaml(fieldTypes, sectionKey)

  return (
    <div className="sample-panel">
      <div className="sample-panel-header">
        <span className="sample-panel-title">{sectionKey}</span>
        {isArray && <span className="sample-badge">array</span>}
      </div>

      {fields.length > 0 && (
        <div className="sample-fields">
          <div className="sample-label">Fields</div>
          {fields.map(([k, t]) => (
            <div key={k} className="sample-field-row">
              <span className="sample-field-name">{k}</span>
              <span className={`sample-type-badge ${typeColor(t)}`}>{t}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sample-yaml-section">
        <div className="sample-label">Sample YAML</div>
        <pre className="sample-yaml">{sample}</pre>
      </div>
    </div>
  )
}
