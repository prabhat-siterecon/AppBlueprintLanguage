# ABL Editor — App Blueprint Language Editor

A local React app for creating, editing, and managing **App Blueprint Language** files — the declarative spec that sits alongside your code and serves as the contract between developers and coding agents.

## Quick Start

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`

## Features

- **File tree sidebar** — hierarchical view of blueprint files with empty-section (yellow) and reference (blue) indicators
- **Frontmatter editor** — typed fields with dropdowns for status/type
- **Section editor** — YAML editing per section with schema hints showing expected field types
- **Empty section detection** — yellow EMPTY badges highlight sections needing content
- **Reference graph** — SVG dependency visualization, color-coded by blueprint type
- **Cross-reference panel** — outgoing (blue), incoming (green), broken (red) references with click-to-navigate
- **Document viewer** — read-only rendered view of any blueprint file
- **Import/Export** — import `.md` files, export entire blueprint as ZIP
- **Add files & sections** — create new blueprint files with auto-scaffolded sections based on type

## Project Structure

```
src/
├── App.jsx                    # Main app shell
├── main.jsx                   # Entry point
├── index.css                  # Global styles
├── components/
│   ├── AddFileModal.jsx       # New file creation dialog
│   ├── DocumentViewer.jsx     # Read-only rendered view
│   ├── FileTree.jsx           # Sidebar file tree
│   ├── FrontmatterEditor.jsx  # YAML frontmatter fields
│   ├── GraphView.jsx          # SVG reference graph
│   ├── Icons.jsx              # SVG icon set
│   ├── ReferencePanel.jsx     # Cross-reference display
│   ├── SectionEditor.jsx      # Per-section YAML editor
│   └── Toast.jsx              # Notification component
├── data/
│   └── schema.js              # Blueprint schema + default files
└── utils/
    └── parser.js              # Markdown/YAML parsing utilities
```

## Tech Stack

- React 19 + Vite
- JSZip + FileSaver for export
- Zero external UI libraries — custom CSS
