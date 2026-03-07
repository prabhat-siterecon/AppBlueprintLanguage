import { useState } from 'react';
import { BLUEPRINT_SCHEMA } from '../data/schema';

const FOLDER_OPTIONS = [
  { value: 'blueprint',            label: 'blueprint/' },
  { value: 'blueprint/pages',      label: 'blueprint/pages/' },
  { value: 'blueprint/components', label: 'blueprint/components/' },
  { value: 'blueprint/actions',    label: 'blueprint/actions/' },
  { value: 'blueprint/data',       label: 'blueprint/data/' },
  { value: 'blueprint/features',   label: 'blueprint/features/' },
  { value: 'blueprint/functions',  label: 'blueprint/functions/' },
];

export default function AddFileModal({ onAdd, onClose, existingPaths, initialFolder, initialType }) {
  const [name, setName] = useState('untitled');
  const [folder, setFolder] = useState(initialFolder || 'blueprint/pages');
  const [type, setType] = useState(initialType || 'page');

  const handleAdd = () => {
    const safeName = (name.trim() || 'untitled').replace(/\.md$/, '');
    let path = `${folder}/${safeName}.md`;
    // Auto-increment if name conflicts
    if (existingPaths.includes(path)) {
      let i = 2;
      while (existingPaths.includes(`${folder}/${safeName}_${i}.md`)) i++;
      path = `${folder}/${safeName}_${i}.md`;
    }

    const schema = BLUEPRINT_SCHEMA[type] || BLUEPRINT_SCHEMA.general;
    const sectionBlocks = schema.sections
      .map((s) => `\n## ${s}\n\n\`\`\`yaml\n${s}: ${schema.fieldTypes[s]?._array ? '[]' : '{}'}\n\`\`\``)
      .join('\n');

    const id = safeName.replace(/[^a-z0-9_]/g, '_');
    const displayName = safeName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const content = `---\ntype: ${type}\nid: ${id}\nstatus: draft\nlast_synced: ${new Date().toISOString()}\nimplements: \n---\n\n# ${displayName}\n\nDescription goes here.\n${sectionBlocks}`;

    onAdd(path, content);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Blueprint File</h2>
        <label>File name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <label>Folder</label>
        <select value={folder} onChange={(e) => setFolder(e.target.value)}>
          {FOLDER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {Object.keys(BLUEPRINT_SCHEMA).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleAdd}>Create</button>
        </div>
      </div>
    </div>
  );
}
