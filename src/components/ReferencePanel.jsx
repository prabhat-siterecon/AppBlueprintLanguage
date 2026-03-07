import { Icons } from './Icons';
import { parseFrontmatter, extractReferences } from '../utils/parser';

export default function ReferencePanel({ file, files, onNavigate }) {
  const refs = extractReferences(file.content);
  const allIds = files
    .map((f) => parseFrontmatter(f.content).frontmatter.id)
    .filter(Boolean);
  const fileId = parseFrontmatter(file.content).frontmatter.id;

  const incomingRefs = files
    .filter(
      (f) =>
        f.path !== file.path && extractReferences(f.content).includes(fileId)
    )
    .map((f) => ({
      id: parseFrontmatter(f.content).frontmatter.id || f.path.split('/').pop(),
      path: f.path,
    }));

  if (refs.length === 0 && incomingRefs.length === 0) return null;

  return (
    <div className="ref-panel">
      <h3>
        {Icons.link} References
      </h3>
      <div className="ref-list">
        {refs.map((r) => {
          const exists = allIds.includes(r);
          return (
            <span
              key={`out-${r}`}
              className={`ref-tag ${exists ? 'outgoing' : 'broken'}`}
              onClick={() => {
                const target = files.find(
                  (f) => parseFrontmatter(f.content).frontmatter.id === r
                );
                if (target) onNavigate(target.path);
              }}
              title={exists ? `References: ${r}` : `Broken reference: ${r}`}
            >
              → {r}
            </span>
          );
        })}
        {incomingRefs.map((r) => (
          <span
            key={`in-${r.path}`}
            className="ref-tag incoming"
            onClick={() => onNavigate(r.path)}
            title={`Referenced by: ${r.id}`}
          >
            ← {r.id}
          </span>
        ))}
      </div>
    </div>
  );
}
