// Simple YAML parser/serializer for structured form editing.
// Handles the specific patterns used in ABL sections:
//   section_key: value_or_object
//   section_key:
//     field: value
//   section_key:
//     - field: value

export function parseYamlSection(yamlStr, isArrayHint = false) {
  const lines = yamlStr.split('\n')
  const firstNonEmpty = lines.find(l => l.trim())
  if (!firstNonEmpty) return null

  const colonIdx = firstNonEmpty.indexOf(':')
  if (colonIdx < 0) return null

  const topKey = firstNonEmpty.slice(0, colonIdx).trim()
  const rest = firstNonEmpty.slice(colonIdx + 1).trim()
  const bodyLines = lines.slice(lines.indexOf(firstNonEmpty) + 1).filter(l => l.trim())

  if (rest === '[]' || (rest === '' && isArrayHint && bodyLines.length === 0)) {
    return { topKey, isArray: true, items: [] }
  }
  if (rest === '{}') {
    return { topKey, isArray: false, data: {} }
  }
  if (bodyLines.length > 0 && bodyLines[0].trim().startsWith('- ')) {
    return { topKey, isArray: true, items: parseArrayItems(bodyLines) }
  }
  if (rest === '') {
    return { topKey, isArray: isArrayHint, data: parseObjectFields(bodyLines), items: isArrayHint ? [] : undefined }
  }
  // Flat single value
  return { topKey, isArray: false, data: { [topKey]: parseYamlValue(rest) } }
}

function parseArrayItems(lines) {
  const items = []
  let current = null
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('- ')) {
      if (current !== null) items.push(current)
      current = {}
      const rest = trimmed.slice(2).trim()
      const ci = rest.indexOf(':')
      if (ci > 0) current[rest.slice(0, ci).trim()] = parseYamlValue(rest.slice(ci + 1).trim())
    } else if (current !== null) {
      const ci = trimmed.indexOf(':')
      if (ci > 0) current[trimmed.slice(0, ci).trim()] = parseYamlValue(trimmed.slice(ci + 1).trim())
    }
  }
  if (current !== null) items.push(current)
  return items
}

function parseObjectFields(lines) {
  const obj = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const ci = trimmed.indexOf(':')
    if (ci > 0) {
      obj[trimmed.slice(0, ci).trim()] = parseYamlValue(trimmed.slice(ci + 1).trim())
    }
  }
  return obj
}

function parseYamlValue(str) {
  if (str === 'true') return true
  if (str === 'false') return false
  if (str === 'null' || str === '~') return null
  if (str === '[]') return []
  if (str === '{}') return {}
  if (str === '') return ''
  if (!isNaN(str) && str.trim() !== '') return Number(str)
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1)
  }
  return str
}

export function serializeYamlSection(parsed) {
  const { topKey, isArray, items, data } = parsed
  if (isArray) {
    if (!items || items.length === 0) return `${topKey}: []`
    const lines = [`${topKey}:`]
    for (const item of items) {
      const entries = Object.entries(item)
      if (!entries.length) continue
      let first = true
      for (const [k, v] of entries) {
        lines.push(first ? `  - ${k}: ${serializeYamlValue(v)}` : `    ${k}: ${serializeYamlValue(v)}`)
        first = false
      }
    }
    return lines.join('\n')
  } else {
    if (!data || Object.keys(data).length === 0) return `${topKey}: {}`
    const lines = [`${topKey}:`]
    for (const [k, v] of Object.entries(data)) {
      lines.push(`  ${k}: ${serializeYamlValue(v)}`)
    }
    return lines.join('\n')
  }
}

function serializeYamlValue(v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return '[]'
  if (typeof v === 'object') return '{}'
  const s = String(v)
  if (s === '') return '""'
  // Pass-through raw yaml values
  if (s === '[]' || s === '{}' || s === 'null' || s === 'true' || s === 'false') return s
  if (!isNaN(s)) return s
  if (s.includes(':') || s.includes('#') || s.startsWith('"') || s.startsWith("'")) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
}

export function generateSampleYaml(fieldTypes, sectionKey) {
  const isArray = !!fieldTypes._array
  const fields = Object.entries(fieldTypes).filter(([k]) => k !== '_array')
  if (isArray) {
    if (!fields.length) return `${sectionKey}: []`
    const lines = [`${sectionKey}:`]
    let first = true
    for (const [k, t] of fields) {
      lines.push(first ? `  - ${k}: ${sampleValue(t)}` : `    ${k}: ${sampleValue(t)}`)
      first = false
    }
    return lines.join('\n')
  } else {
    if (!fields.length) return `${sectionKey}: {}`
    const lines = [`${sectionKey}:`]
    for (const [k, t] of fields) lines.push(`  ${k}: ${sampleValue(t)}`)
    return lines.join('\n')
  }
}

function sampleValue(type) {
  if (type.startsWith('enum:')) return type.slice(5).split('|')[0]
  if (type.startsWith('ref:')) return `example_${type.slice(4)}_id`
  switch (type) {
    case 'boolean':     return 'false'
    case 'number':      return '0'
    case 'integer':     return '0'
    case 'date-time':   return '"2026-01-01T00:00:00Z"'
    case 'date':        return '"2026-01-01"'
    case 'string':      return '""'
    case 'string_list': return '[]'
    case 'object':      return '{}'
    case 'action_list': return '[]'
    case 'any':         return 'null'
    default:            return '""'
  }
}

export function typeColor(type) {
  if (type.startsWith('enum:'))    return 'type-enum'
  if (type.startsWith('ref:'))     return 'type-ref'
  if (type === 'boolean')          return 'type-boolean'
  if (type === 'number' || type === 'integer') return 'type-number'
  if (type === 'date-time' || type === 'date') return 'type-date'
  if (type === 'string')           return 'type-string'
  return 'type-other'
}
