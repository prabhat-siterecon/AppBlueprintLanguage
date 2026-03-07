import { useState, useMemo, useEffect, useRef } from 'react'
import { Icons } from './Icons'
import { extractYamlFromSection } from '../utils/parser'

const REF_TYPES = [
  { key: 'pages',      label: 'Pages',      refKey: 'page' },
  { key: 'components', label: 'Components', refKey: 'component' },
  { key: 'models',     label: 'Models',     refKey: 'datamodel' },
  { key: 'actions',    label: 'Actions',    refKey: 'action' },
  { key: 'services',   label: 'Services',   refKey: 'service' },
]

const TEMPLATE_KEY = 'abl_feature_templates'

function mkItem(id = 'new_feature') {
  return { id, description: '', user_types: '', flow: '', pages: '', components: '', models: '', actions: '', services: '' }
}

// ── Template store ────────────────────────────────────────────────────────────

function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]') } catch { return [] }
}

function persistTemplates(templates) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates))
}

// ── YAML parse ────────────────────────────────────────────────────────────────

function parseFeatures(yaml) {
  if (!yaml || !yaml.trim() || yaml.trim() === 'features: []') return []
  const lines = yaml.split('\n')
  const features = []
  let feat = null
  let sub = null
  let inSub = false

  const pushSub = () => { if (sub && feat) { feat.sub_features.push(sub); sub = null } }
  const pushFeat = () => {
    pushSub()
    if (feat) features.push(feat)
    feat = null
    inSub = false
  }

  for (const line of lines) {
    if (/^  - id:/.test(line)) {
      pushFeat()
      feat = { ...mkItem(unquote(line.replace(/^  - id:\s*/, ''))), sub_features: [] }
    } else if (feat && /^    sub_features:/.test(line)) {
      inSub = true
    } else if (inSub && /^      - id:/.test(line)) {
      pushSub()
      sub = mkItem(unquote(line.replace(/^      - id:\s*/, '')))
    } else if (inSub && sub) {
      const m = line.match(/^        (\w+):\s*(.*)/)
      if (m) sub[m[1]] = unquote(m[2])
    } else if (feat && !inSub) {
      const m = line.match(/^    (\w+):\s*(.*)/)
      if (m && m[1] !== 'sub_features') feat[m[1]] = unquote(m[2])
    }
  }
  pushFeat()
  return features
}

// ── YAML serialize ────────────────────────────────────────────────────────────

function serializeFeatures(features) {
  if (!features || !features.length) return 'features: []'
  const lines = ['features:']
  for (const f of features) {
    lines.push(`  - id: ${serStr(f.id || 'untitled')}`)
    lines.push(`    description: ${serStr(f.description)}`)
    lines.push(`    user_types: ${serStr(f.user_types)}`)
    lines.push(`    flow: ${serStr(f.flow)}`)
    for (const { key } of REF_TYPES) {
      lines.push(`    ${key}: ${serStr(f[key] || '')}`)
    }
    if (f.sub_features && f.sub_features.length > 0) {
      lines.push(`    sub_features:`)
      for (const s of f.sub_features) {
        lines.push(`      - id: ${serStr(s.id || 'untitled')}`)
        lines.push(`        description: ${serStr(s.description)}`)
        lines.push(`        user_types: ${serStr(s.user_types)}`)
        lines.push(`        flow: ${serStr(s.flow)}`)
        for (const { key } of REF_TYPES) {
          lines.push(`        ${key}: ${serStr(s[key] || '')}`)
        }
      }
    } else {
      lines.push(`    sub_features: []`)
    }
  }
  return lines.join('\n')
}

function unquote(s) {
  s = (s || '').trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  return s
}

function serStr(v) {
  if (!v) return '""'
  const s = String(v)
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
}

// ── Add button with template picker ──────────────────────────────────────────

