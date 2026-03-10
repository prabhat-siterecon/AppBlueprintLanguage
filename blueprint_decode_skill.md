# ABL Blueprint Decode Skill

ABL is a markdown-based app specification language. A **blueprint** is a set of `.md` files — each with YAML frontmatter, an H1 title, optional description, and H2 sections containing fenced `yaml` or `json` code blocks. Documents cross-reference by `id`, forming a dependency graph describing an app's screens, logic, data, and services.

## Folder Structure

```
blueprint/
  _app.md  _auth.md  _navigation.md  _theme.md  _changelog.md   ← config files (prefix _)
  pages/{name}.md          ← type: page       (one per screen)
  components/{name}.md     ← type: component  (reusable UI)
  actions/{name}.md        ← type: action     (workflows/logic)
  services/{name}.md       ← type: service    (API definitions)
  data/models.md           ← type: datamodel  (enums + models)
  data/queries.md          ← type: service    (API queries)
  data/state.md            ← type: config     (app-wide state)
  features/{name}.md       ← type: feature    (feature specs)
  functions/{name}.md      ← type: function   (utility helpers)
```

Reference assets for pages/components: images at `{folder}/{basename}/assets/{basename}-N.{ext}` (numbered), code at `{folder}/{basename}/code/{basename}.{ext}`.

## File Format

```markdown
---
type: page
id: home_page
status: draft
module: auth, core
on_load: fetch_data
implements: feature_id
last_synced: 2026-03-10T14:30:00Z
scope: global
---

# Title

Description text.

## section_name

```yaml
key: value
```
```

### Frontmatter Fields

All types have: `type`, `id`, `status`, `module` (comma-separated grouping tags).
- **page/component** add: `on_load` (action ref), `implements` (feature ref), `last_synced`
- **action** adds: `scope` (global|page|component), `implements`, `last_synced`
- **feature** adds: `last_synced`

`status` values: draft | approved | implementing | implemented | deprecated

### Section Markers

Prepend before code block: `<!-- skip -->` (deferred/later) or `<!-- disabled - not applicable -->` (not needed/N/A, excluded from expand-all).

---

## Document Types & Sections

### page

Describes a screen/view. Sections: `settings`, `params`, `state`, `lifecycle`, `composition`

```yaml
# settings (object) — page-level config
settings:
  title: "Home"
  requires_auth: true
  scroll: "vertical"           # vertical | horizontal | none
  pull_to_refresh: false

# params (array) — inputs the page accepts
params:
  - name: "user_id"
    type: "string"
    source: "route"            # route | query | prop | state
    required: true
    default: ""

# state (array) — reactive state variables
state:
  - name: "is_loading"
    type: "boolean"
    default: true

# lifecycle (object) — action refs for page events
lifecycle:
  on_enter: "action:fetch_data"
  on_leave: ""
  on_focus: "action:refresh"

# composition — YAML array (simple) or JSON composition tree (complex, see §5)
```

### component

Reusable UI element. Sections: `params`, `state`, `lifecycle`, `composition`, `responsive`

```yaml
params:
  - name: "title"
    type: "string"
    required: true
    default: ""

state:
  - name: "expanded"
    type: "boolean"
    default: false

lifecycle:
  on_mount: "action:init"
  on_unmount: ""
  on_update: ""

responsive:
  notes: "Stack on mobile, side-by-side on tablet+"
```

### action

Workflow/logic sequence. Sections: `steps`, `error_handling`. Frontmatter adds `scope`.

The `ref` field in each step is **context-aware** — its meaning depends on the step `type`:

```yaml
steps:
  - id: "check_auth"
    type: "guard"              # conditional check — ref → config id
    description: "Verify user is authenticated"
    ref: "auth_config"
  - id: "fetch"
    type: "api_call"           # API call — ref → "service:{svc_id}.{endpoint_id}"
    description: "Load user data"
    ref: "service:user_api.get_user"
  - id: "transform"
    type: "transform"          # data mapping — ref → function id
    description: "Format response"
    ref: "format_user"
  - id: "save"
    type: "state_update"       # state change — ref → "state.{field}"
    description: "Store in state"
    ref: "state.current_user"
  - id: "navigate"
    type: "navigation"         # page nav — ref → "page:{page_id}"
    description: "Go to profile"
    ref: "page:profile_page"

error_handling:
  default: "Show error toast"
  retry:
    max_attempts: 3
    delay_ms: 1000
```

