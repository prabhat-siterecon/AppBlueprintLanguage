import { useState, useMemo, useEffect } from 'react'
import { parseFrontmatter, extractTypedReferences } from '../utils/parser'
import { TYPE_COLORS } from '../data/schema'
import { Icons } from './Icons'
import { generateSampleYaml, typeColor } from '../utils/yamlForm'
import DocumentViewer from './DocumentViewer'

// ── Category definitions ──────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'component', label: 'Components used',  inLabel: 'Component usage' },
  { key: 'action',    label: 'Actions used',      inLabel: 'Action usage' },
  { key: 'model',     label: 'Models used',       inLabel: 'Model usage' },
  { key: 'function',  label: 'Functions used',    inLabel: 'Function usage' },
  { key: 'api',       label: 'APIs used',         inLabel: 'API usage' },
  { key: 'state',     label: 'App states used',   inLabel: null }, // state keys aren't doc IDs
]

// For incoming, derive the label from this doc's type
const TYPE_TO_CATEGORY = {
  component: 'component',
  action:    'action',
  datamodel: 'model',
  function:  'function',
  service:   'api',
}

// ── JSON samples for schema tab ───────────────────────────────────────────────

const COMPOSITION_FIELDS = [
  ['nodeType', 'layout | list | element | card | group | component | slot'],
  ['layoutType', 'container | row | column | stack | scroll | tabs'],
  ['listType', 'list | grid | carousel'],
  ['elementType', 'text | button | icon | image | input | badge | divider'],
  ['component', 'component_id  (when nodeType=component)'],
  ['params', '[{ key, value }]  props for component'],
  ['slotName / slotContent', 'slot config  (when nodeType=slot)'],
  ['dataSource', '{ type, ref }  —  api | state | parameter | local_data | function'],
  ['triggers', '[{ event, action }]'],
  ['children', 'nested nodes  (recursive)'],
]

const COMPOSITION_SAMPLE = JSON.stringify({
  nodes: [{
    node: 'root_layout', nodeType: 'layout', layoutType: 'column',
    description: 'Main page layout', dataSource: null, triggers: [],
    children: [
      {
        node: 'header', nodeType: 'component', component: 'top_bar',
        params: [{ key: 'title', value: '"Home"' }], triggers: [], children: []
      },
      {
        node: 'item_list', nodeType: 'list', listType: 'list',
        description: 'Data-driven list',
        dataSource: { type: 'api', ref: 'service_id.endpoint_id' },
        triggers: [{ event: 'on_press', action: 'action_id' }],
        children: [{
          node: 'item_card', nodeType: 'component', component: 'card_component',
          params: [{ key: 'item', value: '{item}' }], triggers: [], children: []
        }]
      }
    ]
  }]
}, null, 2)

const SERVICES_SAMPLE = JSON.stringify({
  services: [{
    id: 'service_id', name: 'Service Name',
    base_url: 'https://api.example.com/v1',
    auth: 'Bearer token', description: 'What this service provides',
    endpoints: [{
      id: 'get_item', name: 'Get Item', method: 'GET', path: '/items/{id}',
      description: 'Fetch item by ID',
      params: [{ name: 'id', in: 'path', type: 'string', required: true, description: 'Item ID' }],
      headers: [{ name: 'Authorization', value: 'Bearer {token}', required: true }],
      body: { schema: '', example: '' },
      responses: [{ status: 200, description: 'Success', schema: '{ "id": "string" }' }],
      errors: [{ code: 404, message: 'Not found' }]
    }]
  }]
}, null, 2)

// ── DocModal ──────────────────────────────────────────────────────────────────
function DocModal({ file, onClose, onOpenInEditor }) {
  const { frontmatter } = parseFrontmatter(file.content)
  const tc = TYPE_COLORS[frontmatter.type]
  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={e => e.stopPropagation()}>
        <div className="doc-modal-hdr">
          <div className="doc-modal-title">
            {tc && <span className="doc-modal-type-badge" style={{ color: tc.text, background: tc.bg, border: `1px solid ${tc.border}` }}>{frontmatter.type}</span>}
            <span className="doc-modal-id">{frontmatter.id || file.path.split('/').pop()}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button className="btn sm" onClick={() => { onOpenInEditor(file.path); onClose() }}>{Icons.edit} Open in editor</button>
            <button className="doc-modal-close-btn" onClick={onClose} title="Close">×</button>
          </div>
        </div>
        <div className="doc-modal-body"><DocumentViewer file={file} /></div>
      </div>
    </div>
  )
}

