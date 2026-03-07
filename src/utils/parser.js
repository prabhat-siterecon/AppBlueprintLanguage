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
