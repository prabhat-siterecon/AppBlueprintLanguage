export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { frontmatter: {}, body: content }
  const fm = {}
  match[1].split('\n').forEach((line) => {
    const idx = line.indexOf(':')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const val = line.slice(idx + 1).trim()
      fm[key] = val
    }
  })
  return { frontmatter: fm, body: content.slice(match[0].length).trim() }
}

export function serializeFrontmatter(fm) {
  return '---\n' + Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n---'
}

export function extractSections(body) {
  const sections = []
  const lines = body.split('\n')
  let current = null
  let buffer = []

  const flush = () => {
    if (current) {
      sections.push({ heading: current, content: buffer.join('\n').trim() })
    }
    buffer = []
  }

  for (const line of lines) {
    if (line.match(/^##\s+/)) {
      flush()
      current = line.replace(/^##\s+/, '').trim()
    } else if (current) {
      buffer.push(line)
    } else {
      buffer.push(line)
    }
  }
  flush()

  const descMatch = body.match(/^([\s\S]*?)(?=\n##\s)/)
  const description = descMatch ? descMatch[1].replace(/^#\s+.*\n?/, '').trim() : ''

  return { description, sections }
}

export function extractYamlFromSection(content) {
  const match = content.match(/```yaml\n([\s\S]*?)```/)
  return match ? match[1].trim() : null
}

export function extractReferences(content) {
  const refs = new Set()
  const patterns = [
    /component:\s*(\w+)/g,
    /action:\s*(\w+)/g,
    /query:\s*(\w+)/g,
    /model:\s*(\w+)/g,
    /page:\s*(\w+)/g,
    /entry_page:\s*["']?(\w+)/g,
    /login_page:\s*["']?(\w+)/g,
    /tests_for:\s*(\w+)/g,
    /style_token:\s*([\w.]+)/g,
    /ref:(\w+)/g,
  ]
  patterns.forEach((p) => {
    let m
    while ((m = p.exec(content)) !== null) refs.add(m[1])
  })
  // Extract comma-separated ref lists (used in feature files)
  const csvPatterns = [
    /^\s*pages:\s*([^\n"{}[\]]+)/gm,
    /^\s*components:\s*([^\n"{}[\]]+)/gm,
    /^\s*models:\s*([^\n"{}[\]]+)/gm,
    /^\s*actions:\s*([^\n"{}[\]]+)/gm,
    /^\s*services:\s*([^\n"{}[\]]+)/gm,
  ]
  csvPatterns.forEach((p) => {
    let m
    while ((m = p.exec(content)) !== null) {
      m[1].replace(/^"|"$/g, '').split(',').forEach((id) => {
        const t = id.trim()
        if (t && t !== '""' && /^\w+$/.test(t)) refs.add(t)
      })
    }
  })
  return [...refs]
}

// Typed reference extraction — returns [{ id, category }]
// Categories: component | action | model | function | api | state | page
export function extractTypedReferences(content) {
  const result = []
  const seen = new Set()
  const add = (id, category) => {
    if (!id || typeof id !== 'string') return
    const clean = id.trim()
    if (!clean || clean === '""' || clean === "''" || clean === 'null') return
    const key = `${category}:${clean}`
    if (seen.has(key)) return
    seen.add(key)
    result.push({ id: clean, category })
  }

  let m

  // Component refs (YAML field)
  const compPat = /component:\s*(\w+)/g
  while ((m = compPat.exec(content)) !== null) add(m[1], 'component')

  // Action refs (YAML field + inline action: prefix in lifecycle values)
  const actionPat = /(?:^|[^_a-zA-Z])action:\s*(\w+)/gm
  while ((m = actionPat.exec(content)) !== null) add(m[1], 'action')

  // Lifecycle hooks → action refs (value may have "action:" prefix or bare id)
  const lifecyclePat = /on_(?:enter|leave|focus|mount|unmount|update|load):\s*["']?(?:action:)?(\w+)["']?/g
  while ((m = lifecyclePat.exec(content)) !== null) {
    const v = m[1]
    if (v && v !== 'null' && v !== 'true' && v !== 'false') add(v, 'action')
  }

  // Model refs
  const modelPat = /model:\s*(\w+)/g
  while ((m = modelPat.exec(content)) !== null) add(m[1], 'model')

  // Page refs
  ;[/\bpage:\s*(\w+)/g, /entry_page:\s*["']?(\w+)/g, /login_page:\s*["']?(\w+)/g].forEach(p => {
    while ((m = p.exec(content)) !== null) add(m[1], 'page')
  })

  // API refs — service:svc_id.endpoint in step refs
  const apiStepPat = /ref:\s*["']?service:(\w+(?:\.\w+)?)["']?/g
  while ((m = apiStepPat.exec(content)) !== null) add(m[1], 'api')

  // API refs — plain query: id
  const queryPat = /query:\s*(\w+)/g
  while ((m = queryPat.exec(content)) !== null) add(m[1], 'api')

  // State refs — ref: state.key in action steps
  const stateStepPat = /ref:\s*["']?state\.(\w+)["']?/g
  while ((m = stateStepPat.exec(content)) !== null) add(m[1], 'state')

  // Feature CSV fields
  const csvMap = { pages: 'page', components: 'component', models: 'model', actions: 'action', services: 'api' }
  Object.entries(csvMap).forEach(([key, cat]) => {
    const p = new RegExp(`^\\s*${key}:\\s*([^\\n"{}\\[\\]]+)`, 'gm')
    while ((m = p.exec(content)) !== null) {
      m[1].replace(/^"|"$/g, '').split(',').forEach(id => {
        const t = id.trim()
        if (t && t !== '""' && /^\w+$/.test(t)) add(t, cat)
      })
    }
  })

  // Parse composition JSON tree for component, action trigger, and dataSource refs
  const jsonMatch = content.match(/```json\n([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      if (Array.isArray(data.nodes)) _traverseCompositionNodes(data.nodes, add)
    } catch {}
  }

  return result
}

function _traverseCompositionNodes(nodes, add) {
  nodes.forEach(node => {
    if (node.nodeType === 'component' && node.component) add(node.component, 'component')
    if (Array.isArray(node.triggers)) {
      node.triggers.forEach(t => { if (t.action) add(t.action, 'action') })
    }
    if (node.dataSource?.ref) {
      const { type, ref } = node.dataSource
      if (type === 'api')      add(ref, 'api')
      else if (type === 'state')    add(ref.replace(/^state\./, ''), 'state')
      else if (type === 'function') add(ref, 'function')
    }
    if (Array.isArray(node.children)) _traverseCompositionNodes(node.children, add)
  })
}

export function isSectionEmpty(content) {
  const jsonMatch = content.match(/```json\n([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      return !parsed.nodes || parsed.nodes.length === 0
    } catch { return false }
  }
  const yaml = extractYamlFromSection(content)
  if (yaml === null) return !content.trim()
  if (!yaml) return true
  return yaml.split('\n').every((l) => {
    const trimmed = l.trim()
    return !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.endsWith(': ""') ||
      trimmed.endsWith(": ''") ||
      trimmed.endsWith(': []') ||
      trimmed.endsWith(': {}') ||
      /^\w+:\s*$/.test(trimmed)
  })
}

export function getTitle(body) {
  const match = body.match(/^#\s+(.*)/m)
  return match ? match[1] : ''
}
