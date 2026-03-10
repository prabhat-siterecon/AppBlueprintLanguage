import { useState, useEffect, useRef } from 'react'
import { Icons } from './Icons'

const SECTIONS = [
  { id: 'what',        title: 'What is ABL Editor'   },
  { id: 'files',       title: 'File Types'            },
  { id: 'sidebar',     title: 'Sidebar & Navigation'  },
  { id: 'edit',        title: 'Editing a File'        },
  { id: 'sections',    title: 'Section Editor'        },
  { id: 'composition', title: 'Composition Tree'      },
  { id: 'typed',       title: 'Typed Data Fields'     },
  { id: 'datamodel',   title: 'Data Models & Enums'   },
  { id: 'actions',     title: 'Actions & Steps'       },
  { id: 'functions',   title: 'Functions'             },
  { id: 'features',    title: 'Features'              },
  { id: 'assets',      title: 'Reference Assets'      },
  { id: 'refs',        title: 'References'            },
  { id: 'view',        title: 'View & Graph Modes'    },
  { id: 'importex',    title: 'Import & Export'       },
  { id: 'workflow',    title: 'Workflow Tips'         },
]

export default function GettingStarted({ onClose }) {
  const [active, setActive] = useState('what')
  const contentRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const scrollTo = (id) => {
    const el = contentRef.current?.querySelector(`#gs-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActive(id)
  }

  const onScroll = () => {
    if (!contentRef.current) return
    const scrollTop = contentRef.current.scrollTop
    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const el = contentRef.current.querySelector(`#gs-${SECTIONS[i].id}`)
      if (el && el.offsetTop - 40 <= scrollTop) { setActive(SECTIONS[i].id); return }
    }
    setActive(SECTIONS[0].id)
  }

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="guide-modal" onClick={e => e.stopPropagation()}>

        <div className="guide-toc">
          <div className="guide-toc-header">
            <span className="guide-toc-logo">◆</span>
            <span>ABL Editor</span>
          </div>
          <div className="guide-toc-label">Getting Started</div>
          <nav className="guide-nav">
            {SECTIONS.map(s => (
              <button key={s.id} className={`guide-nav-item${active === s.id ? ' active' : ''}`} onClick={() => scrollTo(s.id)}>
                {s.title}
              </button>
            ))}
          </nav>
        </div>

        <div className="guide-content" ref={contentRef} onScroll={onScroll}>
          <button className="guide-close" onClick={onClose} title="Close (Esc)">×</button>

          {/* ── What is ABL Editor ── */}
          <Section id="what" title="What is ABL Editor">
            <P>ABL Editor is a structured workspace for designing mobile and web applications <Em>before writing a single line of code</Em>. Instead of scattered notes or wiki pages, it gives you a living blueprint of your app — every screen, component, data model, action, function, and feature defined as a versioned, cross-referenced document.</P>
            <P>The blueprint is stored as plain Markdown files with YAML frontmatter and structured sections. You can sync it with a GitHub repository, export it as a ZIP, and commit it alongside your source code. All data is automatically persisted in your browser's local storage.</P>
            <Callout>
              ABL Editor runs entirely in the browser. Nothing is sent to a server unless you connect a GitHub repository.
            </Callout>
            <P>Key capabilities at a glance:</P>
            <ul className="guide-list">
              <li>Structured editors for every blueprint type — pages, components, actions, data models, services, functions, and features.</li>
              <li>Cross-file reference tracking with an interactive graph view and a live <Em>References panel</Em> on the right side of every open document.</li>
              <li>Module tags to organise files by feature or product area.</li>
              <li>Reference assets — attach wireframe images and HTML/JSX code snippets directly to page and component files.</li>
              <li>GitHub sync — pull and push your entire blueprint to any repository branch.</li>
            </ul>
          </Section>

          {/* ── File Types ── */}
          <Section id="files" title="File Types">
            <P>Every blueprint file has a <Code>type</Code> that determines its schema, sections, and color in the graph view.</P>
            <TypeTable rows={[
              ['config',    '#7cb3e0', 'App-wide settings: app config, auth, navigation, theme, and state management.'],
              ['page',      '#7cd07c', 'A screen or route. Defines params, state, lifecycle, and a composition tree of UI nodes. Supports reference assets (wireframes, code).'],
              ['component', '#d07cd0', 'A reusable UI piece. Defines params, local state, lifecycle hooks (on_mount / on_unmount / on_update), composition tree, and responsive notes. Supports reference assets.'],
              ['action',    '#d0d07c', 'A discrete unit of business logic with ordered steps. Triggers are defined on composition nodes, not here.'],
              ['datamodel', '#d09a7c', 'Enums and data models with rich typed fields. The foundation for type-safe references everywhere.'],
              ['service',   '#7cd0d0', 'Data queries and API service definitions — endpoints, params, return types, cache settings.'],
              ['function',  '#7cccc0', 'Pure transformation logic: typed inputs → typed outputs. Used as data source transformers in composition nodes.'],
              ['feature',   '#7cc8d0', 'High-level feature breakdown with sub-features, user types, flow descriptions, and cross-references.'],
              ['general',   '#8B8FA7', 'Free-form notes, changelogs, ADRs, or anything that doesn\'t fit the other types.'],
            ]} />
            <Callout>
              Click the <Em>+</Em> that appears on hover over any folder in the sidebar to instantly create a file of the right type for that folder.
            </Callout>
          </Section>

          {/* ── Sidebar & Navigation ── */}
          <Section id="sidebar" title="Sidebar & Navigation">
            <P>The left sidebar is your primary navigation surface. Config files (<Code>_app.md</Code>, <Code>_auth.md</Code>, <Code>_navigation.md</Code>, <Code>_theme.md</Code>) appear above the folder tree for instant access.</P>

            <H3>Search</H3>
            <P>The search bar at the top of the sidebar filters the file list in real time. It matches against the file name, the document <Code>id</Code>, the document <Code>type</Code>, and any module tags. When a search or tag filter is active, files are shown as a flat list with their folder path displayed below the name.</P>

            <H3>Module tags</H3>
            <P>Every file can be tagged with one or more <Em>module tags</Em> to indicate which product feature or area it belongs to. Tags are stored in the <Code>module</Code> field of the file's frontmatter so they travel with the file on export and GitHub sync.</P>
            <ul className="guide-list">
              <li>Click the <Em>🏷</Em> button that appears on file hover to open the tag editor popover. Type a new tag and press Enter, or click a suggestion chip to add an existing tag.</li>
              <li>Tags appear as coloured chips in the file tree. If a file has more than one tag, only the first is shown plus a <Code>+N</Code> overflow count.</li>
              <li>The <Em>tag filter bar</Em> appears below the search box whenever any tags exist. Click a tag chip to filter the file list to only files carrying that tag. Multiple tags can be active at once.</li>
            </ul>

            <H3>File tree indicators</H3>
            <ul className="guide-list">
              <li>Each file shows a <Em>type symbol</Em> — ▣ page · ◫ component · ▸ action · ⬡ datamodel · ◆ feature · ƒ function · ⚙ service/config · ◉ general.</li>
              <li>A small <Em>status letter</Em> shows the lifecycle status: <Code>d</Code> draft · <Code>A</Code> approved · <Code>~</Code> implementing · <Code>✓</Code> implemented · <Code>✗</Code> deprecated.</li>
              <li><Em>Yellow dot</Em> — the file has at least one empty section.</li>
              <li><Em>Blue dot</Em> — the file has outgoing references to other blueprint files.</li>
              <li>The <Em>badge count</Em> on each folder shows the total number of files recursively inside it.</li>
            </ul>

            <H3>Hover actions on files</H3>
            <P>Hover over any file item to reveal two icon buttons on the right side:</P>
            <ul className="guide-list">
              <li><Em>Duplicate icon</Em> — creates a copy of the file with <Code>status: draft</Code>, placed in the same folder with a <Code>-d-v1</Code> suffix.</li>
              <li><Em>Folder icon</Em> — opens an inline move menu to relocate the file to any standard folder. A checkmark shows its current location.</li>
            </ul>
            <P>Both actions are also available via right-click context menu on any file.</P>

            <H3>Sidebar actions</H3>
            <ul className="guide-list">
              <li><Kbd>New</Kbd> — opens the Add File modal. File name defaults to <Code>untitled</Code>.</li>
              <li><Kbd>Import</Kbd> — import one or more <Code>.md</Code> files. Existing files at the same path are updated in place.</li>
              <li><Kbd>Open Blueprint Folder</Kbd> — select a local folder (e.g. an unzipped export). All <Code>.md</Code> files inside are imported and the current blueprint is replaced.</li>
              <li><Kbd>Export ZIP</Kbd> — downloads all blueprint files (including attached images and code snippets) as <Code>blueprint.zip</Code>.</li>
            </ul>

            <H3>GitHub button</H3>
            <P>The GitHub button in the top-left of the main panel opens the GitHub sync modal. Once a repository is connected, you can pull the latest blueprint from GitHub or push local changes. See the <Em>Import & Export</Em> section for details.</P>

            <H3>Auto-save</H3>
            <P>Every change is automatically saved to browser local storage. Refreshing or reopening the tab restores your work exactly where you left off.</P>
          </Section>

          {/* ── Editing a File ── */}
          <Section id="edit" title="Editing a File">
            <P>Opening a file shows three tabs in the top bar:</P>
            <ul className="guide-list">
              <li><Em>Edit</Em> — the structured editor (default).</li>
              <li><Em>View</Em> — a clean read-only rendering of the document.</li>
              <li><Em>Graph</Em> — the full reference graph for all files.</li>
            </ul>

            <H3>Top-bar actions</H3>
            <P>With a file open, the action buttons in the top-right are:</P>
            <ul className="guide-list">
              <li><Em>Copy icon</Em> — copies the full Markdown source of the file to the clipboard.</li>
              <li><Em>Download icon</Em> — saves the file as a <Code>.md</Code> file to your downloads folder.</li>
              <li><Em>Trash icon</Em> — deletes the file from the editor after confirmation.</li>
            </ul>

            <H3>Read-only mode</H3>
            <P>Files with a status other than <Code>draft</Code> are locked for editing. A banner at the top of the editor shows the current status and offers a <Kbd>Duplicate as Draft</Kbd> button to create an editable copy while preserving the approved/implemented original.</P>

            <H3>Edit layout — top to bottom</H3>
            <ol className="guide-list">
              <li><Em>Frontmatter</Em> — compact chip row showing type, id, status, and type-specific fields. Module tags are also shown here as read-only chips (edit them from the 🏷 button in the file tree).</li>
              <li><Em>Description</Em> — free-text summary of what this document defines.</li>
              <li><Em>Reference Assets</Em> — images and code snippets attached to this file (pages and components only). See the <Em>Reference Assets</Em> section.</li>
              <li><Em>Sections toolbar</Em> — <Kbd>Expand all</Kbd> and <Kbd>Collapse all</Kbd> buttons to control all sections at once.</li>
              <li><Em>Sections</Em> — structured content, each with a purpose-built editor.</li>
            </ol>

            <H3>Frontmatter</H3>
            <P>The frontmatter row shows all schema fields for the file's type as labelled chips. The fields vary by type:</P>
            <ul className="guide-list">
              <li><Em>All types</Em> — <Code>type</Code> · <Code>id</Code> · <Code>status</Code>.</li>
              <li><Em>page / component</Em> — also <Code>on_load</Code> (a dropdown of action IDs when actions exist) · <Code>last_synced</Code> · <Code>implements</Code>.</li>
              <li><Em>action</Em> — also <Code>scope</Code> (global / page / component).</li>
            </ul>
            <P>The <Code>status</Code> field tracks the implementation lifecycle:</P>
            <StatusRow />

            <H3>Right-side panel</H3>
            <P>The panel to the right of the editor switches context depending on what's active:</P>
            <ul className="guide-list">
              <li>When <Em>no section is selected</Em> — shows the document's <Em>References panel</Em>: all outgoing references grouped by type, unresolved references, and files that reference this document. Click any card to open that document in a preview modal.</li>
              <li>When a <Em>section header is clicked</Em> — shows the section's schema: field names, types, and a sample YAML snippet.</li>
            </ul>
          </Section>

          {/* ── Section Editor ── */}
          <Section id="sections" title="Section Editor">
            <P>Sections use different editors depending on their type. Mode-switch tabs appear in the section header when applicable.</P>

            <H3>Expanding and collapsing</H3>
            <P>Click anywhere on a section header to toggle it open or closed. Use <Kbd>Expand all</Kbd> / <Kbd>Collapse all</Kbd> in the toolbar above the sections list to control all sections at once.</P>

            <H3>Section controls (header hover)</H3>
            <P>Hover over any section header to reveal its action buttons on the right:</P>
            <ul className="guide-list">
              <li><Em>later</Em> — marks the section for later. The section stays expandable and its content is preserved, but a yellow banner signals it is not yet active. The Markdown is annotated with <Code>{'<!-- skip -->'}</Code>. Click <Em>Mark active</Em> to restore.</li>
              <li><Em>N/A</Em> — marks the section as not applicable for this app. The section collapses and becomes faded. The content is preserved in the Markdown as <Code>{'<!-- disabled - not applicable -->'}</Code>. Only an <Em>Enable</Em> button is shown. <Code>Expand all</Code> does not open disabled sections.</li>
              <li><Em>Rename icon</Em> (custom sections only) — edit the section heading inline. Press Enter or click away to save.</li>
              <li><Em>Trash icon</Em> (custom sections only) — delete the section after confirmation.</li>
            </ul>

            <H3>Side-by-side params & state</H3>
            <P>On <Em>page</Em> and <Em>component</Em> files, the <Code>params</Code> and <Code>state</Code> sections are displayed side by side in a two-column layout, giving a compact overview of the data contract and local state together.</P>

            <H3>Standard YAML / Form sections</H3>
            <P>Sections like <Code>settings</Code>, <Code>lifecycle</Code>, and <Code>error_handling</Code> support two modes:</P>
            <ul className="guide-list">
              <li><Em>YAML</Em> — direct textarea editing of raw YAML.</li>
              <li><Em>Form</Em> — structured inputs per field. Array sections render each item as a row with a trash button.</li>
            </ul>

            <H3>Purpose-built editors</H3>
            <ul className="guide-list">
              <li><Em>composition</Em> on pages and components → Composition Tree editor.</li>
              <li><Em>params</Em> and <Em>state</Em> on pages and components; <Em>inputs</Em> and <Em>outputs</Em> on functions → Typed Data Fields editor.</li>
              <li><Em>models</Em> and <Em>enums</Em> on datamodel files → rich model/enum editors.</li>
              <li><Em>steps</Em> on action files → Action Steps editor with step type, description, and context-aware ref field.</li>
              <li><Em>features</Em> on feature files → the Features editor.</li>
            </ul>
            <Callout>Click <Kbd>+ Add Section</Kbd> at the bottom of any file to append a custom free-text or YAML section. Custom sections can be renamed or deleted.</Callout>
          </Section>

          {/* ── Composition Tree ── */}
          <Section id="composition" title="Composition Tree">
            <P>The <Code>composition</Code> section on page and component files uses a <Em>tree editor</Em> to define the UI structure as a hierarchy of named nodes. Each node has a type, a name, optional data wiring, and optional children.</P>

            <H3>Node types</H3>
            <div className="guide-type-table">
              {[
                ['layout',    '#FBBF24', 'Structural containers: container, row, column, stack, scroll, tabs. Can have children.'],
                ['list',      '#FB923C', 'Data-driven lists: list, grid, carousel. Can have children as item template.'],
                ['element',   '#a78bfa', 'Leaf UI elements: text, button, icon, image, input, badge, divider. No children.'],
                ['card',      '#7cd0d0', 'A card surface. Can have children.'],
                ['group',     '#8B8FA7', 'A logical grouping with no visual wrapper. Can have children.'],
                ['component', '#4F6BED', 'An instance of a component blueprint. Specify the component ID and pass params.'],
                ['slot',      '#34D399', 'A placeholder inside a component definition where a passed-in component will render.'],
              ].map(([t, c, d]) => (
                <div key={t} className="guide-type-row">
                  <span className="guide-type-pill" style={{ color: c, borderColor: c + '44', background: c + '18' }}>{t}</span>
                  <span className="guide-type-desc">{d}</span>
                </div>
              ))}
            </div>

            <H3>Node name & description</H3>
            <P>Every node has a <Em>node name</Em> (machine-friendly, e.g. <Code>header_row</Code>) and an optional <Em>description</Em> field for design notes or visibility conditions.</P>

            <H3>Data sources</H3>
            <P>Expand any node and click <Kbd>+ Data source</Kbd> to connect it to data:</P>
            <ul className="guide-list">
              <li><Em>api</Em> — links to a service query.</li>
              <li><Em>state</Em> — reads from app or local state.</li>
              <li><Em>parameter</Em> — a value passed in as a param to the current page or component.</li>
              <li><Em>local_data</Em> — inline static or hardcoded content.</li>
              <li><Em>function</Em> — calls a function blueprint to transform data.</li>
            </ul>

            <H3>Triggers</H3>
            <P>Any node (except slot) can have one or more <Em>triggers</Em> — an event name paired with an action to call. Common events (<Code>on_press</Code>, <Code>on_load</Code>, <Code>on_change</Code>, <Code>on_submit</Code>, <Code>on_appear</Code>, etc.) are suggested as you type. Any custom event name is valid.</P>
            <Callout>Triggers live on composition nodes, not inside action files. Action files describe <Em>what</Em> happens; composition nodes describe <Em>when</Em> and <Em>where</Em>.</Callout>

            <H3>Params (component instances) & Slot system</H3>
            <P>When a node's type is <Em>Component instance</Em>, click <Kbd>+ Params</Kbd> to pass props into the component. To make a component accept content in a slot, add a <Em>Slot placeholder</Em> node inside the component definition and reference it via <Em>slot content</Em> on the instance node.</P>

            <H3>Tree vs JSON mode</H3>
            <P>Use the <Kbd>Tree</Kbd> / <Kbd>JSON</Kbd> toggle to switch between the visual editor and raw JSON for bulk editing.</P>
          </Section>

          {/* ── Typed Data Fields ── */}
          <Section id="typed" title="Typed Data Fields">
            <P>The <Code>params</Code> and <Code>state</Code> sections of pages and components, and the <Code>inputs</Code> / <Code>outputs</Code> sections of functions, all use the <Em>Typed Data Fields editor</Em>.</P>

            <H3>Column layout</H3>
            <ul className="guide-list">
              <li><Em>page params</Em> — name · type · source · required · default</li>
              <li><Em>page / component state</Em> — name · type · default</li>
              <li><Em>component params</Em> — name · type · required · default</li>
              <li><Em>function inputs</Em> — name · type · default</li>
              <li><Em>function outputs</Em> — name · type</li>
            </ul>

            <H3>Type selector</H3>
            <ul className="guide-list">
              <li><Em>Primitive</Em> — string, text, int, number, boolean, date, datetime.</li>
              <li><Em>enum →</Em> — pick from enums defined in your datamodel files.</li>
              <li><Em>model →</Em> — pick from models defined in your datamodel files.</li>
              <li><Em>list [ ]</Em> — a list of any primitive, enum, or model.</li>
            </ul>

            <H3>Source (page params only)</H3>
            <P>The <Em>source</Em> column describes where the value comes from at runtime: <Code>route</Code>, <Code>query</Code>, <Code>prop</Code>, or <Code>state</Code>.</P>

            <H3>Default values & YAML mode</H3>
            <P>Click the <Kbd>def</Kbd> button on any row to expand a default value input. All typed field sections have a <Kbd>Form</Kbd> / <Kbd>YAML</Kbd> toggle for bulk editing.</P>
          </Section>

          {/* ── Data Models & Enums ── */}
          <Section id="datamodel" title="Data Models & Enums">
            <P>Files with type <Code>datamodel</Code> have two special sections: <Code>enums</Code> and <Code>models</Code>.</P>

            <H3>Enums</H3>
            <P>An enum is a named set of fixed values — a status, a role, a category. Click <Kbd>+ Add Enum</Kbd>, give it an ID, and add values one at a time (Enter or <Kbd>+</Kbd>). Enums appear automatically in every type selector across the app.</P>

            <H3>Models</H3>
            <P>A model is a named data structure with typed fields. Click <Kbd>+ Add Model</Kbd>, set an ID and description, then <Kbd>+ Add Field</Kbd> for each field (name, type, required, default, description).</P>

            <H3>Field Types</H3>
            <FieldTypeTable />

            <H3>Primary Models & Duplicate</H3>
            <P>A model tagged <Em>PRIMARY</Em> is a top-level domain object (not embedded inside another model). The duplicate icon on any model creates a copy with <Code>_copy</Code> on the ID.</P>
          </Section>

          {/* ── Actions & Steps ── */}
          <Section id="actions" title="Actions & Steps">
            <P>An <Code>action</Code> file describes a discrete unit of business logic — what steps run, in what order, and how errors are handled. Triggers are <Em>not</Em> defined here; they live on composition nodes.</P>

            <H3>Scope</H3>
            <ul className="guide-list">
              <li><Em>global</Em> — reusable from any page, component, or composition node.</li>
              <li><Em>page</Em> — scoped to a specific page context.</li>
              <li><Em>component</Em> — scoped to a specific component.</li>
            </ul>

            <H3>Steps editor</H3>
            <P>The <Code>steps</Code> section uses a dedicated row editor. Each step has four columns:</P>
            <ul className="guide-list">
              <li><Em>id</Em> — a machine identifier for the step (e.g. <Code>fetch_user</Code>).</li>
              <li><Em>type</Em> — one of: <Code>guard</Code> · <Code>api_call</Code> · <Code>transform</Code> · <Code>state_update</Code> · <Code>navigation</Code>.</li>
              <li><Em>description</Em> — a plain-language note about what this step does.</li>
              <li><Em>ref</Em> — a context-aware reference field. The dropdown options change based on step type: service IDs for <Code>api_call</Code>; function IDs for <Code>guard</Code> and <Code>transform</Code>; page IDs for <Code>navigation</Code>; a free-text state key for <Code>state_update</Code>.</li>
            </ul>
            <Callout>Use Form mode for a structured row view, or switch to YAML mode for bulk editing or copy-paste.</Callout>

            <H3>Error handling</H3>
            <P>The <Code>error_handling</Code> section sets a default error behaviour and optional retry configuration for the action as a whole.</P>

            <H3>Wiring triggers</H3>
            <P>To connect an action to user interaction, open the <Code>composition</Code> section of a page or component, expand a node, and click <Kbd>+ Trigger</Kbd>. For page-level lifecycle (on load), use the <Code>on_load</Code> field in frontmatter.</P>
          </Section>

          {/* ── Functions ── */}
          <Section id="functions" title="Functions">
            <P>A <Code>function</Code> blueprint describes a pure transformation — typed inputs in, typed outputs out. Functions are used as data source transformers in composition nodes or to document shared helper logic.</P>
            <ul className="guide-list">
              <li><Em>inputs</Em> — typed field list (name, type, default).</li>
              <li><Em>outputs</Em> — typed field list (name, type).</li>
              <li><Em>logic</Em> — description, algorithm, or pseudocode.</li>
            </ul>
            <P>In the composition tree, choose <Em>function</Em> as a data source type and select the function ID from the dropdown. Function files live in <Code>blueprint/functions/</Code>.</P>
          </Section>

          {/* ── Features ── */}
          <Section id="features" title="Features">
            <P>Files with type <Code>feature</Code> describe what your app does from a product perspective — independently of implementation details.</P>

            <H3>Feature fields</H3>
            <ul className="guide-list">
              <li><Em>ID</Em> — machine-friendly identifier.</li>
              <li><Em>Description</Em> — what the feature does and why it exists.</li>
              <li><Em>User Types</Em> — who interacts with it (e.g. <Code>admin, user, guest</Code>).</li>
              <li><Em>Flow</Em> — plain-language user journey.</li>
              <li><Em>References block</Em> — links to pages, components, models, actions, services, and functions. Click a chip to toggle a reference on or off.</li>
            </ul>

            <H3>Sub-features</H3>
            <P>Every top-level feature can have sub-features — smaller units belonging to it. Sub-features have the same fields but don't nest further.</P>

            <H3>Duplicate & Templates</H3>
            <ul className="guide-list">
              <li><Em>Duplicate</Em> — creates a copy with <Code>_copy</Code> on the ID.</li>
              <li><Em>☆ Template</Em> — saves the feature as a browser-local reusable template.</li>
              <li><Em>From Template ▾</Em> — pick a saved template as the starting point for a new item.</li>
            </ul>
          </Section>

          {/* ── Reference Assets ── */}
          <Section id="assets" title="Reference Assets">
            <P>Pages and components can have <Em>reference assets</Em> attached — wireframe images and HTML/JSX code snippets stored alongside the blueprint document. The assets panel appears below the Description field on page and component files.</P>

            <H3>Images (wireframes & mockups)</H3>
            <ul className="guide-list">
              <li>Click the <Em>Image</Em> button in the assets panel header to upload one or more images (PNG, JPG, GIF, WebP, SVG).</li>
              <li>Images are stored at <Code>{'blueprint/<folder>/assets/<basename>-1.png'}</Code>, <Code>-2.png</Code>, etc., numbered incrementally.</li>
              <li>Uploaded images appear as a thumbnail grid. Click any thumbnail to open a full-screen lightbox.</li>
              <li>Hover a thumbnail to reveal the <Code>×</Code> delete button.</li>
            </ul>

            <H3>Reference code</H3>
            <ul className="guide-list">
              <li>Click <Kbd>HTML</Kbd> or <Kbd>JSX</Kbd> to create a new reference code file with a starter placeholder.</li>
              <li>Click the upload button (<Em>↑</Em>) to import an existing file (<Code>.html</Code>, <Code>.jsx</Code>, <Code>.tsx</Code>, <Code>.js</Code>, <Code>.ts</Code>, <Code>.css</Code>).</li>
              <li>Code files are stored at <Code>{'blueprint/<folder>/code/<basename>.html'}</Code> or <Code>.jsx</Code>, etc. — one file per extension.</li>
              <li>Each code file renders as an inline editable textarea (collapsible with the chevron). Changes are saved immediately.</li>
            </ul>

            <H3>File storage & export</H3>
            <P>Asset and code files are part of your blueprint and included in the <Kbd>Export ZIP</Kbd> — images are written as proper binary files, code as text. They are <Em>not</Em> shown in the sidebar file tree; use the assets panel to manage them.</P>
            <Callout>Images are stored as base64 data in the browser. Very large images (multiple megabytes each) may cause browser storage limits to be reached. Export as ZIP regularly when working with many images.</Callout>
          </Section>

          {/* ── References ── */}
          <Section id="refs" title="References">
            <P>ABL Editor automatically tracks cross-file references. A reference is created whenever a file's YAML or JSON contains the <Code>id</Code> of another blueprint file.</P>

            <H3>References panel (right side)</H3>
            <P>When a document is open and no section is selected, the <Em>right-side panel</Em> shows all references for that document:</P>
            <ul className="guide-list">
              <li>Outgoing references are <Em>grouped by type</Em> — pages together, components together, actions together, and so on. Each group has a colored label matching the type.</li>
              <li>Each reference appears as a card showing the document ID and file name, with a status dot color-coded by lifecycle status.</li>
              <li>An <Em>unresolved</Em> group (red) lists any IDs that don't match a file in the blueprint.</li>
              <li>A <Em>referenced by</Em> group (green) shows which other files link to the current document.</li>
            </ul>

            <H3>Document preview modal</H3>
            <P>Click any reference card to open a <Em>preview modal</Em> showing the full rendered view of that document — the same as the <Kbd>View</Kbd> tab — without leaving the current file. The modal header shows the type badge and ID. Click <Kbd>Open in editor</Kbd> to navigate to it, or click outside the modal (or <Kbd>×</Kbd>) to close.</P>

            <H3>How references are detected</H3>
            <P>References are resolved by <Code>id</Code>, not file path. The scanner picks up values in: <Code>component:</Code>, <Code>action:</Code>, <Code>model:</Code>, <Code>page:</Code>, <Code>ref:</Code>, <Code>entry_page:</Code>, <Code>login_page:</Code>, and comma-separated lists in <Code>pages:</Code>, <Code>components:</Code>, <Code>models:</Code>, <Code>actions:</Code>, and <Code>services:</Code> fields.</P>

            <H3>Schema reference dropdowns</H3>
            <P>Wherever an ID reference is expected — component IDs in composition nodes, action IDs in triggers, page IDs in navigation steps, function IDs in data sources — the editor shows a searchable dropdown populated with all matching IDs from your blueprint.</P>
          </Section>

          {/* ── View & Graph ── */}
          <Section id="view" title="View & Graph Modes">
            <H3>View mode</H3>
            <P>Click <Kbd>View</Kbd> to see a clean read-only rendering of the current file. Frontmatter is shown as a labeled block with a colored status pill. Useful for review or sharing screenshots.</P>

            <H3>Graph view</H3>
            <P>Click <Kbd>Graph</Kbd> to see all blueprint files as an interactive node graph.</P>
            <ul className="guide-list">
              <li>Each node is color-coded by type and labeled with its <Code>id</Code>.</li>
              <li>Arrows show references — A → B means A references B's ID in its content.</li>
              <li>Click any node to open that file in the editor.</li>
            </ul>
            <Callout>Use the graph to spot orphaned files (no incoming arrows) and verify that composition connections, action wiring, and data source references are fully accounted for.</Callout>
          </Section>

          {/* ── Import & Export ── */}
          <Section id="importex" title="Import & Export">
            <H3>Auto-save</H3>
            <P>All changes are continuously persisted to browser local storage. No manual save needed.</P>

            <H3>Open Blueprint Folder</H3>
            <P>Click <Kbd>Open Blueprint Folder</Kbd> in the sidebar to select a local folder. All <Code>.md</Code> files within it are imported and replace the current blueprint. This is the fastest way to load an unzipped export or a blueprint checked out from Git.</P>

            <H3>Import individual files</H3>
            <P>Click <Kbd>Import</Kbd> to select one or more <Code>.md</Code> files. Each is placed at <Code>blueprint/&lt;filename&gt;</Code>. Files already at that path are updated in place.</P>

            <H3>Export as ZIP</H3>
            <P>Click <Kbd>Export ZIP</Kbd> to download all blueprint files — including attached images (as binary) and reference code files — as <Code>blueprint.zip</Code>. Unzip and commit the <Code>blueprint/</Code> folder alongside your source code.</P>

            <H3>Download a single file</H3>
            <P>With a file open, click the download icon (↓) in the top-right action bar to save that file as <Code>.md</Code>.</P>

            <H3>GitHub sync</H3>
            <P>Click the <Em>GitHub</Em> button in the top-left of the main panel to open the sync modal:</P>
            <ol className="guide-list">
              <li>Enter your <Em>Personal Access Token</Em> (needs <Code>repo</Code> scope), the <Em>owner/repo</Em>, and the <Em>branch</Em>.</li>
              <li>Click <Kbd>Connect</Kbd>. ABL Editor scans the repository for <Code>.md</Code> files under a <Code>blueprint/</Code> folder.</li>
              <li><Kbd>Pull from GitHub</Kbd> — replaces the current blueprint with the files on the selected branch.</li>
              <li><Kbd>Push to GitHub</Kbd> — writes all local blueprint files to the repository. Files are created or updated; nothing is deleted from the remote.</li>
            </ol>
            <P>A sync status dot on the GitHub button shows whether your last pull/push was recent (green) or stale (grey). Connection settings are stored in local storage.</P>
            <Callout>The GitHub token is stored in browser local storage. Use a token with minimal permissions (repo read/write to the specific repository) and revoke it when no longer needed.</Callout>
          </Section>

          {/* ── Workflow Tips ── */}
          <Section id="workflow" title="Workflow Tips">
            <ol className="guide-list">
              <li>
                <Em>Start with config files.</Em> Fill in <Code>_app.md</Code>, <Code>_auth.md</Code>, <Code>_navigation.md</Code>, and <Code>_theme.md</Code> first to establish entry points, auth strategy, and route structure before designing individual screens.
              </li>
              <li>
                <Em>Define data models before screens.</Em> Enums and models defined in <Code>data/models.md</Code> appear immediately in every type selector. Build your data layer first so params and state fields can reference real types.
              </li>
              <li>
                <Em>Use module tags to stay organised.</Em> Tag every file with its feature or product area (<Code>auth</Code>, <Code>onboarding</Code>, <Code>payments</Code>, etc.). Use the tag filter bar in the sidebar to focus on one area at a time when reviewing or editing.
              </li>
              <li>
                <Em>Attach wireframes to pages and components early.</Em> Upload mockup images or paste reference HTML/JSX into the Reference Assets panel as soon as you have designs. This makes each blueprint file self-contained — spec, structure, and visual reference in one place.
              </li>
              <li>
                <Em>Use N/A to declutter, not delete.</Em> If a section type doesn't apply to your app (e.g. <Code>pull_to_refresh</Code> settings on a desktop page), click <Em>N/A</Em> to hide it. The content is preserved in the Markdown and can be re-enabled later. Reserve deletion for sections you've created yourself and are certain you don't need.
              </li>
              <li>
                <Em>Write actions before wiring triggers.</Em> Create action files and fill in their steps. Then open each page or component's composition tree and use <Kbd>+ Trigger</Kbd> on the relevant nodes. Keep action IDs descriptive — they appear in every trigger dropdown and in the action steps ref column.
              </li>
              <li>
                <Em>Use the References panel to validate connections.</Em> Open any page or component and check the right panel. If the <Em>unresolved</Em> group shows red cards, fix those IDs. If <Em>referenced by</Em> is empty for a key page, it may be missing a navigation link somewhere.
              </li>
              <li>
                <Em>Use the yellow dot as a completion checklist.</Em> Files with empty sections show a yellow dot. The sidebar header shows the total empty section count across all files. Aim for zero before handing off to engineering.
              </li>
              <li>
                <Em>Keep approved files locked.</Em> Set <Code>status: approved</Code> once a document has been reviewed. This makes the file read-only in the editor, preventing accidental edits. Use <Kbd>Duplicate as Draft</Kbd> to propose changes, then swap the statuses when the revision is accepted.
              </li>
              <li>
                <Em>Sync with GitHub on every session.</Em> Pull at the start, push before closing. This keeps the blueprint in sync with the repository and gives you a full commit history of design decisions.
              </li>
              <li>
                <Em>Use the graph for a final sanity check.</Em> Open the graph view and look for nodes with no incoming arrows. Orphaned actions and unlinked components often indicate missing wiring or unused files that can be cleaned up.
              </li>
            </ol>
          </Section>

          <div style={{ height: 60 }} />
        </div>
      </div>
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────

function Section({ id, title, children }) {
  return (
    <section id={`gs-${id}`} className="guide-section">
      <h2 className="guide-section-title">{title}</h2>
      {children}
    </section>
  )
}
function H3({ children })      { return <h3 className="guide-h3">{children}</h3> }
function P({ children })       { return <p className="guide-p">{children}</p> }
function Em({ children })      { return <strong className="guide-em">{children}</strong> }
function Code({ children })    { return <code className="guide-code">{children}</code> }
function Kbd({ children })     { return <kbd className="guide-kbd">{children}</kbd> }
function Callout({ children }) { return <div className="guide-callout">{children}</div> }

function TypeTable({ rows }) {
  return (
    <div className="guide-type-table">
      {rows.map(([type, color, desc]) => (
        <div key={type} className="guide-type-row">
          <span className="guide-type-pill" style={{ color, borderColor: color + '44', background: color + '18' }}>{type}</span>
          <span className="guide-type-desc">{desc}</span>
        </div>
      ))}
    </div>
  )
}

function FieldTypeTable() {
  const rows = [
    ['string',          'Short text — names, IDs, URLs, labels.'],
    ['text',            'Long text — descriptions, notes, paragraphs.'],
    ['int',             'Whole number integer.'],
    ['number',          'Floating-point number.'],
    ['boolean',         'True or false.'],
    ['date',            'Calendar date (YYYY-MM-DD).'],
    ['datetime',        'Date and time (ISO 8601).'],
    ['enum:<id>',       'One of the values defined in a named enum in this datamodel file.'],
    ['model:<id>',      'A nested data model — embeds another model\'s full structure.'],
    ['list:string',     'An array of strings (or any primitive).'],
    ['list:enum:<id>',  'An array of enum values.'],
    ['list:model:<id>', 'An array of another model — e.g. a user\'s list of orders.'],
  ]
  return (
    <div className="guide-field-table">
      {rows.map(([type, desc]) => (
        <div key={type} className="guide-field-row">
          <code className="guide-code guide-field-type">{type}</code>
          <span className="guide-type-desc">{desc}</span>
        </div>
      ))}
    </div>
  )
}

function StatusRow() {
  return (
    <div className="guide-status-row">
      {[['draft','#6B7280'],['approved','#3B82F6'],['implementing','#F59E0B'],['implemented','#10B981'],['deprecated','#EF4444']].map(([s, c]) => (
        <span key={s} className="guide-status-pill" style={{ background: c + '22', color: c, borderColor: c + '44' }}>{s}</span>
      ))}
    </div>
  )
}