### datamodel

Data structures and enumerations. Sections: `enums`, `models`

```yaml
enums:
  - id: "user_role"
    values: "admin, editor, viewer"       # comma-separated string_list

models:
  - id: "User"
    description: "Application user"
    fields:
      id: "string"
      email: "string"
      role: "user_role"                   # references an enum id
      created_at: "datetime"
```

### config

Application-level configuration. Sections vary by file:

**_app.md** — `app`, `environments`, `constants`:
```yaml
app:
  name: "My App"
  version: "1.0.0"
  entry_page: "home_page"     # ref:page
  login_page: "login_page"    # ref:page

environments:
  - name: "production"
    api_base: "https://api.example.com"
    feature_flags: "dark_mode, new_checkout"
```

**_auth.md** — `auth`: provider, strategy, token config, guards.
**_navigation.md** — `routing`, `routes` (path→page), `nav_bar` (tabs/items).
**_theme.md** — `tokens` (colors, spacing, typography, radius), `styled_elements`, `responsive`.
**data/state.md** — `app_state` (global vars), `local_storage`, `state_management`.

### service

API definitions. Uses **JSON** (not YAML). Section: `services`

```json
{ "services": [{
  "id": "user_api",
  "name": "User API",
  "base_url": "https://api.example.com/v1",
  "auth": "Bearer token",
  "description": "User management",
  "endpoints": [{
    "id": "get_user",
    "name": "Get User",
    "method": "GET",
    "path": "/users/{id}",
    "description": "Fetch user by ID",
    "params": [
      { "name": "id", "in": "path", "type": "string", "required": true, "description": "User ID" }
    ],
    "headers": [
      { "name": "Authorization", "value": "Bearer {token}", "required": true }
    ],
    "body": { "schema": "", "example": "" },
    "responses": [
      { "status": 200, "description": "Success", "schema": "{ \"id\": \"string\" }" }
    ],
    "errors": [
      { "code": 404, "message": "User not found" }
    ]
  }]
}]}
```

### feature

High-level feature specs that bundle related documents. Section: `features`

```yaml
features:
  - id: "user_login"
    description: "Email/password and OAuth login"
    user_types: "all"
    flow: "Login → validate → redirect to home"
    pages: "login_page, home_page"           # comma-separated ids
    components: "login_form, oauth_buttons"
    models: "User, AuthToken"
    actions: "login_flow, validate_token"
    services: "auth_api"
```

### function

Utility helpers. Sections: `inputs`, `outputs`, `logic`

```yaml
inputs:
  - name: "date"
    type: "Date"
    default: ""
outputs:
  - name: "formatted"
    type: "string"
logic:
  description: "Parse date and apply format string."
```

### general
Free-form markdown, no predefined sections (changelogs, notes, docs).

---

## Composition Tree (JSON)

Pages and components use a **composition tree** in their `composition` section for complex UI hierarchies. Stored as a JSON code block.

```json
{ "nodes": [{
  "node": "root",
  "nodeType": "layout",
  "layoutType": "column",
  "description": "Main layout",
  "dataSource": null,
  "triggers": [],
  "children": [
    {
      "node": "header",
      "nodeType": "component",
      "component": "top_bar",
      "params": [{ "key": "title", "value": "\"Home\"" }],
      "triggers": [],
      "children": []
    },
    {
      "node": "user_list",
      "nodeType": "list",
      "listType": "list",
      "dataSource": { "type": "api", "ref": "user_api.get_users" },
      "triggers": [{ "event": "on_press", "action": "view_detail" }],
      "children": [
        {
          "node": "card",
          "nodeType": "component",
          "component": "user_card",
          "params": [{ "key": "user", "value": "{item}" }],
          "triggers": [], "children": []
        }
      ]
    }
  ]
}]}
```

