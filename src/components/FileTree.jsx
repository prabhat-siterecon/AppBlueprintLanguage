import React, { useState, useMemo } from 'react'
import { Icons } from './Icons'
import { parseFrontmatter, extractSections, extractReferences, isSectionEmpty } from '../utils/parser'

// Fixed folders that always appear, with their default add-file type
const VIRTUAL_FOLDERS = [
  { path: 'blueprint',            name: 'blueprint',   defaultType: 'general'   },
  { path: 'blueprint/pages',      name: 'pages',       defaultType: 'page'      },
  { path: 'blueprint/components', name: 'components',  defaultType: 'component' },
  { path: 'blueprint/actions',    name: 'actions',     defaultType: 'action'    },
  { path: 'blueprint/services',   name: 'services',    defaultType: 'service'   },
  { path: 'blueprint/data',       name: 'data',        defaultType: 'datamodel' },
  { path: 'blueprint/features',   name: 'features',    defaultType: 'feature'   },
  { path: 'blueprint/functions',  name: 'functions',   defaultType: 'function'  },
]

const FOLDER_DEFAULT_TYPE = Object.fromEntries(VIRTUAL_FOLDERS.map(f => [f.path, f.defaultType]))

// Unicode symbol per type
const TYPE_SYMBOL = {
  page:      { char: '▣', cls: 'ts-page' },
  component: { char: '◫', cls: 'ts-component' },
  action:    { char: '▸', cls: 'ts-action' },
  datamodel: { char: '⬡', cls: 'ts-datamodel' },
  service:   { char: '⚙', cls: 'ts-service' },
  feature:   { char: '◆', cls: 'ts-feature' },
  config:    { char: '⚙', cls: 'ts-config' },
  function:  { char: 'ƒ', cls: 'ts-function' },
  general:   { char: '◉', cls: 'ts-general' },
}

export default function FileTree({ files, activeFile, onSelect, onAddToFolder }) {
  const [openFolders, setOpenFolders] = useState(
    new Set(VIRTUAL_FOLDERS.map(f => f.path))
  )

  const tree = useMemo(() => {
    // Start with all virtual folders
    const root = {}
    VIRTUAL_FOLDERS.forEach(vf => {
      const parts = vf.path.split('/')
      let node = root
      for (let i = 0; i < parts.length; i++) {
        const folderPath = parts.slice(0, i + 1).join('/')
        if (!node[folderPath]) {
          node[folderPath] = { _folder: true, _name: parts[i], _path: folderPath, _children: {} }
        }
        if (i < parts.length - 1) node = node[folderPath]._children
      }
    })

    // Add files into the tree (also auto-creates any non-virtual folders)
    files.forEach((f) => {
      const parts = f.path.split('/')
      let node = root
      for (let i = 0; i < parts.length - 1; i++) {
        const folder = parts.slice(0, i + 1).join('/')
        if (!node[folder]) node[folder] = { _folder: true, _name: parts[i], _path: folder, _children: {} }
        node = node[folder]._children
      }
      node[f.path] = f
    })
    return root
  }, [files])

  const toggleFolder = (key) => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const renderNode = (node, depth = 0) => {
    const entries = Object.entries(node).sort(([, a], [, b]) => {
      // Files before folders; within files, _ prefix comes first
      if (!a._folder && b._folder) return -1
      if (a._folder && !b._folder) return 1
      return 0
    })
    return entries.map(([key, val]) => {
      if (val._folder) {
        const isOpen = openFolders.has(key)
        const defaultType = FOLDER_DEFAULT_TYPE[key]
        const childCount = Object.keys(val._children).length
        return (
          <div key={key} className="tree-folder">
            <div
              className={`tree-folder-label ${isOpen ? 'open' : ''}`}
              style={{ paddingLeft: depth * 12 + 8 }}
            >
              <span className="tree-folder-toggle" onClick={() => toggleFolder(key)}>
                {Icons.chevron}
              </span>
              <span className="tree-folder-icon" onClick={() => toggleFolder(key)}>{Icons.folder}</span>
              <span className="tree-folder-name" onClick={() => toggleFolder(key)}>
                {val._name}
                {childCount === 0 && <span className="tree-folder-empty-hint"> (empty)</span>}
              </span>
              {onAddToFolder && (
                <button
                  className="btn sm tree-folder-add"
                  title={`Add ${defaultType || 'file'}`}
                  onClick={(e) => { e.stopPropagation(); onAddToFolder(key, defaultType || 'general') }}
                >
                  {Icons.plus}
                </button>
              )}
            </div>
            {isOpen && (
              <div className="tree-children">{renderNode(val._children, depth + 1)}</div>
            )}
          </div>
        )
      }

      const parsed = parseFrontmatter(val.content)
      const { sections } = extractSections(parsed.body)
      const hasEmpty = sections.some((s) => isSectionEmpty(s.content))
      const hasRefs = extractReferences(val.content).length > 0
      const fname = val.path.split('/').pop()
      const fileType = parsed.frontmatter.type
      const sym = TYPE_SYMBOL[fileType]

      return (
        <div
          key={key}
          className={`tree-item ${activeFile === val.path ? 'active' : ''}`}
          onClick={() => onSelect(val.path)}
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          {sym
            ? <span className={`tree-type-sym ${sym.cls}`}>{sym.char}</span>
            : Icons.file
          }
          <span style={{ flex: 1 }}>{fname}</span>
          {hasEmpty && <span className="badge empty" title="Has empty sections" />}
          {hasRefs && <span className="badge refs" title="Has references" />}
        </div>
      )
    })
  }

  return <div className="file-tree">{renderNode(tree)}</div>
}