// ── SampleView ────────────────────────────────────────────────────────────────
function SampleView({ sectionKey, fieldTypes, docType }) {
  if (!sectionKey) {
    return (
      <div className="rsp-empty">
        <div style={{ fontSize: 24, opacity: 0.2, lineHeight: 1 }}>⬡</div>
        <p>Click any section header to see its schema and a sample snippet.</p>
      </div>
    )
  }
  if (sectionKey === 'composition' && (docType === 'page' || docType === 'component')) {
    return (
      <div className="sample-view-body">
        <div className="sample-panel-header">
          <span className="sample-panel-title">composition</span>
          <span className="sample-badge">JSON tree</span>
        </div>
        <div className="sample-fields">
          <div className="sample-label">Node fields</div>
          {COMPOSITION_FIELDS.map(([k, v]) => (
            <div key={k} className="sample-field-row">
              <span className="sample-field-name">{k}</span>
              <span className="sample-field-desc">{v}</span>
            </div>
          ))}
        </div>
        <div className="sample-yaml-section">
          <div className="sample-label">Sample JSON</div>
          <pre className="sample-yaml">{COMPOSITION_SAMPLE}</pre>
        </div>
      </div>
    )
  }
  if (sectionKey === 'services' && docType === 'service') {
    return (
      <div className="sample-view-body">
        <div className="sample-panel-header">
          <span className="sample-panel-title">services</span>
          <span className="sample-badge">JSON</span>
        </div>
        <div className="sample-yaml-section">
          <div className="sample-label">Sample JSON</div>
          <pre className="sample-yaml">{SERVICES_SAMPLE}</pre>
        </div>
      </div>
    )
  }
  if (!fieldTypes) {
    return <div className="rsp-empty"><p>No schema defined for this section.</p></div>
  }
  const fields = Object.entries(fieldTypes).filter(([k]) => k !== '_array')
  const isArray = !!fieldTypes._array
  return (
    <div className="sample-view-body">
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
        <pre className="sample-yaml">{generateSampleYaml(fieldTypes, sectionKey)}</pre>
      </div>
    </div>
  )
}

// ── Ref chip — for outgoing refs (an ID, possibly links to a doc) ─────────────
function RefChip({ id, file, onOpen }) {
  const status = file ? parseFrontmatter(file.content).frontmatter.status : null
  const statusDot = { draft: '#6B7280', approved: '#3B82F6', implementing: '#F59E0B', implemented: '#10B981', deprecated: '#EF4444' }
  if (!file) {
    return <span className="ref-chip ref-chip-broken" title="Not found in blueprint">{id}</span>
  }
  return (
    <button className="ref-chip" onClick={() => onOpen(file)} title={file.path}>
      {status && <span className="ref-chip-dot" style={{ background: statusDot[status] || '#6B7280' }} />}
      {id}
    </button>
  )
}

// ── Doc card — for incoming refs (a document that references this one) ────────
function DocCard({ id, file, type, onOpen }) {
  const tc = TYPE_COLORS[type]
  return (
    <button className="ref-card ref-card-incoming" onClick={() => onOpen(file)} title={file.path}>
      <div className="ref-card-row">
        <span className="ref-card-id">{id}</span>
      </div>
      <span className="ref-card-fname" style={{ color: tc?.text || 'var(--text-muted)' }}>{type}</span>
    </button>
  )
}

