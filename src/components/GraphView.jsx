import { useState, useMemo } from 'react';
import { parseFrontmatter, extractReferences, extractSections, isSectionEmpty } from '../utils/parser';
import { STATUS_COLORS } from '../data/schema';

const TYPE_STYLES = {
  config:    { fill: '#1a2332', stroke: '#2a4a6b', text: '#7cb3e0' },
  page:      { fill: '#1a2a1a', stroke: '#2a5a2a', text: '#7cd07c' },
  component: { fill: '#2a1a2a', stroke: '#5a2a5a', text: '#d07cd0' },
  action:    { fill: '#2a2a1a', stroke: '#5a5a2a', text: '#d0d07c' },
  service:   { fill: '#1a2a2a', stroke: '#2a5a5a', text: '#7cd0d0' },
  datamodel: { fill: '#2a1a1a', stroke: '#5a2a2a', text: '#d09a7c' },
  feature:   { fill: '#1a2028', stroke: '#2a4a5a', text: '#7cc8d0' },
  function:  { fill: '#1a2820', stroke: '#2a5040', text: '#7cccc0' },
  general:   { fill: '#1C1F2E', stroke: '#2A2D42', text: '#8B8FA7' },
};

// ── Layout helpers ────────────────────────────────────────────────────────────

function circularLayout(nodes) {
  const cx = 380, cy = 285;
  const r = Math.min(230, Math.max(100, nodes.length * 28));
  return nodes.map((n, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

function focalLayout(focal, others) {
  const cx = 380, cy = 285;
  const r = Math.min(200, Math.max(110, others.length * 44));
  const focalNode = { ...focal, x: cx, y: cy };
  const otherNodes = others.map((n, i) => {
    const angle = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  return [focalNode, ...otherNodes];
}

// ── File detail panel ─────────────────────────────────────────────────────────

function FileDetail({ data, onOpen, onClose }) {
  const { node, frontmatter, sections } = data;
  const s = TYPE_STYLES[node.type] || TYPE_STYLES.general;
  const refs = node.refs.filter(Boolean);

  return (
    <div className="graph-detail">
      <div className="graph-detail-header">
        <span className="graph-detail-type" style={{ color: s.text, borderColor: s.stroke + '99', background: s.fill }}>
          {node.type}
        </span>
        <button className="btn sm" onClick={onClose}>×</button>
      </div>

      <div className="graph-detail-id">{frontmatter.id || node.id}</div>

      {frontmatter.status && (
        <div className="graph-detail-status" style={{ color: STATUS_COLORS[frontmatter.status] || 'var(--text-muted)' }}>
          ● {frontmatter.status}
          {frontmatter.scope && <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 10 }}>· {frontmatter.scope}</span>}
        </div>
      )}

      {frontmatter.implements && (
        <div className="graph-detail-meta" title={frontmatter.implements}>
          ↪ {frontmatter.implements.length > 30 ? '…' + frontmatter.implements.slice(-28) : frontmatter.implements}
        </div>
      )}

      {sections.length > 0 && (
        <div className="graph-detail-sections">
          <div className="graph-detail-sections-label">Sections</div>
          {sections.map((sec, i) => {
            const empty = isSectionEmpty(sec.content);
            return (
              <div key={i} className={`graph-detail-section${empty ? ' empty' : ''}`}>
                <span className="graph-detail-section-name">{sec.heading}</span>
                {empty
                  ? <span className="graph-detail-section-badge empty-badge-s">empty</span>
                  : <span className="graph-detail-section-badge filled-badge-s">✓</span>
                }
              </div>
            );
          })}
        </div>
      )}

      {refs.length > 0 && (
        <div className="graph-detail-refs">
          <div className="graph-detail-sections-label">References</div>
          <div className="graph-detail-ref-chips">
            {refs.map(r => <span key={r} className="graph-detail-ref-chip">{r}</span>)}
          </div>
        </div>
      )}

      <button className="btn primary graph-detail-open" onClick={onOpen}>
        Open in editor →
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GraphView({ files, onSelect }) {
  const [selectedId, setSelectedId] = useState(null);
  const [focusId, setFocusId] = useState(null);

  // Parse all nodes
  const allNodes = useMemo(() => {
    return files.map(f => {
      const { frontmatter } = parseFrontmatter(f.content);
      return {
        id: frontmatter.id || f.path.split('/').pop().replace('.md', ''),
        type: frontmatter.type || 'general',
        path: f.path,
        refs: extractReferences(f.content),
      };
    });
  }, [files]);

  // Compute visible nodes + edges (full or filtered)
  const { nodes, edges } = useMemo(() => {
    const idMap = new Map(allNodes.map(n => [n.id, n]));
    let positioned;

    if (focusId && idMap.has(focusId)) {
      const focal = idMap.get(focusId);
      const connectedIds = new Set([focusId]);
      focal.refs.forEach(ref => { if (idMap.has(ref)) connectedIds.add(ref); });
      allNodes.forEach(n => { if (n.refs.includes(focusId)) connectedIds.add(n.id); });
      const others = [...connectedIds].filter(id => id !== focusId).map(id => idMap.get(id));
      positioned = focalLayout(focal, others);
    } else {
      positioned = circularLayout(allNodes);
    }

    const posMap = new Map(positioned.map(n => [n.id, n]));
    const es = [];
    positioned.forEach(n => {
      n.refs.forEach(ref => {
        if (posMap.has(ref) && ref !== n.id) {
          es.push({ from: n, to: posMap.get(ref) });
        }
      });
    });
    return { nodes: positioned, edges: es };
  }, [allNodes, focusId]);

  // Right panel data
  const selectedData = useMemo(() => {
    if (!selectedId) return null;
    const node = allNodes.find(n => n.id === selectedId);
    if (!node) return null;
    const file = files.find(f => f.path === node.path);
    if (!file) return null;
    const { frontmatter, body } = parseFrontmatter(file.content);
    const { sections } = extractSections(body);
    return { node, frontmatter, sections };
  }, [selectedId, allNodes, files]);

  const handleClick = (n) => {
    setSelectedId(id => id === n.id ? null : n.id);
  };

  const handleDoubleClick = (n, e) => {
    e.stopPropagation();
    setFocusId(id => id === n.id ? null : n.id);
    setSelectedId(n.id);
  };

  const clearFocus = () => setFocusId(null);

  return (
    <div className="graph-split">

      {/* ── Left: graph ── */}
      <div className="graph-left">
        <div className="graph-header">
          <div className="graph-legend">
            {Object.entries(TYPE_STYLES).map(([type, s]) => (
              <span key={type} className="graph-legend-item"
                style={{ background: s.fill, border: `1px solid ${s.stroke}`, color: s.text }}>
                {type}
              </span>
            ))}
          </div>
          {focusId ? (
            <div className="graph-filter-bar">
              <span className="graph-filter-label">Connections of <strong>{focusId}</strong></span>
              <button className="btn sm" onClick={clearFocus}>× All</button>
            </div>
          ) : (
            <span className="graph-hint">Click to inspect · Double-click to filter</span>
          )}
        </div>

        <svg
          viewBox="0 0 760 570"
          style={{ width: '100%', flex: 1 }}
          onClick={() => { setSelectedId(null); }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="var(--text-muted)" />
            </marker>
            <marker id="arrowhead-sel" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="var(--accent)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const dx = e.to.x - e.from.x, dy = e.to.y - e.from.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / len, ny = dy / len;
            const isSel = e.from.id === selectedId || e.to.id === selectedId;
            return (
              <line key={i}
                x1={e.from.x} y1={e.from.y}
                x2={e.to.x - nx * 58} y2={e.to.y - ny * 18}
                stroke={isSel ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={isSel ? 2 : 1.5}
                opacity={isSel ? 0.9 : 0.4}
                markerEnd={isSel ? 'url(#arrowhead-sel)' : 'url(#arrowhead)'}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const s = TYPE_STYLES[n.type] || TYPE_STYLES.general;
            const label = n.id.length > 15 ? n.id.slice(0, 14) + '…' : n.id;
            const isSel   = n.id === selectedId;
            const isFocal = n.id === focusId;
            const strokeColor = isFocal ? '#ffffff' : isSel ? 'var(--accent)' : s.stroke;
            const strokeW = isFocal ? 2.5 : isSel ? 2 : 1;

            return (
              <g key={n.id}
                onClick={e => { e.stopPropagation(); handleClick(n); }}
                onDoubleClick={e => handleDoubleClick(n, e)}
                style={{ cursor: 'pointer' }}
              >
                <rect x={n.x - 56} y={n.y - 16} width={112} height={32} rx="7"
                  fill={s.fill} stroke={strokeColor} strokeWidth={strokeW} />
                <text x={n.x} y={n.y + 5} textAnchor="middle"
                  fontSize="11" fontFamily="var(--mono)"
                  fontWeight={isSel || isFocal ? '700' : '500'}
                  fill={isSel || isFocal ? '#fff' : s.text}>
                  {label}
                </text>
                {isFocal && (
                  <circle cx={n.x + 50} cy={n.y - 12} r="4" fill="var(--accent)" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Right: detail panel ── */}
      <div className="graph-right">
        {selectedData ? (
          <FileDetail
            data={selectedData}
            onOpen={() => onSelect(selectedData.node.path)}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="graph-right-empty">
            <div style={{ fontSize: 28, opacity: 0.2 }}>◆</div>
            <p>Click a node<br />to inspect it</p>
          </div>
        )}
      </div>

    </div>
  );
}
