import { useState, useMemo, useId } from 'react'
import { Icons } from './Icons'

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

// ── Node type definitions ─────────────────────────────────────────────────────

const LAYOUT_SUBTYPES  = ['container', 'row', 'column', 'stack', 'scroll', 'tabs']
const LIST_SUBTYPES    = ['list', 'grid', 'carousel']
const ELEMENT_SUBTYPES = ['text', 'button', 'icon', 'image', 'input', 'badge', 'divider']
const DATA_SOURCE_TYPES = ['api', 'state', 'parameter', 'local_data', 'function']
const COMMON_EVENTS = ['on_press', 'on_load', 'on_change', 'on_scroll', 'on_submit', 'on_focus', 'on_blur', 'on_appear', 'on_long_press', 'on_swipe']

const CAN_HAVE_CHILDREN = new Set(['layout', 'list', 'card', 'group', 'component'])
const HAS_DATA_SOURCE   = new Set(['layout', 'list', 'card', 'group', 'component'])
const HAS_TRIGGERS      = new Set(['layout', 'list', 'element', 'card', 'group', 'component'])

const NODE_TYPE_OPTIONS = [
  { value: 'layout',    label: 'Layout'             },
  { value: 'list',      label: 'List / Grid'        },
  { value: 'element',   label: 'Element'            },
  { value: 'card',      label: 'Card'               },
  { value: 'group',     label: 'Group'              },
  { value: 'component', label: 'Component instance' },
  { value: 'slot',      label: 'Slot placeholder'   },
]

const KIND_CLASS = {
  layout:    'cnk-layout',
  list:      'cnk-list',
  element:   'cnk-element',
  card:      'cnk-card',
  group:     'cnk-group',
  component: 'cnk-component',
  slot:      'cnk-slot',
}

function kindLabel(node) {
  switch (node.nodeType) {
    case 'layout':    return node.layoutType  || 'container'
    case 'list':      return node.listType    || 'list'
    case 'element':   return node.elementType || 'text'
    case 'card':      return 'card'
    case 'group':     return 'group'
    case 'component': return node.component   || 'component'
    case 'slot':      return `slot${node.slotName ? ': ' + node.slotName : ''}`
    default:          return node.nodeType    || '?'
  }
}

// ── JSON persistence ──────────────────────────────────────────────────────────

function extractCompositionData(content) {
  const m = content.match(/```json\n([\s\S]*?)```/)
  if (m) { try { return JSON.parse(m[1]) } catch {} }
  return { nodes: [] }
}

function applyCompositionData(content, data) {
  const str = JSON.stringify(data, null, 2)
  if (content.includes('```json')) return content.replace(/```json\n[\s\S]*?```/, '```json\n' + str + '\n```')
  if (content.includes('```yaml')) return content.replace(/```yaml\n[\s\S]*?```/, '```json\n' + str + '\n```')
  return '```json\n' + str + '\n```'
}

function emptyNode(name = 'new_node') {
  return {
    node: name, nodeType: 'element', layoutType: 'container', listType: 'list',
    elementType: 'text', component: '', params: [], slotName: '', slotContent: '',
    description: '', dataSource: null, triggers: [], children: [],
  }
}

// ── DataSourceEditor ──────────────────────────────────────────────────────────

