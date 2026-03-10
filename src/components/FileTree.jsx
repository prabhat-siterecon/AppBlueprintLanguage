import React, { useState, useMemo, useEffect, useRef } from 'react'
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

const STATUS_LETTER = {
  draft:         'd',
  approved:      'A',
  implementing:  '~',
  implemented:   '✓',
  deprecated:    '✗',
}

const STATUS_CLS = {
  draft:         'sl-draft',
  approved:      'sl-approved',
  implementing:  'sl-implementing',
  implemented:   'sl-implemented',
  deprecated:    'sl-deprecated',
}

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

// Deterministic color per tag string
const TAG_PALETTE = ['#4F6BED','#34D399','#FBBF24','#F87171','#A78BFA','#FB923C','#60A5FA','#F472B6']
function tagColor(tag) {
  let h = 0
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xfffffff
  return TAG_PALETTE[h % TAG_PALETTE.length]
}

// ── Tag chip ──────────────────────────────────────────────────────────────────
function TagChip({ tag, onRemove, onClick, active }) {
  const color = tagColor(tag)
  return (
    <span
      className={`tag-chip${active ? ' tag-chip-active' : ''}`}
      style={{ '--tag-color': color }}
      onClick={onClick}
    >
      {tag}
      {onRemove && (
        <span
          className="tag-chip-x"
          onClick={e => { e.stopPropagation(); onRemove() }}
        >×</span>
      )}
    </span>
  )
}