### Node Types

| nodeType | children | dataSource | triggers | subtype field |
|----------|:--------:|:----------:|:--------:|---------------|
| layout | yes | yes | yes | layoutType: container, row, column, stack, scroll, tabs |
| list | yes | yes | yes | listType: list, grid, carousel |
| element | no | no | yes | elementType: text, button, icon, image, input, badge, divider |
| card | yes | yes | yes | — |
| group | yes | yes | yes | — |
| component | yes | yes | yes | `component` field = component id |
| slot | no | no | no | `slotName` + `slotContent` |

### Node Fields

`node` (name), `nodeType`, `layoutType/listType/elementType` (subtype), `component` (component id), `params` ([{key,value}] for component instances), `slotName/slotContent` (slot config), `description`, `dataSource` ({type,ref} or null), `triggers` ([{event,action}]), `children` (nested nodes, recursive).

### Data Sources

| type | ref format | notes |
|------|-----------|-------|
| api | `svc_id.endpoint_id` | fetches from API |
| state | `state.key` | reads app state |
| parameter | `param_name` | reads page/component param |
| local_data | description | inline data; optional `transform` field |
| function | `function_id` | calls a function; optional `transform` field |

**Common events:** on_press, on_load, on_change, on_scroll, on_submit, on_focus, on_blur, on_appear, on_long_press, on_swipe

---

## Cross-Referencing

Documents reference each other by `id`. These patterns are detected:

| Pattern | Example | Context |
|---------|---------|---------|
| `component: {id}` | `component: user_card` | composition, YAML fields |
| `action: {id}` | `action: login_flow` | triggers, lifecycle |
| `page: {id}` | `page: home_page` | navigation, routes |
| `query: {id}` | `query: get_users` | data source refs |
| `model: {id}` | `model: User` | type references |
| `ref:{id}` | `ref:auth_config` | generic inline ref |
| `entry_page: {id}` | `entry_page: home_page` | config fields |
| `login_page: {id}` | `login_page: login_page` | config fields |
| `style_token: {id}` | `style_token: tokens.btn` | theme refs |

Feature files use CSV fields (`pages: "id1, id2"`, `components`, `models`, `actions`, `services`) which are also detected. References are directional: **outgoing** (IDs this doc uses), **incoming** (docs using this ID), **broken** (unresolved IDs).

---

## YAML Rules

Quote with `"` if value contains `: , [] {} #` or looks like boolean/number. Empty: `""`, `[]`, `{}`. Array sections use `- item` entries; object sections use `key: value` pairs.

**Field types:** string, boolean, any, object, string_list (comma-separated), action_list (action ref), ref:page (page id), enum:a|b|c

---

## Workflow

### Creating a Blueprint from Scratch

1. **Config**: `_app.md`, `_auth.md`, `_navigation.md`, `_theme.md`
2. **Data**: `data/models.md` (enums + models), `data/queries.md` (services), `data/state.md`
3. **Features**: outline each feature linking its pages, components, actions, models, services
4. **Pages**: one per screen — settings, params, state, lifecycle, composition tree
5. **Components**: reusable UI with params and composition
6. **Actions**: one per workflow — typed steps with refs, error handling
7. **Finalize**: wire `id` refs, set statuses, add `module:` tags

### Reverse-Engineering from an Existing App

1. Inventory every screen → page files (mark `implemented`)
2. Identify reusable UI → component files
3. Document API endpoints → service files
4. Trace user flows → action files with steps
5. Extract data structures → models and enums
6. Document state, routes, theme in config files
7. Build composition trees for pages/components
8. Bundle related docs into features; add screenshots as reference assets

### Maintaining

- Create feature doc first, then its artifacts
- Status flow: draft → approved → implementing → implemented
- `<!-- skip -->` to defer, `<!-- disabled - not applicable -->` for unneeded sections
- Use `module:` tags; check incoming refs before deprecating
