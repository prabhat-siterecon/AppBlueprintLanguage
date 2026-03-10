import React, { useState, useMemo } from 'react'
import { Icons } from './Icons'

// ── Data Queries Form ──────────────────────────────────────────────────────────

const QUERY_OPERATIONS = ['find', 'find_one', 'count', 'insert', 'update', 'upsert', 'delete', 'aggregate', 'custom']
const emptyQuery = (n) => ({ id: 'query_' + (n + 1), name: '', description: '', collection: '', operation: 'find', params: [], filter: '', sort: '', limit: '', returns: '' })

function QueryParamsEditor({ params, onAdd, onRemove, onUpdate }) {
  return (
    <div className="ep-list">
      {params.length > 0 && (
        <div className="ep-list-head">
          <span style={{ flex: 1 }}>name</span>
          <span style={{ width: 90 }}>type</span>
          <span style={{ width: 64 }}>required</span>
          <span style={{ flex: 2 }}>description</span>
          <span style={{ width: 28 }} />
        </div>
      )}
      {params.map((p, i) => (
        <div key={i} className="ep-list-row">
          <input className="form-input" style={{ flex: 1 }} value={p.name || ''} onChange={e => onUpdate(i, { name: e.target.value })} placeholder="param_name" />
          <input className="form-input" style={{ width: 90 }} value={p.type || ''} onChange={e => onUpdate(i, { type: e.target.value })} placeholder="string" />
          <label className="toggle-label" style={{ width: 64, flexShrink: 0 }}>
            <input type="checkbox" checked={!!p.required} onChange={e => onUpdate(i, { required: e.target.checked })} />
            <span>{p.required ? 'yes' : 'no'}</span>
          </label>
          <input className="form-input" style={{ flex: 2 }} value={p.description || ''} onChange={e => onUpdate(i, { description: e.target.value })} placeholder="Description" />
          <button className="btn sm danger" style={{ width: 28, padding: 0, flexShrink: 0 }} onClick={() => onRemove(i)}>{Icons.trash}</button>
        </div>
      ))}
      <button className="btn sm" style={{ marginTop: 6 }} onClick={onAdd}>{Icons.plus} Add Param</button>
    </div>
  )
}