// ── Tag editor popover ────────────────────────────────────────────────────────
function TagEditor({ path, tags, allTags, onAdd, onRemove, onClose }) {
  const [input, setInput] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [onClose])

  const suggestions = allTags.filter(t => !tags.includes(t) && t.includes(input.toLowerCase()))

  const submit = () => {
    if (input.trim()) { onAdd(input.trim()); setInput('') }
  }

  return (
    <div ref={ref} className="tag-editor-pop" onClick={e => e.stopPropagation()}>
      <div className="tag-editor-current">
        {tags.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No tags</span>}
        {tags.map(t => <TagChip key={t} tag={t} onRemove={() => onRemove(t)} />)}
      </div>
      <div className="tag-editor-input-row">
        <input
          ref={inputRef}
          className="tag-editor-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder="add module tag…"
        />
        <button className="btn sm" onClick={submit}>+</button>
      </div>
      {suggestions.length > 0 && (
        <div className="tag-editor-suggestions">
          {suggestions.map(t => (
            <button key={t} className="tag-suggestion-btn" onClick={() => { onAdd(t); setInput('') }}>
              <TagChip tag={t} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MoveMenu ──────────────────────────────────────────────────────────────────
function MoveMenu({ currentFolder, onMove, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [onClose])
  return (
    <div ref={ref} className="move-menu" onClick={e => e.stopPropagation()}>
      <div className="context-menu-label">Move to</div>
      {VIRTUAL_FOLDERS.map(f => (
        <button
          key={f.path}
          className={`context-menu-item${f.path === currentFolder ? ' active' : ''}`}
          onClick={() => { onMove(f.path); onClose() }}
        >
          {f.path === currentFolder && <span className="context-menu-check">✓</span>}
          {f.name}
        </button>
      ))}
    </div>
  )
}

// ── FileItem ──────────────────────────────────────────────────────────────────
function FileItem({ file, depth, isActive, onSelect, onContextMenu, onDuplicate, onMove, tags, allTags, onAddTag, onRemoveTag, showPath, selectable, selected, onToggleSelect }) {
  const [showTagEditor, setShowTagEditor] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  const parsed = useMemo(() => parseFrontmatter(file.content), [file.content])
  const { sections } = useMemo(() => extractSections(parsed.body), [parsed.body])
  const hasEmpty = sections.some(s => isSectionEmpty(s.content))
  const hasRefs = extractReferences(file.content).length > 0
  const fname = file.path.split('/').pop()
  const fileType = parsed.frontmatter.type
  const fileStatus = parsed.frontmatter.status
  const sym = TYPE_SYMBOL[fileType]
  const statusLetter = STATUS_LETTER[fileStatus]
  const statusCls = STATUS_CLS[fileStatus]
  const currentFolder = file.path.split('/').slice(0, -1).join('/')

  return (
    <div
      className={`tree-item ${isActive && !selectable ? 'active' : ''} ${selectable ? 'tree-item-selectable' : ''} ${selected ? 'tree-item-selected' : ''}`}
      onClick={() => selectable ? onToggleSelect(file.path) : onSelect(file.path)}
      onContextMenu={selectable ? undefined : onContextMenu}
      style={depth !== undefined ? { paddingLeft: depth * 12 + 8 } : {}}
    >
      {selectable
        ? <span className={`tree-select-cb${selected ? ' checked' : ''}`}>{selected ? '☑' : '☐'}</span>
        : sym ? <span className={`tree-type-sym ${sym.cls}`}>{sym.char}</span> : Icons.file
      }
      <span className="tree-item-name">
        {fname}
        {showPath && <span className="tree-item-path">{file.path.split('/').slice(0, -1).join('/')}/</span>}
      </span>
      {tags.length > 0 && (
        <span className="tree-item-tags">
          <TagChip tag={tags[0]} />
          {tags.length > 1 && <span className="tag-overflow">+{tags.length - 1}</span>}
        </span>
      )}
      <span className="tree-item-end">
        <span className="tree-item-actions">
          {onDuplicate && (
            <button className="btn sm tree-action-btn" title="Duplicate as draft"
              onClick={e => { e.stopPropagation(); onDuplicate(file.path) }}>
              {Icons.duplicate}
            </button>
          )}
          {onMove && (
            <button className={`btn sm tree-action-btn${showMoveMenu ? ' active' : ''}`} title="Move to folder"
              onClick={e => { e.stopPropagation(); setShowMoveMenu(v => !v) }}>
              {Icons.folder}
            </button>
          )}
        </span>
        <button
          className={`btn sm tree-tag-btn${tags.length > 0 ? ' has-tags' : ''}`}
          title="Manage module tags"
          onClick={e => { e.stopPropagation(); setShowTagEditor(v => !v) }}
        >🏷</button>
        {statusLetter && <span className={`tree-status-letter ${statusCls}`} title={fileStatus}>{statusLetter}</span>}
        {hasEmpty && <span className="badge empty" title="Has empty sections" />}
        {hasRefs && <span className="badge refs" title="Has references" />}
      </span>
      {showTagEditor && (
        <TagEditor
          path={file.path}
          tags={tags}
          allTags={allTags}
          onAdd={tag => onAddTag(file.path, tag)}
          onRemove={tag => onRemoveTag(file.path, tag)}
          onClose={() => setShowTagEditor(false)}
        />
      )}
      {showMoveMenu && (
        <MoveMenu
          currentFolder={currentFolder}
          onMove={folder => onMove(file.path, folder)}
          onClose={() => setShowMoveMenu(false)}
        />
      )}
    </div>
  )
}

// ── FileTree ──────────────────────────────────────────────────────────────────
export default function FileTree({ files, activeFile, onSelect, onAddToFolder, onMoveFile, onDuplicate, fileTags = {}, onAddTag, onRemoveTag, onExportSelected }) {
  const [openFolders, setOpenFolders] = useState(new Set(VIRTUAL_FOLDERS.map(f => f.path)))
  const [openTagGroups, setOpenTagGroups] = useState(new Set())
  const [contextMenu, setContextMenu] = useState(null)
  const [search, setSearch] = useState('')
  const [groupByTag, setGroupByTag] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState(new Set())
  const menuRef = useRef(null)
  const searchRef = useRef(null)

  const toggleSelectMode = () => {
    setSelectMode(v => !v)
    setSelectedPaths(new Set())
  }
  const toggleSelect = (path) => setSelectedPaths(prev => {
    const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n
  })
  const selectAll = () => setSelectedPaths(new Set(docFiles.map(f => f.path)))
  const clearSelection = () => setSelectedPaths(new Set())

  useEffect(() => {
    if (!contextMenu) return
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setContextMenu(null) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [contextMenu])

  // Only show .md doc files in the tree (images/code files are managed via AssetsPanel)
  const docFiles = useMemo(() => files.filter(f => f.path.endsWith('.md')), [files])

  // All unique tags across all files
  const allTags = useMemo(() => {
    const set = new Set()
    Object.values(fileTags).forEach(tags => tags.forEach(t => set.add(t)))
    return [...set].sort()
  }, [fileTags])

  const toggleTagGroup = (key) => setOpenTagGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const isFiltering = search.trim() !== ''

  // Flat filtered file list (used when search active)
  const filteredFiles = useMemo(() => {
    if (!isFiltering) return []
    const q = search.toLowerCase().trim()
    return docFiles.filter(f => {
      const { frontmatter } = parseFrontmatter(f.content)
      const fname = f.path.split('/').pop().toLowerCase()
      const tags = fileTags[f.path] || []
      return !q ||
        fname.includes(q) ||
        (frontmatter.id || '').toLowerCase().includes(q) ||
        (frontmatter.type || '').toLowerCase().includes(q) ||
        tags.some(t => t.includes(q))
    })
  }, [docFiles, search, fileTags, isFiltering])

  // Tree rendering (only .md doc files)
  const tree = useMemo(() => {
    const root = {}
    VIRTUAL_FOLDERS.forEach(vf => {
      const parts = vf.path.split('/')
      let node = root
      for (let i = 0; i < parts.length; i++) {
        const folderPath = parts.slice(0, i + 1).join('/')
        if (!node[folderPath]) node[folderPath] = { _folder: true, _name: parts[i], _path: folderPath, _children: {} }
        if (i < parts.length - 1) node = node[folderPath]._children
      }
    })
    docFiles.forEach(f => {
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
  }, [docFiles])

  const toggleFolder = (key) => setOpenFolders(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const countFiles = (node) => {
    let n = 0
    Object.values(node).forEach(v => { n += v._folder ? countFiles(v._children) : 1 })
    return n
  }

  const fileItemProps = (f, depth, showPath) => ({
    file: f,
    depth,
    showPath,
    isActive: activeFile === f.path,
    onSelect,
    onContextMenu: (!selectMode && onMoveFile) ? (e) => { e.preventDefault(); setContextMenu({ path: f.path, currentFolder: f.path.split('/').slice(0, -1).join('/'), x: e.clientX, y: e.clientY }) } : undefined,
    onDuplicate: selectMode ? undefined : (onDuplicate || undefined),
    onMove: selectMode ? undefined : (onMoveFile || undefined),
    tags: fileTags[f.path] || [],
    allTags,
    onAddTag: selectMode ? undefined : onAddTag,
    onRemoveTag: selectMode ? undefined : onRemoveTag,
    selectable: selectMode,
    selected: selectedPaths.has(f.path),
    onToggleSelect: toggleSelect,
  })

  const renderNode = (node, depth = 0) => {
    const allEntries = Object.entries(node)
    const folderEntries = allEntries.filter(([, v]) => v._folder)
    const fileEntries   = allEntries.filter(([, v]) => !v._folder)

    const folderNodes = folderEntries.map(([key, val]) => {
      const isOpen = openFolders.has(key)
      const defaultType = FOLDER_DEFAULT_TYPE[key]
      const fileCount = countFiles(val._children)
      return (
        <div key={key} className="tree-folder">
          <div className={`tree-folder-label ${isOpen ? 'open' : ''}`} style={{ paddingLeft: depth * 12 + 8 }}>
            <span className="tree-folder-toggle" onClick={() => toggleFolder(key)}>{Icons.chevron}</span>
            <span className="tree-folder-icon" onClick={() => toggleFolder(key)}>{Icons.folder}</span>
            <span className="tree-folder-name" onClick={() => toggleFolder(key)}>{val._name}</span>
            <span className={`tree-folder-count${fileCount === 0 ? ' tree-folder-count-empty' : ''}`}>{fileCount}</span>
            {onAddToFolder && (
              <button className="btn sm tree-folder-add" title={`Add ${defaultType || 'file'}`} onClick={e => { e.stopPropagation(); onAddToFolder(key, defaultType || 'general') }}>
                {Icons.plus}
              </button>
            )}
          </div>
          {isOpen && <div className="tree-children">{renderNode(val._children, depth + 1)}</div>}
        </div>
      )
    })

    let fileNodes
    if (groupByTag && fileEntries.length > 0) {
      const tagGroups = {}
      const untaggedFiles = []
      fileEntries.forEach(([key, file]) => {
        const tags = fileTags[file.path] || []
        if (tags.length === 0) {
          untaggedFiles.push([key, file])
        } else {
          tags.forEach(tag => {
            if (!tagGroups[tag]) tagGroups[tag] = []
            tagGroups[tag].push([key, file])
          })
        }
      })
      const folderKey = fileEntries[0][1].path.split('/').slice(0, -1).join('/')
      const tagGroupNodes = Object.entries(tagGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tag, tagFiles]) => {
          const groupKey = `${folderKey}:${tag}`
          const isOpen = openTagGroups.has(groupKey)
          const color = tagColor(tag)
          return (
            <div key={groupKey} className="tree-folder">
              <div className={`tree-folder-label tree-tag-group-label ${isOpen ? 'open' : ''}`} style={{ paddingLeft: depth * 12 + 8 }}>
                <span className="tree-folder-toggle" onClick={() => toggleTagGroup(groupKey)}>{Icons.chevron}</span>
                <span className="tree-tag-group-dot" style={{ background: color }} />
                <span className="tree-folder-name tree-tag-group-name" onClick={() => toggleTagGroup(groupKey)}>{tag}</span>
                <span className={`tree-folder-count${tagFiles.length === 0 ? ' tree-folder-count-empty' : ''}`}>{tagFiles.length}</span>
              </div>
              {isOpen && (
                <div className="tree-children">
                  {tagFiles.map(([k, f]) => <FileItem key={k} {...fileItemProps(f, depth + 1, false)} />)}
                </div>
              )}
            </div>
          )
        })
      const untaggedNodes = untaggedFiles.map(([k, f]) => <FileItem key={k} {...fileItemProps(f, depth, false)} />)
      fileNodes = [...tagGroupNodes, ...untaggedNodes]
    } else {
      fileNodes = fileEntries.map(([key, val]) => <FileItem key={key} {...fileItemProps(val, depth, false)} />)
    }

    // files / tag-groups before sub-folders (original sort order)
    return [...fileNodes, ...folderNodes]
  }

  return (
    <>
      {/* Search + group toggle + select toggle */}
      <div className="tree-search-bar">
        <div className="tree-search-input-wrap">
          <span className="tree-search-icon">⌕</span>
          <input
            ref={searchRef}
            className="tree-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files or #tag…"
          />
          {search && <button className="tree-search-clear" onClick={() => setSearch('')}>×</button>}
        </div>
        {allTags.length > 0 && !selectMode && (
          <button
            className={`btn sm tree-group-toggle${groupByTag ? ' active' : ''}`}
            title={groupByTag ? 'Ungroup by tag' : 'Group by tag'}
            onClick={() => setGroupByTag(v => !v)}
          >#</button>
        )}
        <button
          className={`btn sm tree-group-toggle${selectMode ? ' active' : ''}`}
          title={selectMode ? 'Exit select mode' : 'Select files to export'}
          onClick={toggleSelectMode}
        >{Icons.select}</button>
      </div>

      {/* Select-mode action bar */}
      {selectMode && (
        <div className="select-action-bar">
          <span className="select-action-count">
            {selectedPaths.size > 0 ? `${selectedPaths.size} selected` : 'Select files'}
          </span>
          <button className="btn sm" onClick={selectedPaths.size === docFiles.length ? clearSelection : selectAll}>
            {selectedPaths.size === docFiles.length ? 'None' : 'All'}
          </button>
          {selectedPaths.size > 0 && (
            <button
              className="btn sm select-export-btn"
              onClick={() => { onExportSelected([...selectedPaths]); toggleSelectMode() }}
              title="Export selected as single markdown doc"
            >
              {Icons.export} Export
            </button>
          )}
        </div>
      )}

      {/* File list */}
      <div className="file-tree">
        {isFiltering ? (
          filteredFiles.length === 0
            ? <div className="tree-empty">No files match</div>
            : filteredFiles.map(f => <FileItem key={f.path} {...fileItemProps(f, 0, true)} />)
        ) : (
          renderNode(tree)
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div ref={menuRef} className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {onDuplicate && (<>
            <div className="context-menu-label">Actions</div>
            <button className="context-menu-item" onClick={() => { onDuplicate(contextMenu.path); setContextMenu(null) }}>Duplicate as Draft</button>
            <div className="context-menu-divider" />
          </>)}
          <div className="context-menu-label">Move to folder</div>
          {VIRTUAL_FOLDERS.map(f => (
            <button key={f.path} className={`context-menu-item${f.path === contextMenu.currentFolder ? ' active' : ''}`}
              onClick={() => { onMoveFile(contextMenu.path, f.path); setContextMenu(null) }}>
              {f.path === contextMenu.currentFolder && <span className="context-menu-check">✓</span>}
              {f.name}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
