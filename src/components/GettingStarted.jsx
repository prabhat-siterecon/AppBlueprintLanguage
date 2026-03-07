import { useState, useEffect, useRef } from 'react'
import { Icons } from './Icons'

const SECTIONS = [
  { id: 'what',        title: 'What is ABL Editor'  },
  { id: 'files',       title: 'File Types'           },
  { id: 'sidebar',     title: 'Sidebar & Navigation' },
  { id: 'edit',        title: 'Editing a File'       },
  { id: 'sections',    title: 'Section Editor'       },
  { id: 'composition', title: 'Composition Tree'     },
  { id: 'typed',       title: 'Typed Data Fields'    },
  { id: 'datamodel',   title: 'Data Models & Enums'  },
  { id: 'actions',     title: 'Actions & Triggers'   },
  { id: 'functions',   title: 'Functions'            },
  { id: 'features',    title: 'Features'             },
  { id: 'view',        title: 'View & Graph Modes'   },
  { id: 'refs',        title: 'References'           },
  { id: 'importex',    title: 'Import & Export'      },
  { id: 'workflow',    title: 'Workflow Tips'        },
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
            <P>The blueprint is stored as plain Markdown files with YAML frontmatter and structured sections. You can export the whole thing as a ZIP and commit it alongside your source code. All data is persisted automatically in your browser's local storage — nothing is lost on refresh.</P>
            <Callout>
              The <Em>implements</Em> field in each file lets you link a blueprint document back to the actual source file it describes — keeping design and code in sync.
            </Callout>
            <P>ABL Editor runs entirely in the browser. Nothing is sent to a server.</P>
          </Section>

          {/* ── File Types ── */}
          <Section id="files" title="File Types">
            <P>Every blueprint file has a <Code>type</Code> that determines its schema, sections, and color in the graph view.</P>
            <TypeTable rows={[
              ['config',    '#7cb3e0', 'App-wide settings: app config, auth, navigation, theme, state management.'],
              ['page',      '#7cd07c', 'A screen or route. Defines params, state, on_load action, and a composition tree of UI nodes.'],
              ['component', '#d07cd0', 'A reusable UI piece. Defines params, local state, on_load action, composition tree, and responsive notes.'],
              ['action',    '#d0d07c', 'A discrete unit of business logic. Has a scope (global, page, or component), steps, and error handling. Triggers are defined at the composition node level — not here.'],
              ['datamodel', '#d09a7c', 'Enums and data models with rich typed fields. The foundation for type-safe references everywhere.'],
              ['service',   '#7cd0d0', 'Data queries and API service definitions — endpoints, params, return types, cache settings.'],
              ['function',  '#7cccc0', 'Pure transformation logic. Takes typed inputs and produces typed outputs. Used as data source transformers in composition nodes.'],
              ['feature',   '#7cc8d0', 'High-level feature breakdown with sub-features, user types, flow descriptions, and cross-references.'],
              ['general',   '#8B8FA7', 'Free-form notes, changelogs, ADRs, or anything that doesn\'t fit the other types.'],
            ]} />
            <Callout>
              Click the <Em>+</Em> button that appears when hovering over any folder in the sidebar to instantly create a file of the right type in that folder.
            </Callout>
          </Section>

          {/* ── Sidebar ── */}
          <Section id="sidebar" title="Sidebar & Navigation">
            <P>The left sidebar shows your file tree. Config files (<Code>_app.md</Code>, <Code>_auth.md</Code>, <Code>_navigation.md</Code>, <Code>_theme.md</Code>) appear <Em>above</Em> the folders so they're always immediately accessible.</P>

            <H3>File tree indicators</H3>
            <ul className="guide-list">
              <li>Each file shows a <Em>type symbol</Em> — a small colored character (▣ page, ◫ component, ▸ action, ⬡ datamodel, ◆ feature, ƒ function, ⚙ service/config, ◉ general).</li>
              <li><Em>Yellow dot</Em> — the file has one or more empty sections. Use this as a completion checklist.</li>
              <li><Em>Blue dot</Em> — the file has outgoing references to other blueprint files.</li>
              <li>All folders are always visible, even when empty. An <Code>(empty)</Code> hint appears on folders with no files yet.</li>
            </ul>

            <H3>Quick-add from folders</H3>
            <P>Hover over any folder label to reveal a <Kbd>+</Kbd> button. Clicking it opens the Add File modal pre-set to that folder and its natural type — so hovering <Code>pages/</Code> pre-selects type <Code>page</Code>, and <Code>functions/</Code> pre-selects type <Code>function</Code>.</P>

            <H3>Sidebar actions</H3>
            <ul className="guide-list">
              <li><Kbd>New</Kbd> — opens the Add File modal. File name defaults to <Code>untitled</Code> (selected on open). Duplicate names auto-increment.</li>
              <li><Kbd>Import</Kbd> — import one or more <Code>.md</Code> files. If a file at the same path exists it is updated.</li>
              <li><Kbd>Export ZIP</Kbd> — downloads the full blueprint as <Code>blueprint.zip</Code>.</li>
            </ul>

            <H3>Persistence</H3>
            <P>Your entire blueprint is automatically saved to browser local storage on every change. Refreshing or reopening the tab restores your work exactly where you left off.</P>
          </Section>

          {/* ── Editing a File ── */}
          <Section id="edit" title="Editing a File">
            <P>Opening a file shows three tabs in the top bar:</P>
            <ul className="guide-list">
              <li><Em>Edit</Em> — the structured editor (default).</li>
              <li><Em>View</Em> — a clean read-only rendering of the document.</li>
              <li><Em>Graph</Em> — the full reference graph for all files.</li>
            </ul>
            <P>In <Em>Edit</Em> mode, the editor is laid out top to bottom:</P>
            <ol className="guide-list">
              <li><Em>References panel</Em> — appears when the file has cross-references (see the References section).</li>
              <li><Em>Frontmatter</Em> — type, id, status, and type-specific fields (scope for actions; on_load for pages and components).</li>
              <li><Em>Description</Em> — free-text summary of what this blueprint document defines.</li>
              <li><Em>Sections</Em> — structured content, with purpose-built editors for each section type.</li>
            </ol>
            <Callout>
              Pages and components have an <Em>on_load</Em> field in frontmatter. When actions exist in your blueprint, this becomes a dropdown to wire up a load action directly.
            </Callout>
            <P>The <Em>status</Em> field tracks the implementation lifecycle:</P>
            <StatusRow />
            <P>Actions have a <Em>scope</Em> field: <Code>global</Code> means the action is reusable anywhere; <Code>page</Code> or <Code>component</Code> means it belongs to a specific context.</P>
          </Section>

          {/* ── Section Editor ── */}
          <Section id="sections" title="Section Editor">
            <P>Sections use different editors depending on their type. The mode-switch tabs appear in the section header when applicable.</P>

            <H3>Standard YAML / Form sections</H3>
            <P>Sections like <Code>settings</Code>, <Code>lifecycle</Code>, <Code>steps</Code>, and <Code>error_handling</Code> support two modes:</P>
            <ul className="guide-list">
              <li><Em>YAML</Em> — direct textarea editing of raw YAML.</li>
              <li><Em>Form</Em> — structured inputs per field. Array sections render each item as a row with a trash button to delete it.</li>
            </ul>

            <H3>Purpose-built editors</H3>
            <P>The following sections always show a specialized editor instead of the generic YAML/Form toggle:</P>
            <ul className="guide-list">
              <li><Em>composition</Em> on pages and components → <Em>Composition Tree editor</Em> (see next section).</li>
              <li><Em>params</Em> and <Em>state</Em> on pages and components; <Em>inputs</Em> and <Em>outputs</Em> on functions → <Em>Typed Data Fields editor</Em>.</li>
              <li><Em>models</Em> and <Em>enums</Em> on datamodel files → rich model/enum editors.</li>
              <li><Em>features</Em> on feature files → the Features editor with sub-features and templates.</li>
            </ul>
            <Callout>Click <Kbd>+ Add Section</Kbd> at the bottom of the editor to append a custom free-text or YAML section to any file.</Callout>
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
                ['slot',      '#34D399', 'A placeholder inside a component definition where a passed-in component will render. Set slot_name and optionally slot_content.'],
              ].map(([t, c, d]) => (
                <div key={t} className="guide-type-row">
                  <span className="guide-type-pill" style={{ color: c, borderColor: c + '44', background: c + '18' }}>{t}</span>
                  <span className="guide-type-desc">{d}</span>
                </div>
              ))}
            </div>

            <H3>Node name</H3>
            <P>Every node has a <Em>node name</Em> — a machine-friendly identifier like <Code>header_row</Code> or <Code>user_avatar</Code>. Names are editable inline in the node header and appear in the tree for navigation.</P>

            <H3>Description</H3>
            <P>Every node has an optional <Em>description</Em> field to explain its purpose, visibility conditions, or design notes.</P>

            <H3>Data sources</H3>
            <P>Any layout, list, card, group, or component node can be connected to a data source. Click <Kbd>+ Data source</Kbd> in the expanded node to add one:</P>
            <ul className="guide-list">
              <li><Em>api</Em> — links to a service query defined in a service blueprint file.</li>
              <li><Em>state</Em> — reads from app or local state (specify the state key).</li>
              <li><Em>parameter</Em> — uses a value passed in as a param to the current page or component.</li>
              <li><Em>local_data</Em> — inline static data or a description of hardcoded content.</li>
              <li><Em>function</Em> — calls a function blueprint to transform data. Specify the function ID and an optional transform expression.</li>
            </ul>

            <H3>Triggers</H3>
            <P>Any node (except slot) can have one or more <Em>triggers</Em>. A trigger pairs an <Em>event name</Em> with an <Em>action</Em> to call when that event fires. Click <Kbd>+ Trigger</Kbd> to add one.</P>
            <P>Common events are suggested as you type — <Code>on_press</Code>, <Code>on_load</Code>, <Code>on_change</Code>, <Code>on_scroll</Code>, <Code>on_submit</Code>, <Code>on_appear</Code>, and more. Any custom event name is valid.</P>
            <Callout>Triggers are defined here on the composition node, not inside action files. An action file describes <Em>what</Em> happens — the composition node describes <Em>when</Em> it happens and <Em>where</Em> it's connected.</Callout>

            <H3>Params (component nodes only)</H3>
            <P>When a node's type is <Em>Component instance</Em>, a <Kbd>+ Params</Kbd> button appears. Add key-value pairs to pass props into the component — values can be literals (<Code>"Home"</Code>) or expressions (<Code>{'{'}state.user.name{'}'}</Code>).</P>

            <H3>Slot system</H3>
            <P>To make a component accept another component as content:</P>
            <ol className="guide-list">
              <li>Inside the <Em>component definition</Em>, add a node of type <Em>Slot placeholder</Em> and give it a <Em>slot name</Em> (e.g. <Code>content_slot</Code>). This marks the spot where external content will render.</li>
              <li>When <Em>using</Em> that component (component instance node), set <Em>slot content</Em> on a slot node to the ID of the component to pass in.</li>
            </ol>

            <H3>Tree vs JSON mode</H3>
            <P>Use the <Kbd>Tree</Kbd> / <Kbd>JSON</Kbd> toggle at the top of the section to switch between the visual tree editor and the raw JSON. The JSON mode is useful for copying, pasting, or bulk-editing nodes.</P>
          </Section>

          {/* ── Typed Data Fields ── */}
          <Section id="typed" title="Typed Data Fields">
            <P>The <Em>params</Em> and <Em>state</Em> sections of pages and components, and the <Em>inputs</Em> and <Em>outputs</Em> sections of functions, all use the same rich Typed Data Fields editor instead of a plain YAML textarea.</P>

            <H3>Column layout</H3>
            <P>Each row in the editor represents one field. The columns vary by section:</P>
            <ul className="guide-list">
              <li><Em>page params</Em> — name · type · source · required · default</li>
              <li><Em>page state / component state</Em> — name · type · default</li>
              <li><Em>component params</Em> — name · type · required · default</li>
              <li><Em>function inputs</Em> — name · type · default</li>
              <li><Em>function outputs</Em> — name · type</li>
            </ul>

            <H3>Type selector</H3>
            <P>The <Em>type</Em> column uses a cascading selector:</P>
            <ul className="guide-list">
              <li><Em>Primitive</Em> — string, text, int, number, boolean, date, datetime.</li>
              <li><Em>enum →</Em> — pick one of the enums defined in your datamodel files.</li>
              <li><Em>model →</Em> — pick one of the models defined in your datamodel files.</li>
              <li><Em>list [ ]</Em> — a list of any primitive, enum, or model.</li>
            </ul>

            <H3>Default values</H3>
            <P>Click the <Kbd>def</Kbd> button on any row to expand a default value input. This is also available on model fields in the Data Models editor.</P>

            <H3>Source (page params only)</H3>
            <P>The <Em>source</Em> column on page params describes where the value comes from at runtime: <Code>route</Code>, <Code>query</Code>, <Code>prop</Code>, or <Code>state</Code>.</P>

            <H3>YAML mode</H3>
            <P>All typed field sections have a <Kbd>Form</Kbd> / <Kbd>YAML</Kbd> toggle. Switch to YAML to inspect or bulk-edit the serialized output.</P>
          </Section>

          {/* ── Data Models & Enums ── */}
          <Section id="datamodel" title="Data Models & Enums">
            <P>Files with type <Code>datamodel</Code> have two special sections: <Code>enums</Code> and <Code>models</Code>.</P>

            <H3>Enums</H3>
            <P>An enum is a named set of fixed values — a status, a role, a category.</P>
            <ul className="guide-list">
              <li>Click <Kbd>+ Add Enum</Kbd> to create one. Give it an ID (e.g. <Code>user_role</Code>).</li>
              <li>Add values one at a time — press Enter or click <Kbd>+</Kbd>. Each value appears as a chip. Click <Code>×</Code> on a chip to remove it.</li>
            </ul>
            <Callout>Enums defined here automatically appear in the type selector of the Models editor and in the Typed Data Fields editor across all files.</Callout>

            <H3>Models</H3>
            <P>A model is a named data structure with typed fields — like a TypeScript interface or a database table.</P>
            <ul className="guide-list">
              <li>Click <Kbd>+ Add Model</Kbd>. Give it an ID and a description.</li>
              <li>Add fields with <Kbd>+ Add Field</Kbd>. Each field has: name, type (using the full type selector), required checkbox, an optional <Kbd>def</Kbd>ault value, and a description.</li>
            </ul>

            <H3>Field Types</H3>
            <FieldTypeTable />

            <H3>Primary Models</H3>
            <P>A model tagged <Em>PRIMARY</Em> is not embedded inside any other model. These are your top-level domain objects — users, orders, posts. Nested models used only as field types are not primary.</P>

            <H3>Duplicate</H3>
            <P>The duplicate icon on any model creates a copy below it with <Code>_copy</Code> appended to the ID.</P>
          </Section>

          {/* ── Actions & Triggers ── */}
          <Section id="actions" title="Actions & Triggers">
            <P>An <Code>action</Code> file describes a discrete unit of business logic — what steps run, in what order, and how errors are handled.</P>

            <H3>Scope</H3>
            <P>Every action has a <Em>scope</Em> field in its frontmatter:</P>
            <ul className="guide-list">
              <li><Em>global</Em> — a reusable action that can be triggered from any page, component, or composition node.</li>
              <li><Em>page</Em> — scoped to a specific page; typically referenced only from that page's composition.</li>
              <li><Em>component</Em> — scoped to a specific component; encapsulates its own behavior.</li>
            </ul>

            <H3>Steps</H3>
            <P>The <Code>steps</Code> section is an ordered list of operations the action performs. Each step has an ID, a type, and type-specific fields:</P>
            <ul className="guide-list">
              <li><Code>guard</Code> — evaluates a condition and halts if false.</li>
              <li><Code>api_call</Code> — calls a service query and assigns the result.</li>
              <li><Code>transform</Code> — applies a function to transform data.</li>
              <li><Code>state_update</Code> — writes a value to app or local state.</li>
              <li><Code>navigation</Code> — navigates to a page.</li>
            </ul>

            <H3>Connecting triggers</H3>
            <P>Actions are <Em>not</Em> triggered inside the action file. Instead, triggers are defined where the user interaction happens — on a <Em>composition node</Em>. Open the composition section of a page or component, expand a node, and click <Kbd>+ Trigger</Kbd> to wire an event to an action.</P>
            <P>For page-level lifecycle (on mount, on enter), use the <Em>on_load</Em> field in the page's frontmatter to connect an action that runs when the page loads.</P>
            <Callout>This separation keeps action files focused on <Em>logic</Em> and composition nodes focused on <Em>interaction</Em>. The same action can be triggered from multiple places without duplicating its definition.</Callout>
          </Section>

          {/* ── Functions ── */}
          <Section id="functions" title="Functions">
            <P>A <Code>function</Code> blueprint describes a pure transformation — it takes typed inputs and returns typed outputs based on defined logic. Functions are used as <Em>data source transformers</Em> in composition nodes, or to document helper logic that cuts across multiple features.</P>

            <H3>Structure</H3>
            <ul className="guide-list">
              <li><Em>inputs</Em> — a typed field list (name, type, optional default). Uses the same type selector as params and state.</li>
              <li><Em>outputs</Em> — a typed field list describing what the function returns.</li>
              <li><Em>logic</Em> — a description of the transformation logic, algorithm, or pseudocode.</li>
            </ul>

            <H3>Using in composition</H3>
            <P>In the composition tree, expand any node's data source and choose <Em>function</Em> as the type. A dropdown shows all function IDs from your blueprint. You can also specify an optional transform expression to further refine the output before it's passed to the node.</P>

            <H3>File location</H3>
            <P>Function files live in <Code>blueprint/functions/</Code>. Hover the functions folder in the sidebar and click <Kbd>+</Kbd> to create one — the type is pre-set to <Code>function</Code>.</P>
          </Section>

          {/* ── Features ── */}
          <Section id="features" title="Features">
            <P>Files with type <Code>feature</Code> describe what your app does from a product perspective — independently of how it's built.</P>

            <H3>Feature fields</H3>
            <ul className="guide-list">
              <li><Em>ID / Name</Em> — a machine-friendly identifier.</li>
              <li><Em>Description</Em> — what the feature does and why it exists.</li>
              <li><Em>User Types</Em> — who interacts with it (e.g. <Code>admin, user, guest</Code>).</li>
              <li><Em>Flow</Em> — a plain-language user journey description.</li>
            </ul>

            <H3>References</H3>
            <P>The References block at the bottom of each feature links it to pages, components, models, actions, services, and functions. Click a chip to toggle it on or off. Blue chips are selected.</P>

            <H3>Sub-features</H3>
            <P>Every top-level feature can have sub-features — smaller units that belong to it. Sub-features have the same fields but don't nest further.</P>

            <H3>Duplicate & Templates</H3>
            <ul className="guide-list">
              <li><Em>Duplicate</Em> — copy icon in the header. Creates an identical copy with <Code>_copy</Code> on the ID.</li>
              <li><Em>☆ Template</Em> — saves the feature as a browser-local reusable template. Not written to blueprint YAML.</li>
              <li><Em>From Template ▾</Em> — once templates exist, pick one as the starting point for a new item.</li>
            </ul>
          </Section>

          {/* ── View & Graph ── */}
          <Section id="view" title="View & Graph Modes">
            <H3>View mode</H3>
            <P>Click <Kbd>View</Kbd> to see a clean read-only rendering of the current file. Frontmatter is shown as a labeled block with a colored status pill. Useful for review, sharing screenshots, or reading without editor chrome.</P>

            <H3>Graph view</H3>
            <P>Click <Kbd>Graph</Kbd> to see all blueprint files as an interactive node graph.</P>
            <ul className="guide-list">
              <li>Each node is color-coded by type and labeled with its <Code>id</Code>.</li>
              <li>Arrows show references — A → B means A references B's ID in its YAML or JSON.</li>
              <li>Click any node to open that file in the editor.</li>
            </ul>
            <Callout>Use the graph to spot orphaned files (no incoming references) and to verify that composition node connections, action wiring, and data source references are all accounted for.</Callout>
          </Section>

          {/* ── References ── */}
          <Section id="refs" title="References">
            <P>ABL Editor automatically tracks cross-file references. A reference is created whenever a file's YAML or JSON contains the <Code>id</Code> of another blueprint file.</P>
            <P>When references exist, a <Em>References panel</Em> appears at the top of the editor:</P>
            <ul className="guide-list">
              <li><Em>Blue → tags</Em> — outgoing: this file references these. Click to navigate.</li>
              <li><Em>Green ← tags</Em> — incoming: these files reference this one. Click to navigate.</li>
              <li><Em>Red strikethrough</Em> — broken: references an ID that doesn't exist. Fix by correcting the ID or creating the missing file.</li>
            </ul>
            <P>References are resolved by <Code>id</Code>, not file path. Composition node data sources (api, function) and trigger action IDs are also tracked.</P>
          </Section>

          {/* ── Import & Export ── */}
          <Section id="importex" title="Import & Export">
            <H3>Auto-save</H3>
            <P>All changes are continuously persisted to browser local storage. No manual save needed — closing and reopening the tab restores your work exactly.</P>

            <H3>Importing files</H3>
            <P>Click <Kbd>Import</Kbd> to select <Code>.md</Code> files from your filesystem. Files are placed at <Code>blueprint/&lt;filename&gt;</Code>. Existing files at the same path are updated.</P>

            <H3>Exporting as ZIP</H3>
            <P>Click <Kbd>Export ZIP</Kbd> to download all blueprint files as <Code>blueprint.zip</Code>. Unzip and commit the <Code>blueprint/</Code> folder alongside your code.</P>

            <H3>Downloading a single file</H3>
            <P>With a file open, click the download icon (↓) in the top-right action bar to save just that file as <Code>.md</Code>.</P>

            <H3>Deleting files</H3>
            <P>Click the trash icon in the top-right action bar and confirm to remove a file from the editor. This only affects in-browser state — no files on disk are modified unless you re-export.</P>
          </Section>

          {/* ── Workflow Tips ── */}
          <Section id="workflow" title="Workflow Tips">
            <ol className="guide-list">
              <li>
                <Em>Start with config files.</Em> The default config files — <Code>_app.md</Code>, <Code>_auth.md</Code>, <Code>_navigation.md</Code>, <Code>_theme.md</Code> — sit above the folders in the sidebar for quick access. Fill these in first to establish entry points and auth strategy.
              </li>
              <li>
                <Em>Define data models before screens.</Em> Enums and models you define in <Code>data/models.md</Code> immediately appear in every type selector across the app. Build your data layer first so params and state fields can reference real types.
              </li>
              <li>
                <Em>Define functions alongside models.</Em> If your app transforms or formats data in multiple places, document those transformations as <Code>function</Code> files in <Code>blueprint/functions/</Code>. Wire them into composition data sources later.
              </li>
              <li>
                <Em>Write actions before wiring triggers.</Em> Create action files and fill in their steps first. Then open each page or component's composition tree and use <Kbd>+ Trigger</Kbd> on the relevant nodes to connect interactions. Keep action IDs descriptive — they appear in every trigger dropdown.
              </li>
              <li>
                <Em>Use on_load at the page level.</Em> For pages that fetch data on entry, set the <Code>on_load</Code> frontmatter field to the action that handles the initial data fetch. This makes the page's data lifecycle immediately visible at the top of the file.
              </li>
              <li>
                <Em>Use the yellow dot as a checklist.</Em> Files with empty sections show a yellow dot in the sidebar. The sidebar header also shows a total empty section count across all files. Aim for zero before moving to implementation.
              </li>
              <li>
                <Em>Scope actions correctly.</Em> Mark frequently reused actions (navigate, logout, show toast) as <Code>global</Code>. Mark actions that only make sense in one screen or component as <Code>page</Code> or <Code>component</Code>. This makes the trigger dropdown easier to navigate.
              </li>
              <li>
                <Em>Use the implements field.</Em> Once a blueprint file has been built, set <Code>status: implemented</Code> and fill in <Code>implements: src/path/to/file.tsx</Code>. Creates a durable link between spec and code.
              </li>
              <li>
                <Em>Check the graph for orphans.</Em> Open the graph view and look for nodes with no incoming arrows. Pages with no navigation references and actions with no trigger wiring often indicate missing connections or unused pieces.
              </li>
              <li>
                <Em>Keep the blueprint next to the code.</Em> Export as ZIP and commit <Code>blueprint/</Code> to your repository. A blueprint that lives alongside the code stays relevant. One that lives in a separate tool gets abandoned.
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
function H3({ children })     { return <h3 className="guide-h3">{children}</h3> }
function P({ children })      { return <p className="guide-p">{children}</p> }
function Em({ children })     { return <strong className="guide-em">{children}</strong> }
function Code({ children })   { return <code className="guide-code">{children}</code> }
function Kbd({ children })    { return <kbd className="guide-kbd">{children}</kbd> }
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
    ['enum:<id>',       'One of the values defined in a named enum in this file.'],
    ['model:<id>',      'A nested data model — embeds another model\'s full structure as a field.'],
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