function DataQueriesForm({ data, onCommit }) {
  const queries = data.queries || []
  const [openQuery, setOpenQuery] = useState(null)
  const [openParams, setOpenParams] = useState({})

  const commit = (qs) => onCommit({ ...data, queries: qs })
  const addQuery = () => { const qs = [...queries, emptyQuery(queries.length)]; commit(qs); setOpenQuery(qs.length - 1) }
  const removeQuery = (i) => { commit(queries.filter((_, idx) => idx !== i)); if (openQuery === i) setOpenQuery(null) }
  const updateQuery = (i, patch) => commit(queries.map((q, idx) => idx === i ? { ...q, ...patch } : q))

  const addParam = (qi) => updateQuery(qi, { params: [...(queries[qi].params || []), { name: '', type: 'string', required: false, description: '' }] })
  const removeParam = (qi, pi) => updateQuery(qi, { params: (queries[qi].params || []).filter((_, i) => i !== pi) })
  const updateParam = (qi, pi, patch) => updateQuery(qi, { params: (queries[qi].params || []).map((p, i) => i === pi ? { ...p, ...patch } : p) })

  return (
    <div className="service-editor">
      {queries.map((q, qi) => {
        const isOpen = openQuery === qi
        return (
          <div key={qi} className="svc-card">
            <div className="svc-header" onClick={() => setOpenQuery(isOpen ? null : qi)}>
              <span className="svc-chevron">{isOpen ? '▾' : '▸'}</span>
              <div className="svc-title-group">
                <span className="svc-name">{q.name || <em style={{ opacity: 0.4 }}>Unnamed query</em>}</span>
                {q.collection && <span className="svc-baseurl">{q.collection}</span>}
              </div>
              <span className="ep-method-badge" style={{ background: '#0d1a2a', color: '#60a5fa', borderColor: '#1e3a5f', fontSize: 10, padding: '2px 7px' }}>{q.operation || 'find'}</span>
              <button className="btn sm danger" onClick={e => { e.stopPropagation(); removeQuery(qi) }}>{Icons.trash}</button>
            </div>
            {isOpen && (
              <div className="svc-body">
                <div className="svc-meta">
                  <div className="svc-field">
                    <label>ID</label>
                    <input className="form-input" value={q.id || ''} onChange={e => updateQuery(qi, { id: e.target.value })} placeholder="get_active_users" />
                  </div>
                  <div className="svc-field">
                    <label>Name</label>
                    <input className="form-input" value={q.name || ''} onChange={e => updateQuery(qi, { name: e.target.value })} placeholder="Get Active Users" />
                  </div>
                  <div className="svc-field" style={{ minWidth: 120, flex: 'none' }}>
                    <label>Operation</label>
                    <select className="form-input" value={q.operation || 'find'} onChange={e => updateQuery(qi, { operation: e.target.value })}>
                      {QUERY_OPERATIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="svc-field">
                    <label>Collection / Table</label>
                    <input className="form-input" value={q.collection || ''} onChange={e => updateQuery(qi, { collection: e.target.value })} placeholder="users" />
                  </div>
                  <div className="svc-field svc-field-full">
                    <label>Description</label>
                    <input className="form-input" value={q.description || ''} onChange={e => updateQuery(qi, { description: e.target.value })} placeholder="What does this query do?" />
                  </div>
                  <div className="svc-field svc-field-full">
                    <label>Filter / Where</label>
                    <input className="form-input" value={q.filter || ''} onChange={e => updateQuery(qi, { filter: e.target.value })} placeholder="status = 'active' AND created_at > $date" />
                  </div>
                  <div className="svc-field">
                    <label>Sort</label>
                    <input className="form-input" value={q.sort || ''} onChange={e => updateQuery(qi, { sort: e.target.value })} placeholder="created_at desc" />
                  </div>
                  <div className="svc-field">
                    <label>Limit</label>
                    <input className="form-input" value={q.limit || ''} onChange={e => updateQuery(qi, { limit: e.target.value })} placeholder="20" />
                  </div>
                  <div className="svc-field svc-field-full">
                    <label>Returns</label>
                    <input className="form-input" value={q.returns || ''} onChange={e => updateQuery(qi, { returns: e.target.value })} placeholder="User[] or paginated list of user records" />
                  </div>
                </div>
                <div className="svc-eps">
                  <div className="svc-eps-header">
                    <span className="svc-eps-label">Params</span>
                  </div>
                  <QueryParamsEditor
                    params={q.params || []}
                    onAdd={() => addParam(qi)}
                    onRemove={(pi) => removeParam(qi, pi)}
                    onUpdate={(pi, patch) => updateParam(qi, pi, patch)}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
      <button className="btn sm" style={{ marginTop: 10 }} onClick={addQuery}>{Icons.plus} Add Query</button>
    </div>
  )
}

// ── HTTP Service form vars ─────────────────────────────────────────────────────

const METHOD_COLORS = {
  GET:     { bg: '#0d2a1a', text: '#4ade80', border: '#166534' },
  POST:    { bg: '#0d1f3a', text: '#60a5fa', border: '#1e3a5f' },
  PUT:     { bg: '#2a1a0d', text: '#fb923c', border: '#7c3d12' },
  DELETE:  { bg: '#2a0d0d', text: '#f87171', border: '#7f1d1d' },
  PATCH:   { bg: '#1a0d2a', text: '#c084fc', border: '#581c87' },
  HEAD:    { bg: '#1a1a1a', text: '#9ca3af', border: '#374151' },
  OPTIONS: { bg: '#1a1a2a', text: '#7dd3fc', border: '#1e3a5f' },
}

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
const IN_OPTIONS = ['query', 'path', 'header', 'cookie']

// ── Storage helpers ────────────────────────────────────────────────────────────

function extractServiceData(content) {
  const m = content.match(/```json\n([\s\S]*?)```/)
  if (!m) return { services: [] }
  try { return JSON.parse(m[1]) } catch { return { services: [] } }
}

function applyServiceData(content, data) {
  const json = JSON.stringify(data, null, 2)
  if (/```json\n[\s\S]*?```/.test(content)) {
    return content.replace(/```json\n[\s\S]*?```/, '```json\n' + json + '\n```')
  }
  return '```json\n' + json + '\n```'
}

// ── Default empty shapes ───────────────────────────────────────────────────────

const emptyService = (n) => ({ id: 'service_' + (n + 1), name: '', base_url: '', description: '', auth: '', endpoints: [] })
const emptyEndpoint = (n) => ({ id: 'ep_' + (n + 1), name: '', method: 'GET', path: '', description: '', params: [], headers: [], body: { schema: '', example: '' }, responses: [], errors: [] })

// ── Main component ─────────────────────────────────────────────────────────────

export default function ServiceEditor({ content, onChange }) {
  const data = useMemo(() => extractServiceData(content), [content])
  const services = data.services || []
  const isQueryDoc = data.queries !== undefined && data.services === undefined

  const [mode, setMode] = useState('form')
  const [openService, setOpenService] = useState(null)
  const [openEndpoint, setOpenEndpoint] = useState({})
  const [activeTab, setActiveTab] = useState({})

  const commit = (svcs) => onChange(applyServiceData(content, { ...data, services: svcs }))

  const addService = () => {
    const svcs = [...services, emptyService(services.length)]
    commit(svcs)
    setOpenService(svcs.length - 1)
  }

  const removeService = (si) => {
    commit(services.filter((_, i) => i !== si))
    if (openService === si) setOpenService(null)
  }

  const updateService = (si, patch) =>
    commit(services.map((s, i) => i === si ? { ...s, ...patch } : s))

  const addEndpoint = (si) => {
    const eps = [...(services[si].endpoints || []), emptyEndpoint((services[si].endpoints || []).length)]
    updateService(si, { endpoints: eps })
    setOpenEndpoint(prev => ({ ...prev, [si]: eps.length - 1 }))
  }

  const removeEndpoint = (si, ei) => {
    const eps = (services[si].endpoints || []).filter((_, i) => i !== ei)
    updateService(si, { endpoints: eps })
    if (openEndpoint[si] === ei) setOpenEndpoint(prev => ({ ...prev, [si]: null }))
  }

  const updateEndpoint = (si, ei, patch) => {
    const eps = (services[si].endpoints || []).map((ep, i) => i === ei ? { ...ep, ...patch } : ep)
    updateService(si, { endpoints: eps })
  }

  const addItem = (si, ei, field, item) => {
    const ep = services[si].endpoints[ei]
    updateEndpoint(si, ei, { [field]: [...(ep[field] || []), item] })
  }

  const removeItem = (si, ei, field, idx) => {
    const ep = services[si].endpoints[ei]
    updateEndpoint(si, ei, { [field]: (ep[field] || []).filter((_, i) => i !== idx) })
  }

  const updateItem = (si, ei, field, idx, patch) => {
    const ep = services[si].endpoints[ei]
    updateEndpoint(si, ei, { [field]: (ep[field] || []).map((item, i) => i === idx ? { ...item, ...patch } : item) })
  }

  const rawJson = useMemo(() => {
    const m = content.match(/```json\n([\s\S]*?)```/)
    return m ? m[1] : JSON.stringify({ services: [] }, null, 2)
  }, [content])

  return (
    <div>
      <div className="dm-mode-bar">
        <button className={`mode-tab${mode === 'form' ? ' active' : ''}`} onClick={() => setMode('form')}>Form</button>
        <button className={`mode-tab${mode === 'json' ? ' active' : ''}`} onClick={() => setMode('json')}>JSON</button>
      </div>
      {mode === 'json' ? (
        <textarea
          className="yaml-editor"
          style={{ marginTop: 8 }}
          value={rawJson}
          onChange={e => {
            try { onChange(applyServiceData(content, JSON.parse(e.target.value))) }
            catch { if (content.includes('```json')) onChange(content.replace(/```json\n[\s\S]*?```/, '```json\n' + e.target.value + '\n```')) }
          }}
          spellCheck={false}
        />
      ) : isQueryDoc ? (
        <DataQueriesForm data={data} onCommit={d => onChange(applyServiceData(content, d))} />
      ) : (
    <div className="service-editor">
      {services.map((svc, si) => {
        const isOpen = openService === si
        return (
          <div key={si} className="svc-card">
            <div className="svc-header" onClick={() => setOpenService(isOpen ? null : si)}>
              <span className="svc-chevron">{isOpen ? '▾' : '▸'}</span>
              <div className="svc-title-group">
                <span className="svc-name">{svc.name || <em style={{ opacity: 0.4 }}>Unnamed service</em>}</span>
                {svc.base_url && <span className="svc-baseurl">{svc.base_url}</span>}
              </div>
              <span className="svc-ep-badge">{(svc.endpoints || []).length} ep</span>
              <button className="btn sm danger" onClick={e => { e.stopPropagation(); removeService(si) }}>{Icons.trash}</button>
            </div>

            {isOpen && (
              <div className="svc-body">
                {/* Service meta fields */}
                <div className="svc-meta">
                  <div className="svc-field">
                    <label>ID</label>
                    <input className="form-input" value={svc.id || ''} onChange={e => updateService(si, { id: e.target.value })} placeholder="service_id" />
                  </div>
                  <div className="svc-field">
                    <label>Name</label>
                    <input className="form-input" value={svc.name || ''} onChange={e => updateService(si, { name: e.target.value })} placeholder="User API" />
                  </div>
                  <div className="svc-field svc-field-wide">
                    <label>Base URL</label>
                    <input className="form-input" value={svc.base_url || ''} onChange={e => updateService(si, { base_url: e.target.value })} placeholder="https://api.example.com/v1" />
                  </div>
                  <div className="svc-field">
                    <label>Auth</label>
                    <input className="form-input" value={svc.auth || ''} onChange={e => updateService(si, { auth: e.target.value })} placeholder="Bearer token" />
                  </div>
                  <div className="svc-field svc-field-full">
                    <label>Description</label>
                    <input className="form-input" value={svc.description || ''} onChange={e => updateService(si, { description: e.target.value })} placeholder="What does this service provide?" />
                  </div>
                </div>

                {/* Endpoints */}
                <div className="svc-eps">
                  <div className="svc-eps-header">
                    <span className="svc-eps-label">Endpoints</span>
                    <button className="btn sm" onClick={() => addEndpoint(si)}>{Icons.plus} Add Endpoint</button>
                  </div>

                  {(svc.endpoints || []).length === 0 && (
                    <div className="svc-empty-hint">No endpoints yet — add one above</div>
                  )}

                  {(svc.endpoints || []).map((ep, ei) => {
                    const epOpen = openEndpoint[si] === ei
                    const mc = METHOD_COLORS[ep.method] || METHOD_COLORS.GET
                    const tk = `${si}_${ei}`
                    const tab = activeTab[tk] || 'params'

                    return (
                      <div key={ei} className="ep-card">
                        <div className="ep-header" onClick={() => setOpenEndpoint(prev => ({ ...prev, [si]: epOpen ? null : ei }))}>
                          <span className="ep-chevron">{epOpen ? '▾' : '▸'}</span>
                          <span className="ep-method-badge" style={{ background: mc.bg, color: mc.text, borderColor: mc.border }}>{ep.method || 'GET'}</span>
                          <span className="ep-path">{ep.path || <em style={{ opacity: 0.35 }}>/path</em>}</span>
                          <span className="ep-name-label">{ep.name}</span>
                          <button className="btn sm danger" onClick={e => { e.stopPropagation(); removeEndpoint(si, ei) }}>{Icons.trash}</button>
                        </div>

                        {epOpen && (
                          <div className="ep-body">
                            {/* Endpoint basics */}
                            <div className="svc-meta">
                              <div className="svc-field">
                                <label>ID</label>
                                <input className="form-input" value={ep.id || ''} onChange={e => updateEndpoint(si, ei, { id: e.target.value })} placeholder="get_user" />
                              </div>
                              <div className="svc-field">
                                <label>Name</label>
                                <input className="form-input" value={ep.name || ''} onChange={e => updateEndpoint(si, ei, { name: e.target.value })} placeholder="Get User" />
                              </div>
                              <div className="svc-field" style={{ minWidth: 100, flex: 'none' }}>
                                <label>Method</label>
                                <select className="form-input" value={ep.method || 'GET'} onChange={e => updateEndpoint(si, ei, { method: e.target.value })}>
                                  {METHOD_OPTIONS.map(m => <option key={m}>{m}</option>)}
                                </select>
                              </div>
                              <div className="svc-field svc-field-wide">
                                <label>Path</label>
                                <input className="form-input" value={ep.path || ''} onChange={e => updateEndpoint(si, ei, { path: e.target.value })} placeholder="/users/{id}" />
                              </div>
                              <div className="svc-field svc-field-full">
                                <label>Description</label>
                                <input className="form-input" value={ep.description || ''} onChange={e => updateEndpoint(si, ei, { description: e.target.value })} placeholder="What does this endpoint do?" />
                              </div>
                            </div>

                            {/* Tabs */}
                            <div className="ep-tabs">
                              {['params', 'headers', 'body', 'responses', 'errors'].map(t => {
                                const count = t === 'params' ? ep.params?.length : t === 'headers' ? ep.headers?.length : t === 'responses' ? ep.responses?.length : t === 'errors' ? ep.errors?.length : 0
                                return (
                                  <button key={t} className={'ep-tab' + (tab === t ? ' active' : '')}
                                    onClick={() => setActiveTab(prev => ({ ...prev, [tk]: t }))}>
                                    {t}
                                    {count > 0 && <span className="ep-tab-count">{count}</span>}
                                  </button>
                                )
                              })}
                            </div>

                            <div className="ep-tab-body">
                              {tab === 'params' && (
                                <ParamsTab
                                  params={ep.params || []}
                                  onAdd={() => addItem(si, ei, 'params', { name: '', in: 'query', type: 'string', required: false, description: '' })}
                                  onRemove={idx => removeItem(si, ei, 'params', idx)}
                                  onUpdate={(idx, patch) => updateItem(si, ei, 'params', idx, patch)}
                                />
                              )}
                              {tab === 'headers' && (
                                <HeadersTab
                                  headers={ep.headers || []}
                                  onAdd={() => addItem(si, ei, 'headers', { name: '', value: '', required: false })}
                                  onRemove={idx => removeItem(si, ei, 'headers', idx)}
                                  onUpdate={(idx, patch) => updateItem(si, ei, 'headers', idx, patch)}
                                />
                              )}
                              {tab === 'body' && (
                                <BodyTab
                                  body={ep.body || { schema: '', example: '' }}
                                  onChange={body => updateEndpoint(si, ei, { body })}
                                />
                              )}
                              {tab === 'responses' && (
                                <ResponsesTab
                                  responses={ep.responses || []}
                                  onAdd={() => addItem(si, ei, 'responses', { status: 200, description: 'Success', schema: '' })}
                                  onRemove={idx => removeItem(si, ei, 'responses', idx)}
                                  onUpdate={(idx, patch) => updateItem(si, ei, 'responses', idx, patch)}
                                />
                              )}
                              {tab === 'errors' && (
                                <ErrorsTab
                                  errors={ep.errors || []}
                                  onAdd={() => addItem(si, ei, 'errors', { code: 400, message: '' })}
                                  onRemove={idx => removeItem(si, ei, 'errors', idx)}
                                  onUpdate={(idx, patch) => updateItem(si, ei, 'errors', idx, patch)}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
      <button className="btn sm" style={{ marginTop: 10 }} onClick={addService}>{Icons.plus} Add Service</button>
    </div>
      )}
    </div>
  )
}

// ── Tab sub-components ─────────────────────────────────────────────────────────

function ParamsTab({ params, onAdd, onRemove, onUpdate }) {
  return (
    <div className="ep-list">
      {params.length > 0 && (
        <div className="ep-list-head">
          <span style={{ width: 130 }}>Name</span>
          <span style={{ width: 76 }}>In</span>
          <span style={{ width: 90 }}>Type</span>
          <span style={{ width: 64 }}>Required</span>
          <span style={{ flex: 1 }}>Description</span>
          <span style={{ width: 28 }} />
        </div>
      )}
      {params.map((p, i) => (
        <div key={i} className="ep-list-row">
          <input className="form-input" style={{ width: 130 }} value={p.name || ''} onChange={e => onUpdate(i, { name: e.target.value })} placeholder="param_name" />
          <select className="form-input" style={{ width: 76 }} value={p.in || 'query'} onChange={e => onUpdate(i, { in: e.target.value })}>
            {IN_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
          <input className="form-input" style={{ width: 90 }} value={p.type || ''} onChange={e => onUpdate(i, { type: e.target.value })} placeholder="string" />
          <label className="toggle-label" style={{ width: 64, flexShrink: 0 }}>
            <input type="checkbox" checked={!!p.required} onChange={e => onUpdate(i, { required: e.target.checked })} />
            <span>{p.required ? 'yes' : 'no'}</span>
          </label>
          <input className="form-input" style={{ flex: 1 }} value={p.description || ''} onChange={e => onUpdate(i, { description: e.target.value })} placeholder="Description" />
          <button className="btn sm danger" style={{ width: 28, padding: 0, flexShrink: 0 }} onClick={() => onRemove(i)}>{Icons.trash}</button>
        </div>
      ))}
      <button className="btn sm" style={{ marginTop: 6 }} onClick={onAdd}>{Icons.plus} Add Param</button>
    </div>
  )
}

function HeadersTab({ headers, onAdd, onRemove, onUpdate }) {
  return (
    <div className="ep-list">
      {headers.length > 0 && (
        <div className="ep-list-head">
          <span style={{ flex: 1 }}>Name</span>
          <span style={{ flex: 2 }}>Value</span>
          <span style={{ width: 64 }}>Required</span>
          <span style={{ width: 28 }} />
        </div>
      )}
      {headers.map((h, i) => (
        <div key={i} className="ep-list-row">
          <input className="form-input" style={{ flex: 1 }} value={h.name || ''} onChange={e => onUpdate(i, { name: e.target.value })} placeholder="Content-Type" />
          <input className="form-input" style={{ flex: 2 }} value={h.value || ''} onChange={e => onUpdate(i, { value: e.target.value })} placeholder="application/json" />
          <label className="toggle-label" style={{ width: 64, flexShrink: 0 }}>
            <input type="checkbox" checked={!!h.required} onChange={e => onUpdate(i, { required: e.target.checked })} />
            <span>{h.required ? 'yes' : 'no'}</span>
          </label>
          <button className="btn sm danger" style={{ width: 28, padding: 0, flexShrink: 0 }} onClick={() => onRemove(i)}>{Icons.trash}</button>
        </div>
      ))}
      <button className="btn sm" style={{ marginTop: 6 }} onClick={onAdd}>{Icons.plus} Add Header</button>
    </div>
  )
}

function BodyTab({ body, onChange }) {
  return (
    <div className="ep-body-tab">
      <div className="ep-body-half">
        <div className="ep-body-label">Schema</div>
        <textarea className="yaml-editor ep-body-textarea" value={body.schema || ''} onChange={e => onChange({ ...body, schema: e.target.value })} placeholder={'{\n  "field": "type"\n}'} spellCheck={false} />
      </div>
      <div className="ep-body-half">
        <div className="ep-body-label">Example</div>
        <textarea className="yaml-editor ep-body-textarea" value={body.example || ''} onChange={e => onChange({ ...body, example: e.target.value })} placeholder={'{\n  "field": "value"\n}'} spellCheck={false} />
      </div>
    </div>
  )
}

function ResponsesTab({ responses, onAdd, onRemove, onUpdate }) {
  return (
    <div className="ep-list">
      {responses.map((r, i) => (
        <div key={i} className="ep-response-block">
          <div className="ep-response-meta">
            <span className="ep-status-badge" style={{ background: r.status >= 400 ? '#2a0d0d' : r.status >= 300 ? '#2a1a0d' : '#0d2a1a', color: r.status >= 400 ? '#f87171' : r.status >= 300 ? '#fb923c' : '#4ade80', borderColor: r.status >= 400 ? '#7f1d1d' : r.status >= 300 ? '#7c3d12' : '#166534' }}>
              {r.status}
            </span>
            <input className="form-input" style={{ flex: 1 }} value={r.description || ''} onChange={e => onUpdate(i, { description: e.target.value })} placeholder="Success" />
            <button className="btn sm danger" style={{ flexShrink: 0 }} onClick={() => onRemove(i)}>{Icons.trash}</button>
          </div>
          <textarea className="yaml-editor" style={{ minHeight: 60, marginTop: 6 }} value={r.schema || ''} onChange={e => onUpdate(i, { schema: e.target.value })} placeholder="Response schema or example..." spellCheck={false} />
        </div>
      ))}
      <button className="btn sm" style={{ marginTop: 6 }} onClick={onAdd}>{Icons.plus} Add Response</button>
    </div>
  )
}

function ErrorsTab({ errors, onAdd, onRemove, onUpdate }) {
  return (
    <div className="ep-list">
      {errors.length > 0 && (
        <div className="ep-list-head">
          <span style={{ width: 70 }}>Code</span>
          <span style={{ flex: 1 }}>Message</span>
          <span style={{ width: 28 }} />
        </div>
      )}
      {errors.map((e, i) => (
        <div key={i} className="ep-list-row">
          <input className="form-input" style={{ width: 70 }} type="number" value={e.code || ''} onChange={ev => onUpdate(i, { code: Number(ev.target.value) })} placeholder="404" />
          <input className="form-input" style={{ flex: 1 }} value={e.message || ''} onChange={ev => onUpdate(i, { message: ev.target.value })} placeholder="Not found" />
          <button className="btn sm danger" style={{ width: 28, padding: 0, flexShrink: 0 }} onClick={() => onRemove(i)}>{Icons.trash}</button>
        </div>
      ))}
      <button className="btn sm" style={{ marginTop: 6 }} onClick={onAdd}>{Icons.plus} Add Error</button>
    </div>
  )
}