function AddButton({ label, templates, onAdd, onDeleteTemplate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="add-feature-row" ref={ref}>
      <button className="btn add-section-btn" onClick={() => onAdd(null)}>
        {Icons.plus} {label}
      </button>
      {templates.length > 0 && (
        <div className="template-picker-wrap">
          <button
            className={`btn sm template-from-btn${open ? ' active' : ''}`}
            onClick={() => setOpen(o => !o)}
            title="Add from template"
          >
            From Template {Icons.chevron}
          </button>
          {open && (
            <div className="template-dropdown">
              <div className="template-dropdown-label">Saved Templates</div>
              {templates.map(t => (
                <div key={t.id} className="template-dropdown-item">
                  <button className="template-dropdown-use" onClick={() => { onAdd(t.item); setOpen(false) }}>
                    <span className="template-dropdown-name">{t.name}</span>
                    <span className="template-dropdown-meta">
                      {new Date(t.savedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    className="btn sm danger template-dropdown-del"
                    onClick={() => onDeleteTemplate(t.id)}
                    title="Delete template"
                  >
                    {Icons.trash}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FeatureEditor({ content, onChange, refOptions }) {
  const yaml = extractYamlFromSection(content)
  const [templates, setTemplates] = useState(loadTemplates)

  const features = useMemo(() => {
    try { return parseFeatures(yaml) } catch { return [] }
  }, [yaml])

  const updateFeatures = (next) => {
    const newYaml = serializeFeatures(next)
    if (content && content.includes('```yaml')) {
      onChange(content.replace(/```yaml\n[\s\S]*?```/, '```yaml\n' + newYaml + '\n```'))
    } else {
      onChange('```yaml\n' + newYaml + '\n```')
    }
  }

  const addFeature = (fromTemplate) => {
    const base = fromTemplate
      ? { ...fromTemplate, id: fromTemplate.id + '_copy', sub_features: fromTemplate.sub_features || [] }
      : { ...mkItem('new_feature'), sub_features: [] }
    updateFeatures([...features, base])
  }

  const duplicateFeature = (i) => {
    const copy = { ...features[i], id: features[i].id + '_copy', sub_features: [...(features[i].sub_features || [])] }
    const next = [...features]
    next.splice(i + 1, 0, copy)
    updateFeatures(next)
  }

  const removeFeature = (i) => updateFeatures(features.filter((_, idx) => idx !== i))
  const updateFeature = (i, updated) => updateFeatures(features.map((f, idx) => idx === i ? updated : f))

  const saveTemplate = (item, name) => {
    const next = [...templates, { id: Date.now().toString(), name, savedAt: new Date().toISOString(), item }]
    setTemplates(next)
    persistTemplates(next)
  }

  const deleteTemplate = (id) => {
    const next = templates.filter(t => t.id !== id)
    setTemplates(next)
    persistTemplates(next)
  }

  return (
    <div className="feature-editor">
      {features.map((feature, i) => (
        <FeatureItem
          key={i}
          feature={feature}
          onChange={(u) => updateFeature(i, u)}
          onRemove={() => removeFeature(i)}
          onDuplicate={() => duplicateFeature(i)}
          onSaveTemplate={(item, name) => saveTemplate(item, name)}
          templates={templates}
          onDeleteTemplate={deleteTemplate}
          refOptions={refOptions}
        />
      ))}
      <AddButton
        label="Add Feature"
        templates={templates}
        onAdd={addFeature}
        onDeleteTemplate={deleteTemplate}
      />
    </div>
  )
}

// ── Feature / Sub-feature item ────────────────────────────────────────────────

function FeatureItem({ feature, onChange, onRemove, onDuplicate, onSaveTemplate, templates, onDeleteTemplate, refOptions, nested = false }) {
  const [expanded, setExpanded] = useState(true)
  const [saved, setSaved] = useState(false)

  const update = (key, value) => onChange({ ...feature, [key]: value })

  const handleSaveTemplate = (e) => {
    e.stopPropagation()
    const name = prompt('Template name:', feature.id || 'my_template')
    if (!name) return
    onSaveTemplate(feature, name)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const addSub = (fromTemplate) => {
    const base = fromTemplate
      ? { ...fromTemplate, id: fromTemplate.id + '_copy' }
      : mkItem('new_sub_feature')
    // strip sub_features if template had them (subs don't nest further)
    const { sub_features: _, ...item } = base
    onChange({ ...feature, sub_features: [...(feature.sub_features || []), item] })
  }

  const duplicateSub = (i) => {
    const copy = { ...feature.sub_features[i], id: feature.sub_features[i].id + '_copy' }
    const next = [...feature.sub_features]
    next.splice(i + 1, 0, copy)
    onChange({ ...feature, sub_features: next })
  }

  const removeSub = (i) => onChange({ ...feature, sub_features: feature.sub_features.filter((_, idx) => idx !== i) })
  const updateSub = (i, u) => onChange({ ...feature, sub_features: feature.sub_features.map((s, idx) => idx === i ? u : s) })

  return (
    <div className={`feature-item${nested ? ' feature-item-nested' : ''}`}>
      <div className="feature-item-header" onClick={() => setExpanded(e => !e)}>
        <span className="feature-chevron" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}>
          {Icons.chevron}
        </span>
        <span className="feature-item-label">
          <span className="feature-item-kind">{nested ? 'sub' : 'feature'}</span>
          {feature.id || 'untitled'}
        </span>
        <div className="feature-item-actions" onClick={e => e.stopPropagation()}>
          <button
            className="btn sm"
            onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            title="Duplicate"
          >
            {Icons.duplicate}
          </button>
          <button
            className={`btn sm${saved ? ' template-saved' : ''}`}
            onClick={handleSaveTemplate}
            title="Save as template"
          >
            {saved ? '✓ Saved' : '☆ Template'}
          </button>
          <button
            className="btn sm danger"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            title="Remove"
          >
            {Icons.trash}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="feature-item-body">
          <div className="feature-field">
            <label className="feature-field-label">ID / Name</label>
            <input
              className="form-input"
              value={feature.id || ''}
              onChange={e => update('id', e.target.value)}
              placeholder="feature_id"
            />
          </div>

          <div className="feature-field">
            <label className="feature-field-label">Description</label>
            <textarea
              className="form-input form-textarea"
              rows={3}
              value={feature.description || ''}
              onChange={e => update('description', e.target.value)}
              placeholder="What does this feature do?"
            />
          </div>

          <div className="feature-field">
            <label className="feature-field-label">User Types</label>
            <input
              className="form-input"
              value={feature.user_types || ''}
              onChange={e => update('user_types', e.target.value)}
              placeholder="admin, user, guest"
            />
          </div>

          <div className="feature-field">
            <label className="feature-field-label">Flow</label>
            <textarea
              className="form-input form-textarea"
              rows={3}
              value={feature.flow || ''}
              onChange={e => update('flow', e.target.value)}
              placeholder="Open app → See screen → Take action → Result"
            />
          </div>

          <div className="feature-refs-block">
            <div className="feature-refs-title">References</div>
            {REF_TYPES.map(({ key, label, refKey }) => {
              const available = refOptions?.[refKey] || []
              const selected = feature[key]
                ? feature[key].split(',').map(s => s.trim()).filter(Boolean)
                : []
              const toggle = (id) => {
                const next = selected.includes(id)
                  ? selected.filter(s => s !== id)
                  : [...selected, id]
                update(key, next.join(', '))
              }
              return (
                <div key={key} className="feature-ref-row">
                  <span className="feature-ref-type">{label}</span>
                  <div className="feature-ref-chips">
                    {available.length > 0
                      ? available.map(id => (
                          <button
                            key={id}
                            className={`ref-chip${selected.includes(id) ? ' ref-chip-on' : ''}`}
                            onClick={() => toggle(id)}
                          >
                            {id}
                          </button>
                        ))
                      : (
                          <input
                            className="form-input"
                            style={{ flex: 1 }}
                            value={feature[key] || ''}
                            onChange={e => update(key, e.target.value)}
                            placeholder={`${label.toLowerCase()} IDs, comma-separated`}
                          />
                        )
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {!nested && (
            <div className="feature-subs">
              <div className="feature-subs-header">
                <span className="feature-refs-title">Sub-features</span>
              </div>
              {(feature.sub_features || []).map((sub, i) => (
                <FeatureItem
                  key={i}
                  feature={sub}
                  onChange={(u) => updateSub(i, u)}
                  onRemove={() => removeSub(i)}
                  onDuplicate={() => duplicateSub(i)}
                  onSaveTemplate={onSaveTemplate}
                  templates={templates}
                  onDeleteTemplate={onDeleteTemplate}
                  refOptions={refOptions}
                  nested
                />
              ))}
              <AddButton
                label="Add Sub-feature"
                templates={templates}
                onAdd={addSub}
                onDeleteTemplate={onDeleteTemplate}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