function DataSourceEditor({ dataSource, onChange, refOptions }) {
  const [open, setOpen] = useState(!!dataSource)
  if (!open) return (
    <button className="btn sm comp-add-btn" onClick={() => { setOpen(true); onChange({ type: 'api', ref: '' }) }}>
      {Icons.plus} Data source
    </button>
  )
  const ds = dataSource || { type: 'api', ref: '' }
  // Combine service doc IDs and svc.endpoint refs so both are available
  const apiOpts = [
    ...(refOptions?.service || []),
    ...(refOptions?.serviceEndpoints || []),
  ]
  const fnOpts = refOptions?.['function'] || []

  const mkSel = (opts, ph) => <SearchSelect value={ds.ref || ''} onChange={v => onChange({ ...ds, ref: v })} options={opts} placeholder={ph} />

  return (
    <div className="comp-sub-block">
      <div className="comp-sub-header">
        <span className="comp-sub-label">Data source</span>
        <button className="btn sm danger" onClick={() => { setOpen(false); onChange(null) }}>×</button>
      </div>
      <div className="comp-sub-body comp-sub-row">
        <select className="form-input" value={ds.type} onChange={e => onChange({ type: e.target.value, ref: '' })}>
          {DATA_SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {ds.type === 'api'        && mkSel(apiOpts, 'svc_id or svc_id.endpoint_id')}
        {ds.type === 'state'      && <SearchSelect value={ds.ref || ''} onChange={v => onChange({ ...ds, ref: v })} options={[]} placeholder="state.key" />}
        {ds.type === 'parameter'  && <SearchSelect value={ds.ref || ''} onChange={v => onChange({ ...ds, ref: v })} options={[]} placeholder="param_name" />}
        {ds.type === 'function'   && mkSel(fnOpts, 'function_id')}
        {ds.type === 'local_data' && <SearchSelect value={ds.ref || ''} onChange={v => onChange({ ...ds, ref: v })} options={[]} placeholder="data description" />}
        {(ds.type === 'function' || ds.type === 'local_data') && (
          <input className="form-input" value={ds.transform || ''} onChange={e => onChange({ ...ds, transform: e.target.value })} placeholder={ds.type === 'function' ? 'transform expr' : 'inline value'} />
        )}
      </div>
      <input
        className="form-input comp-ds-desc"
        value={ds.description || ''}
        onChange={e => onChange({ ...ds, description: e.target.value })}
        placeholder="Description — what data this provides and how it's used"
      />
    </div>
  )
}

// ── ConditionEditor ───────────────────────────────────────────────────────────

function ConditionEditor({ condition, onChange, refOptions }) {
  const [open, setOpen] = useState(!!condition)
  const fnOpts = refOptions?.['function'] || []
  if (!open) return (
    <button className="btn sm comp-add-btn" onClick={() => { setOpen(true); onChange({ when: '', fn: '' }) }}>
      {Icons.plus} Condition
    </button>
  )
  const cond = condition || { when: '', fn: '' }
  return (
    <div className="comp-sub-block">
      <div className="comp-sub-header">
        <span className="comp-sub-label">Condition</span>
        <button className="btn sm danger" onClick={() => { setOpen(false); onChange(null) }}>×</button>
      </div>
      <div className="comp-sub-body" style={{ gap: 6 }}>
        <input
          className="form-input"
          value={cond.when || ''}
          onChange={e => onChange({ ...cond, when: e.target.value })}
          placeholder="When to show/hide this node (plain text description)"
        />
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, width: 70 }}>condition fn</span>
          <SearchSelect
            value={cond.fn || ''}
            onChange={v => onChange({ ...cond, fn: v })}
            options={fnOpts}
            placeholder="function_id (optional)"
          />
        </div>
      </div>
    </div>
  )
}

// ── ParamsEditor ──────────────────────────────────────────────────────────────

