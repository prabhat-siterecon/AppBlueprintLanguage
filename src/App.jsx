import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { BLUEPRINT_SCHEMA, DEFAULT_BLUEPRINT_FILES } from './data/schema';
import { parseFrontmatter, serializeFrontmatter, extractSections, isSectionEmpty, extractYamlFromSection } from './utils/parser';
import { fetchBlueprintTree, fetchFileContent, upsertFile } from './utils/github';
import { parseEnums } from './components/DataModelEditor';
import { Icons } from './components/Icons';
import GitHubModal, { GHIcon, relTime } from './components/GitHubModal';
import FileTree from './components/FileTree';
import FrontmatterEditor from './components/FrontmatterEditor';
import SectionEditor from './components/SectionEditor';
import GraphView from './components/GraphView';
import DocumentViewer from './components/DocumentViewer';
import AddFileModal from './components/AddFileModal';
import Toast from './components/Toast';
import RefSidePanel from './components/RefSidePanel';
import GettingStarted from './components/GettingStarted';
import AssetsPanel from './components/AssetsPanel';

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
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [expandSignal, setExpandSignal] = useState(0);
  const [showGitHub, setShowGitHub] = useState(false);
  const [githubConfig, setGithubConfig] = useState(() => {
    try { const s = localStorage.getItem('abl_github_config'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const fileInputRef = useRef(null);
  const dirInputRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('abl_editor_files', JSON.stringify(files)); } catch {}
  }, [files]);

  useEffect(() => {
    try {
      if (githubConfig) localStorage.setItem('abl_github_config', JSON.stringify(githubConfig));
      else localStorage.removeItem('abl_github_config');
    } catch {}
  }, [githubConfig]);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);
  const currentFile = files.find((f) => f.path === activeFile);
  const parsed = currentFile ? parseFrontmatter(currentFile.content) : null;

  const updateFile = useCallback((path, content) => {
    setFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content } : f)));
  }, []);

  // Tags derived from file frontmatter (field: "module")
  const fileTags = useMemo(() => {
    const map = {};
    files.forEach(f => {
      const { frontmatter } = parseFrontmatter(f.content);
      const tags = (frontmatter.module || '').split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length) map[f.path] = tags;
    });
    return map;
  }, [files]);

  const addTag = useCallback((path, tag) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!t) return;
    const file = files.find(f => f.path === path);
    if (!file) return;
    const { frontmatter, body } = parseFrontmatter(file.content);
    const existing = (frontmatter.module || '').split(',').map(s => s.trim()).filter(Boolean);
    if (existing.includes(t)) return;
    updateFile(path, serializeFrontmatter({ ...frontmatter, module: [...existing, t].join(', ') }) + '\n\n' + body);
  }, [files, updateFile]);

  const removeTag = useCallback((path, tag) => {
    const file = files.find(f => f.path === path);
    if (!file) return;
    const { frontmatter, body } = parseFrontmatter(file.content);
    const existing = (frontmatter.module || '').split(',').map(s => s.trim()).filter(Boolean);
    const next = existing.filter(t => t !== tag);
    const updated = { ...frontmatter };
    if (next.length) updated.module = next.join(', '); else delete updated.module;
    updateFile(path, serializeFrontmatter(updated) + '\n\n' + body);
  }, [files, updateFile]);

  const addFile = useCallback((path, content) => {
    setFiles((prev) => [...prev, { path, content }]);
    setActiveFile(path);
    showToast('File created');
  }, [showToast]);

  // Add an asset/code file without navigating away from current doc
  const addAsset = useCallback((path, content) => {
    setFiles(prev => prev.some(f => f.path === path) ? prev : [...prev, { path, content }]);
  }, []);

  const deleteFile = useCallback((path) => {
    setFiles((prev) => prev.filter((f) => f.path !== path));
    if (activeFile === path) setActiveFile(null);
    showToast('File deleted');
  }, [activeFile, showToast]);

  const duplicateFile = useCallback((path) => {
    const srcFile = files.find((f) => f.path === path);
    if (!srcFile) return;
    const folder = path.split('/').slice(0, -1).join('/');
    const fname = path.split('/').pop();
    const dotIdx = fname.lastIndexOf('.');
    const base = dotIdx >= 0 ? fname.slice(0, dotIdx) : fname;
    const ext = dotIdx >= 0 ? fname.slice(dotIdx) : '';
    let newPath;
    for (let v = 1; v <= 99; v++) {
      const candidate = folder + '/' + base + '-d-v' + v + ext;
      if (!files.some((f) => f.path === candidate)) { newPath = candidate; break; }
    }
    if (!newPath) { showToast('Could not create duplicate'); return; }
    const { frontmatter, body } = parseFrontmatter(srcFile.content);
    const newContent = serializeFrontmatter({ ...frontmatter, status: 'draft' }) + '\n\n' + body;
    addFile(newPath, newContent);
    showToast('Duplicate created as draft');
  }, [files, addFile, showToast]);

  const moveFile = useCallback((oldPath, newFolderPath) => {
    const fileName = oldPath.split('/').pop();
    const newPath = newFolderPath + '/' + fileName;
    if (oldPath === newPath) return;
    if (files.some((f) => f.path === newPath)) { showToast('A file with that name already exists there'); return; }
    setFiles((prev) => prev.map((f) => f.path === oldPath ? { ...f, path: newPath } : f));
    if (activeFile === oldPath) setActiveFile(newPath);
    showToast('File moved');
  }, [files, activeFile, showToast]);

  const updateFrontmatter = useCallback((newFm) => {
    if (!currentFile) return;
    const { frontmatter: oldFm, body } = parseFrontmatter(currentFile.content);
    const newContent = serializeFrontmatter(newFm) + '\n\n' + body;
    const basename = currentFile.path.split('/').pop();
    if (newFm.id && newFm.id !== oldFm.id && !basename.startsWith('_')) {
      const folder = currentFile.path.split('/').slice(0, -1).join('/');
      const newPath = folder + '/' + newFm.id + '.md';
      if (files.some(f => f.path === newPath)) {
        showToast('Cannot rename: a file with that name already exists');
        updateFile(currentFile.path, newContent);
      } else {
        setFiles(prev => prev.map(f => f.path === currentFile.path ? { path: newPath, content: newContent } : f));
        setActiveFile(newPath);
        showToast('Renamed to ' + newFm.id + '.md');
      }
      return;
    }
    updateFile(currentFile.path, newContent);
  }, [currentFile, files, updateFile, showToast]);

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

  const deleteSection = useCallback((sectionIdx) => {
    if (!currentFile) return;
    const { frontmatter, body } = parseFrontmatter(currentFile.content);
    const { description, sections } = extractSections(body);
    const next = sections.filter((_, i) => i !== sectionIdx);
    const titleMatch = body.match(/^#\s+.*/m);
    const title = titleMatch ? titleMatch[0] : '';
    let newBody = title + '\n\n' + (description ? description + '\n\n' : '');
    next.forEach((s) => { newBody += '## ' + s.heading + '\n\n' + s.content + '\n\n'; });
    updateFile(currentFile.path, serializeFrontmatter(frontmatter) + '\n\n' + newBody.trim());
    showToast('Section deleted');
  }, [currentFile, updateFile, showToast]);

  const renameSection = useCallback((sectionIdx, newName) => {
    if (!currentFile || !newName.trim()) return;
    const { frontmatter, body } = parseFrontmatter(currentFile.content);
    const { description, sections } = extractSections(body);
    sections[sectionIdx] = { ...sections[sectionIdx], heading: newName.trim() };
    const titleMatch = body.match(/^#\s+.*/m);
    const title = titleMatch ? titleMatch[0] : '';
    let newBody = title + '\n\n' + (description ? description + '\n\n' : '');
    sections.forEach((s) => { newBody += '## ' + s.heading + '\n\n' + s.content + '\n\n'; });
    updateFile(currentFile.path, serializeFrontmatter(frontmatter) + '\n\n' + newBody.trim());
  }, [currentFile, updateFile]);

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
    files.forEach((f) => {
      if (f.content && f.content.startsWith('data:')) {
        // Binary asset (image stored as data URI) — write as binary
        const b64 = f.content.split(',')[1];
        if (b64) zip.file(f.path, b64, { base64: true });
      } else {
        zip.file(f.path, f.content);
      }
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'blueprint.zip');
    showToast('Blueprint exported as ZIP');
  }, [files, showToast]);

  const handleGithubPull = useCallback(async () => {
    const { token, owner, repo, branch } = githubConfig;
    const tree = await fetchBlueprintTree(token, owner, repo, branch);
    if (!tree.length) throw new Error('No blueprint .md files found in this repository on branch ' + branch);
    // Fetch all files in parallel (batches of 6)
    const results = [];
    for (let i = 0; i < tree.length; i += 6) {
      const batch = tree.slice(i, i + 6);
      const contents = await Promise.all(batch.map(item => fetchFileContent(token, owner, repo, item.path, branch)));
      batch.forEach((item, j) => results.push({ path: item.path, content: contents[j].content }));
    }
    setFiles(results);
    setActiveFile(null);
    setGithubConfig(prev => ({ ...prev, lastPulled: new Date().toISOString() }));
    showToast(`Pulled ${results.length} files from GitHub`);
  }, [githubConfig, showToast]);

  const handleGithubPush = useCallback(async (onProgress) => {
    const { token, owner, repo, branch } = githubConfig;
    // Get existing SHAs so we can update rather than create
    const tree = await fetchBlueprintTree(token, owner, repo, branch).catch(() => []);
    const shaMap = {};
    tree.forEach(item => { shaMap[item.path] = item.sha; });
    const message = `Update blueprint from ABL Editor — ${new Date().toISOString().split('T')[0]}`;
    onProgress?.(0, files.length);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      await upsertFile(token, owner, repo, f.path, f.content, message, shaMap[f.path], branch);
      onProgress?.(i + 1, files.length);
    }
    setGithubConfig(prev => ({ ...prev, lastPushed: new Date().toISOString() }));
    showToast(`Pushed ${files.length} files to GitHub`);
  }, [githubConfig, files, showToast]);

  const handleDownloadFile = useCallback(() => {
    if (!currentFile) return;
    saveAs(new Blob([currentFile.content], { type: 'text/markdown' }), currentFile.path.split('/').pop());
    showToast('File downloaded');
  }, [currentFile, showToast]);

  const handleExportSelected = useCallback((paths) => {
    const selectedFiles = files.filter(f => paths.includes(f.path));
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const appTitle = (() => {
      const appFile = files.find(f => f.path.endsWith('_app.md'));
      if (appFile) {
        const m = appFile.content.match(/title:\s*["']?([^"'\n]+)["']?/);
        if (m) return m[1].trim();
      }
      return 'Blueprint';
    })();
    const lines = [
      `# ${appTitle} — Blueprint Export`,
      ``,
      `**Generated:** ${date}  `,
      `**Files:** ${selectedFiles.length}`,
      ``,
    ];
    selectedFiles.forEach(f => {
      lines.push(`\n---\n`);
      lines.push(`## ${f.path}\n`);
      lines.push(f.content);
    });
    const content = lines.join('\n');
    saveAs(new Blob([content], { type: 'text/markdown' }), 'blueprint-export.md');
    showToast(`Exported ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}`);
  }, [files, showToast]);

  const emptySummary = useMemo(() => {
    let count = 0;
    files.forEach((f) => {
      if (!f.path.endsWith('.md')) return;
      const { body } = parseFrontmatter(f.content);
      extractSections(body).sections.forEach((s) => { if (isSectionEmpty(s.content)) count++; });
    });
    return count;
  }, [files]);

  const mdFileCount = useMemo(() => files.filter(f => f.path.endsWith('.md')).length, [files]);

  const schema = parsed ? BLUEPRINT_SCHEMA[parsed.frontmatter.type] || BLUEPRINT_SCHEMA.general : null;
  const isReadOnly = !!(parsed?.frontmatter?.status && parsed.frontmatter.status !== 'draft');
  const activeFieldTypes = activeSectionKey && schema?.fieldTypes?.[activeSectionKey];

  const refOptions = useMemo(() => {
    const map = {};
    files.forEach((f) => {
      const { frontmatter } = parseFrontmatter(f.content);
      if (frontmatter.type && frontmatter.id) {
        if (!map[frontmatter.type]) map[frontmatter.type] = [];
        map[frontmatter.type].push(frontmatter.id);
      }
      // Extract svc_id.endpoint_id pairs from service documents, and query IDs from data query documents
      if (frontmatter.type === 'service') {
        const jsonMatch = f.content.match(/```json\n([\s\S]*?)```/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[1]);
            (data.services || []).forEach(svc => {
              (svc.endpoints || []).forEach(ep => {
                if (svc.id && ep.id) {
                  if (!map.serviceEndpoints) map.serviceEndpoints = [];
                  map.serviceEndpoints.push(`${svc.id}.${ep.id}`);
                }
              });
            });
            // Data queries doc: expose docId.queryId pairs
            if (data.queries && frontmatter.id) {
              (data.queries || []).forEach(q => {
                if (q.id) {
                  if (!map.serviceEndpoints) map.serviceEndpoints = [];
                  map.serviceEndpoints.push(`${frontmatter.id}.${q.id}`);
                }
              });
            }
          } catch {}
        }
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

  const syncDotFresh = githubConfig?.repo && (() => {
    const last = Math.max(
      githubConfig.lastPulled ? new Date(githubConfig.lastPulled).getTime() : 0,
      githubConfig.lastPushed ? new Date(githubConfig.lastPushed).getTime() : 0,
    );
    return last > 0 && (Date.now() - last) < 3_600_000;
  })();

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1><span>{"\u25C6"}</span> ABL Editor</h1>
          {appName && <div className="sidebar-app-name">{appName}</div>}
          <div className="sidebar-stats">
            <span>{mdFileCount} files</span>
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
        <FileTree files={files} activeFile={activeFile} onSelect={(p) => { setActiveFile(p); setViewMode('edit'); setActiveSectionKey(null); }} onAddToFolder={(folder, type) => { setAddModalPreset({ folder, type }); setShowAddModal(true); }} onMoveFile={moveFile} onDuplicate={duplicateFile} fileTags={fileTags} onAddTag={addTag} onRemoveTag={removeTag} onExportSelected={handleExportSelected} />
        <div className="sidebar-footer">
          <button className="btn" style={{ width: '100%' }} onClick={handleExportZip}>{Icons.download} Export ZIP</button>
        </div>
      </div>
      <div className="main">
        <div className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className={`btn sm gh-header-btn${githubConfig?.repo ? ' gh-header-connected' : ''}`}
              onClick={() => setShowGitHub(true)}
              title={githubConfig?.repo
                ? `${githubConfig.owner}/${githubConfig.repo} · ${githubConfig.branch}${githubConfig.lastPulled ? '\nPulled ' + relTime(githubConfig.lastPulled) : ''}`
                : 'Connect GitHub repository'}
            >
              <GHIcon size={13} />
              {githubConfig?.repo
                ? <>{githubConfig.owner}/{githubConfig.repo} <span className={`gh-sync-dot ${syncDotFresh ? 'fresh' : 'stale'}`} /></>
                : 'GitHub'
              }
            </button>
            {activeFile ? <span className="path">{activeFile}</span> : <span className="path" style={{ color: 'var(--text-muted)' }}>No file selected</span>}
          </div>
          <div className="tabs">
            <button className={'tab' + (viewMode === 'edit' ? ' active' : '')} onClick={() => setViewMode('edit')}>{Icons.edit} Edit</button>
            <button className={'tab' + (viewMode === 'view' ? ' active' : '')} onClick={() => setViewMode('view')}>{Icons.eye} View</button>
            <button className={'tab' + (viewMode === 'graph' ? ' active' : '')} onClick={() => setViewMode('graph')}>{Icons.graph} Graph</button>
          </div>
          <div className="actions">
            {currentFile && (<>
              <button className="btn sm" title="Copy markdown to clipboard" onClick={() => { navigator.clipboard.writeText(currentFile.content).then(() => showToast('Copied to clipboard')); }}>{Icons.copy}</button>
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
              {isReadOnly && (
                <div className="readonly-banner">
                  <span>This file is <strong>{parsed.frontmatter.status}</strong> — editing is locked.</span>
                  <button className="btn sm" onClick={() => duplicateFile(activeFile)}>Duplicate as Draft</button>
                </div>
              )}
              <FrontmatterEditor frontmatter={parsed.frontmatter} onChange={updateFrontmatter} refOptions={refOptions} readOnly={isReadOnly} />
              <div className="editor-section" style={{ marginBottom: 24 }}>
                <div className="section-header"><h3>Description</h3></div>
                <div className="section-body">
                  <textarea className="desc-editor" value={extractSections(parsed.body).description || ''} onChange={(e) => updateDescription(e.target.value)} placeholder="Describe what this blueprint defines..." readOnly={isReadOnly} />
                </div>
              </div>
              {(parsed.frontmatter.type === 'page' || parsed.frontmatter.type === 'component') && (
                <AssetsPanel
                  currentFile={currentFile}
                  files={files}
                  onAddAsset={addAsset}
                  onUpdateFile={updateFile}
                  onDeleteFile={deleteFile}
                  readOnly={isReadOnly}
                />
              )}
              {(() => {
                const { sections: docSections } = extractSections(parsed.body);
                const docType = parsed.frontmatter.type;
                const schemaSections = new Set((schema?.sections || []).map(s => s.toLowerCase().replace(/\s+/g, '_')));
                return (<>
                  {docSections.length > 0 && (
                    <div className="sections-toolbar">
                      <button className="btn sm" onClick={() => setExpandSignal(n => n + 1)}>Expand all</button>
                      <button className="btn sm" onClick={() => setCollapseSignal(n => n + 1)}>Collapse all</button>
                    </div>
                  )}
                  {(() => {
                    const isPairable = docType === 'page' || docType === 'component';
                    const rendered = [];
                    let skip = new Set();
                    docSections.forEach((s, i) => {
                      if (skip.has(i)) return;
                      const sk = s.heading.toLowerCase().replace(/\s+/g, '_');
                      const nextS = docSections[i + 1];
                      const nextSk = nextS?.heading.toLowerCase().replace(/\s+/g, '_');
                      const isPair = isPairable && sk === 'params' && nextSk === 'state';
                      if (isPair) skip.add(i + 1);

                      const makeSectionEditor = (sec, idx) => {
                        const key2 = sec.heading.toLowerCase().replace(/\s+/g, '_');
                        const custom = !schemaSections.has(key2);
                        return (
                          <SectionEditor
                            key={activeFile + '-' + idx}
                            heading={sec.heading}
                            content={sec.content}
                            onChange={(c) => updateSection(idx, c)}
                            schema={schema}
                            isActive={activeSectionKey === key2}
                            onActivate={() => setActiveSectionKey(key2)}
                            refOptions={refOptions}
                            docType={docType}
                            docSections={docSections}
                            allEnums={allEnums}
                            allModels={allModels}
                            readOnly={isReadOnly}
                            isCustom={custom}
                            onDelete={custom && !isReadOnly ? () => deleteSection(idx) : null}
                            onRename={custom && !isReadOnly ? (name) => renameSection(idx, name) : null}
                            collapseSignal={collapseSignal}
                            expandSignal={expandSignal}
                          />
                        );
                      };

                      if (isPair) {
                        rendered.push(
                          <div key={activeFile + '-pair-' + i} className="section-pair">
                            {makeSectionEditor(s, i)}
                            {makeSectionEditor(nextS, i + 1)}
                          </div>
                        );
                      } else {
                        rendered.push(makeSectionEditor(s, i));
                      }
                    });
                    return rendered;
                  })()}
                </>);
              })()}
              {!isReadOnly && <button className="btn add-section-btn" onClick={() => { const name = prompt('Section name:'); if (name) addSection(name); }}>{Icons.plus} Add Section</button>}
            </div>
            <RefSidePanel
              file={currentFile}
              files={files}
              activeSectionKey={activeSectionKey}
              fieldTypes={activeFieldTypes}
              onNavigate={(p) => { setActiveFile(p); setViewMode('edit'); setActiveSectionKey(null); }}
            />
          </>)}
        </div>
      </div>
      {showAddModal && <AddFileModal onAdd={addFile} onClose={() => { setShowAddModal(false); setAddModalPreset(null); }} existingPaths={files.map((f) => f.path)} initialFolder={addModalPreset?.folder} initialType={addModalPreset?.type} />}
      {showGuide && <GettingStarted onClose={() => setShowGuide(false)} />}
      {showGitHub && (
        <GitHubModal
          config={githubConfig}
          onClose={() => setShowGitHub(false)}
          onConfigChange={setGithubConfig}
          onPull={handleGithubPull}
          onPush={handleGithubPush}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
