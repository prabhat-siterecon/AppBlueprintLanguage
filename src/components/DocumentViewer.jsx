import { parseFrontmatter, extractSections, extractYamlFromSection } from '../utils/parser';

const STATUS_COLORS = {
  draft: '#6B7280', approved: '#3B82F6', implementing: '#F59E0B',
  implemented: '#10B981', deprecated: '#EF4444',
};

export default function DocumentViewer({ file }) {
  const { frontmatter, body } = parseFrontmatter(file.content);
  const { description, sections } = extractSections(body);
  const title = body.match(/^#\s+(.*)/m)?.[1] || frontmatter.id || 'Untitled';

  return (
    <div className="doc-viewer">
      <h1>{title}</h1>
      <div className="fm-block">
        {Object.entries(frontmatter).map(([k, v]) => (
          <div key={k}>
            <span style={{ color: 'var(--accent)' }}>{k}:</span>{' '}
            {k === 'status' ? (
              <span className="status-pill" style={{
                background: (STATUS_COLORS[v] || '#6B7280') + '22',
                color: STATUS_COLORS[v] || '#6B7280',
              }}>{v}</span>
            ) : v}
          </div>
        ))}
      </div>
      {description && <p>{description}</p>}
      {sections.map((s, i) => (
        <div key={i}>
          <h2>{s.heading}</h2>
          {s.content.includes('```yaml') ? (
            <pre>{extractYamlFromSection(s.content) || s.content}</pre>
          ) : (
            <p style={{ whiteSpace: 'pre-wrap' }}>{s.content}</p>
          )}
        </div>
      ))}
    </div>
  );
}