function ParamsEditor({ params, onChange }) {
  const [open, setOpen] = useState((params || []).length > 0)
  if (!open) return (
    <button className="btn sm comp-add-btn" onClick={() => { setOpen(true); onChange([{ key: '', value: '' }]) }}>
      {Icons.plus} Params
    </button>
  )
  const add = () => onChange([...(params || []), { key: '', value: '' }])
  const upd = (i, p) => onChange(params.map((x, idx) => idx === i ? p : x))
  const rm  = (i) => { const next = params.filter((_, idx) => idx !== i); if (!next.length) setOpen(false); onChange(next) }

  return (
    <div className="comp-sub-block">
      <div className="comp-sub-header">
        <span className="comp-sub-label">Params</span>
        <button className="btn sm" onClick={add}>{Icons.plus}</button>
        <button className="btn sm danger" onClick={() => { setOpen(false); onChange([]) }}>×</button>
      </div>
      <div className="comp-sub-body">
        {(params || []).map((p, i) => (
          <div key={i} className="comp-param-row">
            <input className="form-input" value={p.key || ''} onChange={e => upd(i, { ...p, key: e.target.value })} placeholder="param_name" style={{ width: 120, flexShrink: 0 }} />
            <input className="form-input" value={p.value || ''} onChange={e => upd(i, { ...p, value: e.target.value })} placeholder='"value" or {expr}' />
            <button className="btn sm danger" onClick={() => rm(i)}>{Icons.trash}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── TriggersEditor ────────────────────────────────────────────────────────────

function TriggersEditor({ triggers, onChange, refOptions }) {
  const [open, setOpen] = useState((triggers || []).length > 0)
  const actionOpts = refOptions?.action || []
  if (!open) return (
    <button className="btn sm comp-add-btn" onClick={() => { setOpen(true); onChange([{ event: 'on_press', action: '' }]) }}>
      {Icons.plus} Trigger
    </button>
  )
  const add = () => onChange([...(triggers || []), { event: '', action: '' }])
  const upd = (i, t) => onChange(triggers.map((x, idx) => idx === i ? t : x))
  const rm  = (i) => { const next = triggers.filter((_, idx) => idx !== i); if (!next.length) setOpen(false); onChange(next) }

  return (
    <div className="comp-sub-block">
      <div className="comp-sub-header">
        <span className="comp-sub-label">Triggers</span>
        <button className="btn sm" onClick={add}>{Icons.plus}</button>
        <button className="btn sm danger" onClick={() => { setOpen(false); onChange([]) }}>×</button>
      </div>
      <datalist id="comp-event-list">
        {COMMON_EVENTS.map(e => <option key={e} value={e} />)}
      </datalist>
      <div className="comp-sub-body">
        {(triggers || []).map((t, i) => (
          <div key={i} className="comp-trigger-row">
            <input
              className="form-input comp-event-input"
              list="comp-event-list"
              value={t.event || ''}
              onChange={e => upd(i, { ...t, event: e.target.value })}
              placeholder="event_name"
            />
            <SearchSelect value={t.action || ''} onChange={v => upd(i, { ...t, action: v })} options={actionOpts} placeholder="action_id" />
            <button className="btn sm danger" onClick={() => rm(i)}>{Icons.trash}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── NodeItem ──────────────────────────────────────────────────────────────────

function NodeItem({ node, depth, onChange, onRemove, onDuplicate, refOptions }) {
  const [expanded, setExpanded] = useState(depth === 0)
  const nt = node.nodeType || 'element'
  const upd = (updates) => onChange({ ...node, ...updates })

  const addChild = (e) => {
    e.stopPropagation()
    const idx = (node.children || []).length + 1
    onChange({ ...node, children: [...(node.children || []), emptyNode('node_' + idx)] })
  }
  const upChild  = (i, c) => onChange({ ...node, children: node.children.map((x, idx) => idx === i ? c : x) })
  const rmChild  = (i)    => onChange({ ...node, children: node.children.filter((_, idx) => idx !== i) })
  const dupChild = (i)    => {
    const copy = JSON.parse(JSON.stringify(node.children[i]))
    copy.node += '_copy'
    const next = [...node.children]; next.splice(i + 1, 0, copy); onChange({ ...node, children: next })
  }

  const kl = kindLabel(node)
  const kc = KIND_CLASS[nt] || 'cnk-group'
  const hasDs        = !!node.dataSource
  const hasTriggers  = (node.triggers || []).length > 0
  const hasCondition = !!node.condition
  const childCount   = (node.children || []).length

  return (
    <div className={`comp-node${depth > 0 ? ' comp-node-nested' : ''}`}>
      <div className="comp-node-header" onClick={() => setExpanded(e => !e)}>
        <span className="feature-chevron" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}>
          {Icons.chevron}
        </span>
        <span className={`comp-node-kind ${kc}`}>{kl}</span>
        <input
          className="comp-node-name"
          value={node.node || ''}
          onChange={e => { e.stopPropagation(); upd({ node: e.target.value }) }}
          onClick={e => e.stopPropagation()}
          placeholder="node_name"
        />
        {hasDs        && <span className="comp-badge comp-badge-ds">⬡ {node.dataSource.type}</span>}
        {hasTriggers  && <span className="comp-badge comp-badge-act">↗ {node.triggers.length}</span>}
        {hasCondition && <span className="comp-badge comp-badge-cond">? if</span>}
        {childCount   > 0 && <span className="comp-badge comp-badge-ch">{childCount}↓</span>}
        <div className="feature-item-actions" onClick={e => e.stopPropagation()}>
          <button className="btn sm" onClick={onDuplicate} title="Duplicate">{Icons.duplicate}</button>
          <button className="btn sm danger" onClick={onRemove} title="Remove">{Icons.trash}</button>
        </div>
      </div>

      {expanded && (
        <div className="comp-node-body">

          {/* Type config */}
          <div className="comp-config-grid">
            <div className="comp-config-row">
              <span className="comp-config-label">node type</span>
              <select className="form-input" value={nt} onChange={e => upd({ nodeType: e.target.value })}>
                {NODE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {nt === 'layout' && (
              <div className="comp-config-row">
                <span className="comp-config-label">layout type</span>
                <select className="form-input" value={node.layoutType || 'container'} onChange={e => upd({ layoutType: e.target.value })}>
                  {LAYOUT_SUBTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {nt === 'list' && (
              <div className="comp-config-row">
                <span className="comp-config-label">list type</span>
                <select className="form-input" value={node.listType || 'list'} onChange={e => upd({ listType: e.target.value })}>
                  {LIST_SUBTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {nt === 'element' && (
              <div className="comp-config-row">
                <span className="comp-config-label">element type</span>
                <select className="form-input" value={node.elementType || 'text'} onChange={e => upd({ elementType: e.target.value })}>
                  {ELEMENT_SUBTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {nt === 'component' && (
              <div className="comp-config-row">
                <span className="comp-config-label">component</span>
                <SearchSelect value={node.component || ''} onChange={v => upd({ component: v })} options={refOptions?.component || []} placeholder="component_id" />
              </div>
            )}

            {nt === 'slot' && (<>
              <div className="comp-config-row">
                <span className="comp-config-label">slot name</span>
                <input className="form-input" value={node.slotName || ''} onChange={e => upd({ slotName: e.target.value })} placeholder="content_slot" />
              </div>
              <div className="comp-config-row">
                <span className="comp-config-label">slot content</span>
                <input className="form-input" value={node.slotContent || ''} onChange={e => upd({ slotContent: e.target.value })} placeholder="ComponentToPassIn" />
              </div>
            </>)}

            <div className="comp-config-row">
              <span className="comp-config-label">description</span>
              <input className="form-input" value={node.description || ''} onChange={e => upd({ description: e.target.value })} placeholder="What does this node do?" />
            </div>
          </div>

          {/* Sub-blocks: params (component only), data source, triggers, condition */}
          <div className="comp-node-extras">
            {nt === 'component' && (
              <ParamsEditor params={node.params || []} onChange={params => upd({ params })} />
            )}
            {HAS_DATA_SOURCE.has(nt) && (
              <DataSourceEditor dataSource={node.dataSource} onChange={ds => upd({ dataSource: ds })} refOptions={refOptions} />
            )}
            {HAS_TRIGGERS.has(nt) && (
              <TriggersEditor triggers={node.triggers || []} onChange={triggers => upd({ triggers })} refOptions={refOptions} />
            )}
            <ConditionEditor condition={node.condition} onChange={cond => upd({ condition: cond })} refOptions={refOptions} />
          </div>

          {/* Children */}
          {CAN_HAVE_CHILDREN.has(nt) && (
            <div className="comp-children">
              <div className="comp-children-header">
                <span className="comp-sub-label">children</span>
                <button className="btn sm" onClick={addChild}>{Icons.plus} Add node</button>
              </div>
              {(node.children || []).map((child, i) => (
                <NodeItem
                  key={i} node={child} depth={depth + 1}
                  onChange={c => upChild(i, c)}
                  onRemove={() => rmChild(i)}
                  onDuplicate={() => dupChild(i)}
                  refOptions={refOptions}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── CompositionEditor (default export) ───────────────────────────────────────

export default function CompositionEditor({ content, onChange, refOptions }) {
  const [mode, setMode] = useState('form')
  const data  = useMemo(() => extractCompositionData(content), [content])
  const nodes = data.nodes || []

  const updateData  = (nn)    => onChange(applyCompositionData(content, { nodes: nn }))
  const addNode     = ()      => updateData([...nodes, emptyNode('node_' + (nodes.length + 1))])
  const rmNode      = (i)     => updateData(nodes.filter((_, idx) => idx !== i))
  const upNode      = (i, n)  => updateData(nodes.map((x, idx) => idx === i ? n : x))
  const dupNode     = (i)     => {
    const copy = JSON.parse(JSON.stringify(nodes[i])); copy.node += '_copy'
    const next = [...nodes]; next.splice(i + 1, 0, copy); updateData(next)
  }

  const rawJson = useMemo(() => {
    const m = content.match(/```json\n([\s\S]*?)```/)
    return m ? m[1] : JSON.stringify({ nodes: [] }, null, 2)
  }, [content])

  return (
    <div>
      <div className="dm-mode-bar">
        <button className={`mode-tab${mode === 'form' ? ' active' : ''}`} onClick={() => setMode('form')}>Tree</button>
        <button className={`mode-tab${mode === 'json' ? ' active' : ''}`} onClick={() => setMode('json')}>JSON</button>
      </div>
      {mode === 'json' ? (
        <textarea
          className="yaml-editor" style={{ marginTop: 8 }}
          value={rawJson}
          onChange={e => {
            try { onChange(applyCompositionData(content, JSON.parse(e.target.value))) }
            catch { if (content.includes('```json')) onChange(content.replace(/```json\n[\s\S]*?```/, '```json\n' + e.target.value + '\n```')) }
          }}
          spellCheck={false}
        />
      ) : (
        <div className="comp-editor">
          {nodes.map((node, i) => (
            <NodeItem key={i} node={node} depth={0}
              onChange={n => upNode(i, n)}
              onRemove={() => rmNode(i)}
              onDuplicate={() => dupNode(i)}
              refOptions={refOptions}
            />
          ))}
          <button className="btn add-section-btn" style={{ marginTop: nodes.length ? 8 : 0 }} onClick={addNode}>
            {Icons.plus} Add node
          </button>
        </div>
      )}
    </div>
  )
}