// ── RefsView ──────────────────────────────────────────────────────────────────
function RefsView({ file, byId, typedRefs, incomingByCategory, docType, onOpenModal }) {
  if (!file) {
    return (
      <div className="rsp-empty">
        <div style={{ fontSize: 24, opacity: 0.2 }}>⊙</div>
        <p>Open a document to see its references.</p>
      </div>
    )
  }

  // Group outgoing refs by category
  const outByCategory = useMemo(() => {
    const g = {}
    CATEGORIES.forEach(c => { g[c.key] = [] })
    typedRefs.forEach(({ id, category }) => {
      if (g[category]) g[category].push(id)
    })
    return g
  }, [typedRefs])

  const hasOutgoing = CATEGORIES.some(c => outByCategory[c.key]?.length > 0)
  const hasIncoming = CATEGORIES.some(c => incomingByCategory[c.key]?.length > 0)

  if (!hasOutgoing && !hasIncoming) {
    return (
      <div className="rsp-empty">
        <div style={{ fontSize: 24, opacity: 0.2 }}>⊙</div>
        <p>No references in this document.</p>
      </div>
    )
  }

  return (
    <div className="rsp-body">
      {/* ── Section 1: Items used in this document ── */}
      {hasOutgoing && (
        <div className="rsp-section">
          <div className="rsp-section-title">Items used in this document</div>
          {CATEGORIES.map(({ key, label }) => {
            const ids = outByCategory[key]
            if (!ids?.length) return null
            return (
              <div key={key} className="rsp-group">
                <div className="rsp-group-label">{label}</div>
                <div className="rsp-chip-list">
                  {ids.map(id => {
                    // For API refs like svc_id.endpoint, look up the service doc by prefix
                    const docId = key === 'api' ? id.split('.')[0] : id
                    const docFile = byId[docId] || null
                    return (
                      <RefChip key={id} id={id} file={docFile} onOpen={onOpenModal} />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Section 2: This document used elsewhere ── */}
      {hasIncoming && (
        <div className="rsp-section">
          <div className="rsp-section-title">This document used in</div>
          {CATEGORIES.filter(c => c.inLabel).map(({ key, inLabel }) => {
            const docs = incomingByCategory[key]
            if (!docs?.length) return null
            return (
              <div key={key} className="rsp-group rsp-group-incoming">
                <div className="rsp-group-label rsp-incoming-label">{inLabel}</div>
                {docs.map(({ id, file: refFile, type }) => (
                  <DocCard key={refFile.path} id={id} file={refFile} type={type} onOpen={onOpenModal} />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── RefSidePanel ──────────────────────────────────────────────────────────────
export default function RefSidePanel({ file, files, activeSectionKey, fieldTypes, onNavigate }) {
  const [modal, setModal] = useState(null)
  const [tab, setTab] = useState('refs')

  // Auto-switch to schema tab when a section is activated
  useEffect(() => {
    if (activeSectionKey) setTab('schema')
  }, [activeSectionKey])

  const docType = useMemo(() => file ? parseFrontmatter(file.content).frontmatter.type : null, [file])
  const fileId  = useMemo(() => file ? parseFrontmatter(file.content).frontmatter.id  : null, [file])

  // Map all doc IDs → file objects
  const byId = useMemo(() => {
    const m = {}
    files.forEach(f => {
      const { frontmatter } = parseFrontmatter(f.content)
      if (frontmatter.id) m[frontmatter.id] = f
    })
    return m
  }, [files])

  // Typed outgoing refs for this file
  const typedRefs = useMemo(() => file ? extractTypedReferences(file.content) : [], [file])

  // Count for tab badge
  const totalOutgoing = typedRefs.length

  // Incoming refs grouped by category — scan all other docs
  const incomingByCategory = useMemo(() => {
    const g = {}
    CATEGORIES.filter(c => c.inLabel).forEach(c => { g[c.key] = [] })
    if (!file || !fileId) return g

    files.forEach(f => {
      if (!f.path.endsWith('.md') || f.path === file.path) return
      const { frontmatter } = parseFrontmatter(f.content)
      const refs = extractTypedReferences(f.content)
      const docEntry = { id: frontmatter.id || f.path.split('/').pop(), file: f, type: frontmatter.type }

      CATEGORIES.filter(c => c.inLabel).forEach(({ key }) => {
        const matched = refs.some(r => {
          if (r.category !== key) return false
          if (key === 'api') return r.id === fileId || r.id.startsWith(fileId + '.')
          return r.id === fileId
        })
        if (matched && !g[key].some(d => d.file.path === f.path)) {
          g[key].push(docEntry)
        }
      })
    })
    return g
  }, [files, file, fileId])

  const totalIncoming = CATEGORIES.reduce((n, c) => n + (incomingByCategory[c.key]?.length || 0), 0)

  return (
    <>
      <div className="sample-panel rsp">
        <div className="rsp-tabs">
          <button
            className={`rsp-tab${tab === 'refs' ? ' active' : ''}`}
            onClick={() => setTab('refs')}
            title="Document references"
          >
            {Icons.link} Refs
            {(totalOutgoing + totalIncoming) > 0 && (
              <span className="rsp-tab-badge">{totalOutgoing + totalIncoming}</span>
            )}
          </button>
          <button
            className={`rsp-tab${tab === 'schema' ? ' active' : ''}`}
            onClick={() => setTab('schema')}
            title="Section schema"
          >
            ⬡ Schema
            {activeSectionKey && (
              <span className="rsp-tab-badge rsp-tab-badge-section">{activeSectionKey}</span>
            )}
          </button>
        </div>

        {tab === 'refs' ? (
          <RefsView
            file={file}
            byId={byId}
            typedRefs={typedRefs}
            incomingByCategory={incomingByCategory}
            docType={docType}
            onOpenModal={setModal}
          />
        ) : (
          <SampleView
            sectionKey={activeSectionKey}
            fieldTypes={fieldTypes}
            docType={docType}
          />
        )}
      </div>

      {modal && (
        <DocModal
          file={modal}
          onClose={() => setModal(null)}
          onOpenInEditor={(p) => { onNavigate(p); setModal(null) }}
        />
      )}
    </>
  )
}
