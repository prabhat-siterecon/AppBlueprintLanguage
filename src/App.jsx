import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BLUEPRINT_SCHEMA, DEFAULT_BLUEPRINT_FILES } from './data/schema';
import { parseFrontmatter, serializeFrontmatter, extractSections, isSectionEmpty, extractYamlFromSection } from './utils/parser';
import { parseEnums } from './components/DataModelEditor';
import { Icons } from './components/Icons';
import FileTree from './components/FileTree';
import FrontmatterEditor from './components/FrontmatterEditor';
import SectionEditor from './components/SectionEditor';
import ReferencePanel from './components/ReferencePanel';
import GraphView from './components/GraphView';
import DocumentViewer from './components/DocumentViewer';
import AddFileModal from './components/AddFileModal';
import Toast from './components/Toast';
import SamplePanel from './components/SamplePanel';
import GettingStarted from './components/GettingStarted';

export default function App() {
  const [files, setFiles] = useState(() => {
    try {
      const saved = localStorage.getItem('abl_editor_files');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_BLUEPRINT_FILES;
  });
  const [activeFile, setActiveFile] = useState(null);
  const [viewMode, setViewMode] = useState('edit');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalPreset, setAddModalPreset] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSectionKey, setActiveSectionKey] = useState(null);
  const fileInputRef = useRef(null);
  const dirInputRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('abl_editor_files', JSON.stringify(files)); } catch {}
  }, [files]);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);
  const currentFile = files.find((f) => f.path === activeFile);
  const parsed = currentFile ? parseFrontmatter(currentFile.content) : null;

  const updateFile = useCallback((path, content) => {
    setFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content } : f)));
  }, []);

  const addFile = useCallback((path, content) => {
    setFiles((prev) => [...prev, { path, content }]);
    setActiveFile(path);
    showToast('File created');
  }, [showToast]);

  const deleteFile = useCallback((path) => {
    setFiles((prev) => prev.filter((f) => f.path !== path));
    if (activeFile === path) setActiveFile(null);
    showToast('File deleted');
  }, [activeFile, showToast]);

  const updateFrontmatter = useCallback((newFm) => {
    if (!currentFile) return;
    const { body } = parseFrontmatter(currentFile.content);
    updateFile(currentFile.path, serializeFrontmatter(newFm) + '\n\n' + body);
  }, [currentFile, updateFile]);

  const updateSection = useCallback((sectionIdx, newContent) => {
    if (!currentFile) return;
    const { frontmatter, body } = parseFrontmatter(currentFile.content);
    const { description, sections } = extractSections(body);
    sections[sectionIdx] = { ...sections[sectionIdx], content: newContent };
    const titleMatch = body.match(/^#\s+.*/m);
    const title = titleMatch ? titleMatch[0] : '';
    let newBody = title + '\n\n' + (description ? description + '\n\n' : '');
    sections.forEach((s) => { newBody += '## ' + s.heading + '\n\n' + s.content + '\n\n'; });
    updateFile(currentFile.path, serializeFrontmatter(frontmatter) + '\n\n' + newBody.trim());
  }, [currentFile, updateFile]);

  const updateDescription = useCallback((newDesc) => {
    if (!currentFile) return;
    const { frontmatter, body } = parseFrontmatter(currentFile.content);
    const titleMatch = body.match(/^#\s+.*/m);
    const title = titleMatch ? titleMatch[0] : '';
    const { sections } = extractSections(body);
    let newBody = title + '\n\n' + newDesc + '\n\n';
    sections.forEach((s) => { newBody += '## ' + s.heading + '\n\n' + s.content + '\n\n'; });
    updateFile(currentFile.path, serializeFrontmatter(frontmatter) + '\n\n' + newBody.trim());
  }, [currentFile, updateFile]);

  const addSection = useCallback((name) => {
    if (!currentFile || !name) return;
    const key = name.toLowerCase().replace(/\s+/g, '_');
    updateFile(currentFile.path, currentFile.content + '\n\n## ' + name + '\n\n```yaml\n' + key + ': {}\n```');
    showToast('Added section: ' + name);
  }, [currentFile, updateFile, showToast]);

  const handleFolderImport = useCallback((e) => {
    const allFiles = Array.from(e.target.files).filter(f => f.name.endsWith('.md'));
    e.target.value = '';
    if (!allFiles.length) { showToast('No .md files found in folder'); return; }
    if (!confirm(`Replace current blueprint with ${allFiles.length} imported file(s)?`)) return;
    const results = [];
    let done = 0;
    allFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        let path = file.webkitRelativePath || file.name;
        const bpIdx = path.indexOf('blueprint/');
        path = bpIdx >= 0 ? path.slice(bpIdx) : 'blueprint/' + path.split('/').slice(1).join('/');
        results.push({ path, content: ev.target.result });
        done++;
        if (done === allFiles.length) {
          results.sort((a, b) => a.path.localeCompare(b.path));
          setFiles(results);
          setActiveFile(null);
          showToast(`Imported ${results.length} files`);
        }
      };
      reader.readAsText(file);
    });
  }, [showToast]);

  const handleImport = useCallback((e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target.result;
        const path = 'blueprint/' + file.name;
        if (files.some((f) => f.path === path)) { updateFile(path, content); showToast('Updated: ' + file.name); }
        else { addFile(path, content); }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  }, [files, addFile, updateFile, showToast]);

  const handleExportZip = useCallback(async () => {
    const zip = new JSZip();
    files.forEach((f) => { zip.file(f.path, f.content); });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'blueprint.zip');
    showToast('Blueprint exported as ZIP');
  }, [files, showToast]);

  const handleDownloadFile = useCallback(() => {
    if (!currentFile) return;
    saveAs(new Blob([currentFile.content], { type: 'text/markdown' }), currentFile.path.split('/').pop());
    showToast('File downloaded');
  }, [currentFile, showToast]);

  const emptySummary = useMemo(() => {
    let count = 0;
    files.forEach((f) => {
      const { body } = parseFrontmatter(f.content);
      extractSections(body).sections.forEach((s) => { if (isSectionEmpty(s.content)) count++; });
    });
    return count;
  }, [files]);

  const schema = parsed ? BLUEPRINT_SCHEMA[parsed.frontmatter.type] || BLUEPRINT_SCHEMA.general : null;
  const activeFieldTypes = activeSectionKey && schema?.fieldTypes?.[activeSectionKey];

  const refOptions = useMemo(() => {
    const map = {};
    files.forEach((f) => {
      const { frontmatter } = parseFrontmatter(f.content);
      if (frontmatter.type && frontmatter.id) {
        if (!map[frontmatter.type]) map[frontmatter.type] = [];
        map[frontmatter.type].push(frontmatter.id);
      }
    });
    return map;
  }, [files]);

  const appName = useMemo(() => {
    const appFile = files.find(f => {
      const { frontmatter } = parseFrontmatter(f.content);
      return frontmatter.type === 'config' && (frontmatter.id === 'app_config' || f.path.endsWith('_app.md'));
    });
    if (!appFile) return null;
    const { body } = parseFrontmatter(appFile.content);
    const { sections } = extractSections(body);
    const appSec = sections.find(s => s.heading.toLowerCase() === 'app');
    if (!appSec) return null;
    const yaml = extractYamlFromSection(appSec.content);
    if (!yaml) return null;
    const m = yaml.match(/^\s*name:\s*"?([^"\n]+?)"?\s*$/m);
    const name = m?.[1]?.trim();
    return name && name !== '""' ? name : null;
  }, [files]);

  const { allEnums, allModels } = useMemo(() => {
    const enums = []
    const models = []
    files.forEach((f) => {
      const { frontmatter, body } = parseFrontmatter(f.content)
      if (frontmatter.type !== 'datamodel') return
      const { sections: secs } = extractSections(body)
      secs.forEach((s) => {
        const key = s.heading.toLowerCase().replace(/\s+/g, '_')
        const yaml = extractYamlFromSection(s.content)
        if (!yaml) return
        if (key === 'enums') {
          try { enums.push(...parseEnums(yaml)) } catch {}
        } else if (key === 'models') {
          // Extract model ids for TypeSelector
          const re = /^  - id:\s*"?([^"\n]+)"?/gm
          let m
          while ((m = re.exec(yaml)) !== null) models.push({ id: m[1].trim() })
        }
      })
    })
    return { allEnums: enums, allModels: models }
  }, [files]);

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1><span>{"\u25C6"}</span> ABL Editor</h1>
          {appName && <div className="sidebar-app-name">{appName}</div>}
          <div className="sidebar-stats">
            <span>{files.length} files</span>
            <span>{"\u00B7"}</span>
            <span style={{ color: emptySummary > 0 ? 'var(--yellow)' : 'var(--green)' }}>{emptySummary} empty sections</span>
          </div>
          <div className="sidebar-actions">
            <button className="btn" onClick={() => setShowAddModal(true)}>{Icons.plus} New</button>
            <button className="btn" onClick={() => fileInputRef.current?.click()}>{Icons.upload} Import</button>
            <input ref={fileInputRef} type="file" accept=".md" multiple style={{ display: 'none' }} onChange={handleImport} />
            <input ref={dirInputRef} type="file" webkitdirectory="" style={{ display: 'none' }} onChange={handleFolderImport} />
          </div>
          <button className="btn open-blueprint-btn" onClick={() => dirInputRef.current?.click()}>{Icons.folder} Open Blueprint Folder</button>
          <button className="btn guide-open-btn" onClick={() => setShowGuide(true)}>? Getting Started</button>
        </div>
        <FileTree files={files} activeFile={activeFile} onSelect={(p) => { setActiveFile(p); setViewMode('edit'); setActiveSectionKey(null); }} onAddToFolder={(folder, type) => { setAddModalPreset({ folder, type }); setShowAddModal(true); }} />
        <div className="sidebar-footer">
          <button className="btn" style={{ width: '100%' }} onClick={handleExportZip}>{Icons.download} Export ZIP</button>
        </div>
      </div>
      <div className="main">
        <div className="main-header">
          <div>{activeFile ? <span className="path">{activeFile}</span> : <span className="path" style={{ color: 'var(--text-muted)' }}>No file selected</span>}</div>
          <div className="tabs">
            <button className={'tab' + (viewMode === 'edit' ? ' active' : '')} onClick={() => setViewMode('edit')}>{Icons.edit} Edit</button>
            <button className={'tab' + (viewMode === 'view' ? ' active' : '')} onClick={() => setViewMode('view')}>{Icons.eye} View</button>
            <button className={'tab' + (viewMode === 'graph' ? ' active' : '')} onClick={() => setViewMode('graph')}>{Icons.graph} Graph</button>
          </div>
          <div className="actions">
            {currentFile && (<>
              <button className="btn sm" onClick={handleDownloadFile}>{Icons.download}</button>
              <button className="btn sm danger" onClick={() => { if (confirm('Delete this file?')) deleteFile(activeFile); }}>{Icons.trash}</button>
            </>)}
          </div>
        </div>
        <div className="main-body">
          {viewMode === 'graph' ? (
            <GraphView files={files} onSelect={(p) => { setActiveFile(p); setViewMode('edit'); }} />
          ) : !currentFile ? (
            <div className="editor-col">
              <div className="welcome">
                <div style={{ fontSize: 40, opacity: 0.3 }}>{"\u25C6"}</div>
                <h2>App Blueprint Editor</h2>
                <p>Select a file from the sidebar to begin editing, or create a new blueprint file.</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn primary" onClick={() => setShowAddModal(true)}>{Icons.plus} New File</button>
                  <button className="btn" onClick={() => setViewMode('graph')}>{Icons.graph} View Graph</button>
                </div>
              </div>
            </div>
          ) : viewMode === 'view' ? (
            <div className="editor-col">
              <DocumentViewer file={currentFile} />
            </div>
          ) : (<>
            <div className="editor-col">
              <ReferencePanel file={currentFile} files={files} onNavigate={(p) => setActiveFile(p)} />
              <FrontmatterEditor frontmatter={parsed.frontmatter} onChange={updateFrontmatter} refOptions={refOptions} />
              <div className="editor-section" style={{ marginBottom: 24 }}>
                <div className="section-header"><h3>Description</h3></div>
                <div className="section-body">
                  <textarea className="desc-editor" value={extractSections(parsed.body).description || ''} onChange={(e) => updateDescription(e.target.value)} placeholder="Describe what this blueprint defines..." />
                </div>
              </div>
              {(() => {
                const { sections: docSections } = extractSections(parsed.body);
                const docType = parsed.frontmatter.type;
                return docSections.map((s, i) => {
                  const sk = s.heading.toLowerCase().replace(/\s+/g, '_');
                  return (
                    <SectionEditor
                      key={activeFile + '-' + i}
                      heading={s.heading}
                      content={s.content}
                      onChange={(c) => updateSection(i, c)}
                      schema={schema}
                      isActive={activeSectionKey === sk}
                      onActivate={() => setActiveSectionKey(sk)}
                      refOptions={refOptions}
                      docType={docType}
                      docSections={docSections}
                      allEnums={allEnums}
                      allModels={allModels}
                    />
                  );
                });
              })()}
              <button className="btn add-section-btn" onClick={() => { const name = prompt('Section name:'); if (name) addSection(name); }}>{Icons.plus} Add Section</button>
            </div>
            <SamplePanel sectionKey={activeSectionKey} fieldTypes={activeFieldTypes} />
          </>)}
        </div>
      </div>
      {showAddModal && <AddFileModal onAdd={addFile} onClose={() => { setShowAddModal(false); setAddModalPreset(null); }} existingPaths={files.map((f) => f.path)} initialFolder={addModalPreset?.folder} initialType={addModalPreset?.type} />}
      {showGuide && <GettingStarted onClose={() => setShowGuide(false)} />}
      <Toast message={toast} />
    </div>
  );
}
