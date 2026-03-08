# App Blueprint Language (ABL) — Agent Guide

This guide is for Claude agents tasked with analysing an existing codebase and producing a complete set of App Blueprint Language (ABL) files. Follow every section precisely so the output loads cleanly in the ABL Editor.

---

## 1. What Is ABL?

ABL is a **declarative specification** written as Markdown files with YAML/JSON data blocks. Each file describes one concern of the app (a page, a component, an action, a data model, etc.) and acts as a contract between developers and coding agents.

ABL files live in a `blueprint/` directory alongside the app source code.

---

## 2. File Format

Every ABL file is a `.md` file with this structure:

```
---
<frontmatter key-value pairs>
---

# <Human-readable title>

<One or two sentence description of this file's purpose.>

## <section_name>

```yaml
<YAML data block>
```

## <next_section>

```yaml
<YAML data block>
```
```

Rules:
- The frontmatter block **must** be the very first thing in the file, delimited by `---`.
- The H1 title comes immediately after the frontmatter.
- Each section is an H2 heading (`##`) followed by a fenced code block.
- Use ` ```yaml ` for most sections. Use ` ```json ` only for `composition` and `service.services` sections.
- Section headings must match the schema exactly (snake_case, no spaces).

---

## 3. Frontmatter Fields

| Field | Required for | Values / Format |
|---|---|---|
| `type` | all | `config` `page` `component` `action` `datamodel` `service` `feature` `function` `general` |
| `id` | all | unique snake_case string, e.g. `home_page` |
| `status` | all | `draft` `approved` `implementing` `implemented` `deprecated` |
| `on_load` | page, component | action `id` to run when this screen/component mounts |
| `last_synced` | page, component, action, feature | ISO 8601 date, e.g. `2026-03-08` |
| `implements` | page, component, action | relative path to the source file, e.g. `src/screens/Home.tsx` |
| `scope` | action | `global` `page` `component` |

Only include fields that apply to the type. Do **not** invent new frontmatter keys.

---

## 4. Blueprint Types and Their Sections

### 4.1 `config`

Used for cross-cutting configuration. Multiple config files are normal.

**Standard config files and their sections:**

`blueprint/_app.md` — `app`, `environments`, `constants`
```yaml
app:
  name: "My App"
  version: "1.0.0"
  entry_page: "home_page"
  login_page: "login_page"

environments:
  - name: dev
    api_base: "https://dev-api.example.com"
    feature_flags: []
  - name: prod
    api_base: "https://api.example.com"
    feature_flags: []

constants: []
```

`blueprint/_auth.md` — `auth`
```yaml
auth:
  provider: "firebase"       # firebase | supabase | custom | none
  strategy: "jwt"            # jwt | session | oauth
  token:
    storage: "local"         # local | secure | memory
    refresh: true
    ttl: "7d"
  user_data:
    fields: [uid, email, role]
    roles: [user, admin]
  guards: [require_auth]
```

`blueprint/_navigation.md` — `routing`, `routes`, `nav_bar`
```yaml
routing:
  type: history              # history | hash | memory
  base_path: /

routes:
  - path: /
    page: home_page
  - path: /login
    page: login_page

nav_bar:
  position: bottom           # bottom | top | side | none
  items:
    - label: Home
      icon: home
      page: home_page
```

`blueprint/_theme.md` — `tokens`, `styled_elements`, `responsive`
```yaml
tokens:
  colors:
    primary: "#2563EB"
    surface: "#F9FAFB"
    error: "#DC2626"
    text: "#111827"
    muted: "#6B7280"
  spacing:
    xs: 4
    sm: 8
    md: 16
    lg: 24
    xl: 40
  typography:
    body: { size: 14, weight: 400 }
    heading: { size: 24, weight: 700 }
  radius:
    sm: 4
    md: 8
    lg: 16

styled_elements: {}

responsive:
  breakpoints:
    mobile: 0
    tablet: 768
    desktop: 1024
```

`blueprint/data/state.md` — `app_state`, `local_storage`, `state_management`
```yaml
app_state:
  - name: currentUser
    type: User | null
    default: null
  - name: isLoading
    type: boolean
    default: false

local_storage:
  engine: "AsyncStorage"
  collections: [auth_token, user_prefs]

state_management:
  pattern: "zustand"         # zustand | redux | context | mobx | signal
```

---

### 4.2 `page`

One file per screen. Store in `blueprint/pages/`.

Frontmatter: `type`, `id`, `status`, `on_load` (optional), `last_synced`, `implements`

Sections: `settings`, `params`, `state`, `lifecycle`, `composition`

```yaml
# settings
settings:
  title: "Home"
  requires_auth: true
  scroll: vertical           # vertical | horizontal | none
  pull_to_refresh: false

# params — inputs to this page
params:
  - name: userId
    type: string
    source: route            # route | query | prop | state
    required: true
    default: ""

# state — local reactive state
state:
  - name: items
    type: Item[]
    default: []
  - name: isRefreshing
    type: boolean
    default: false

# lifecycle — action IDs triggered at lifecycle events
lifecycle:
  on_enter: load_home_data_action
  on_leave: ""
  on_focus: ""
```

The `composition` section uses **JSON** (see Section 4.8).

---

### 4.3 `component`

One file per reusable UI component. Store in `blueprint/components/`.

Frontmatter: `type`, `id`, `status`, `on_load` (optional), `last_synced`, `implements`

Sections: `params`, `state`, `composition`, `responsive`

```yaml
# params — props accepted by this component
params:
  - name: item
    type: Item
    required: true
    default: ""
  - name: onPress
    type: function
    required: false
    default: ""

# state — internal component state
state:
  - name: expanded
    type: boolean
    default: false

# responsive
responsive:
  notes: "Stack vertically below 768px. Hide secondary actions on mobile."
```

The `composition` section uses **JSON** (see Section 4.8).

---

### 4.4 `action`

One file per logical action (data fetch, mutation, navigation, etc.). Store in `blueprint/actions/`.

Frontmatter: `type`, `id`, `status`, `scope`, `last_synced`, `implements`

Sections: `steps`, `error_handling`

```yaml
# steps
steps:
  - id: check_auth
    type: guard               # guard | api_call | transform | state_update | navigation
    query: "currentUser !== null"
    assign_to: ""
  - id: fetch_items
    type: api_call
    query: get_items          # references a service endpoint id
    assign_to: "state.items"
  - id: show_toast
    type: state_update
    query: ""
    assign_to: "state.toast"

# error_handling
error_handling:
  default: "Show error toast and log to Sentry"
  retry:
    max_attempts: 3
    backoff: exponential
```

---

### 4.5 `datamodel`

One file for all data types is fine; split by domain if large. Store in `blueprint/data/`.

Frontmatter: `type`, `id`, `status`

Sections: `enums`, `models`

```yaml
# enums
enums:
  - id: UserRole
    values: admin, user, guest
  - id: OrderStatus
    values: pending, confirmed, shipped, delivered, cancelled

# models
models:
  - id: User
    description: "Authenticated user profile"
    fields:
      uid: string
      email: string
      role: UserRole
      createdAt: date-time
  - id: Item
    description: "A product or list item"
    fields:
      id: string
      name: string
      price: number
      inStock: boolean
```

---

### 4.6 `service`

Describes external APIs and their endpoints. Store in `blueprint/data/queries.md` or per-domain files.

Frontmatter: `type`, `id`, `status`

The `services` section uses **JSON**:

```json
{
  "services": [
    {
      "id": "items_api",
      "name": "Items API",
      "base_url": "https://api.example.com/v1",
      "description": "CRUD for items",
      "auth": "Bearer token",
      "endpoints": [
        {
          "id": "get_items",
          "name": "Get Items",
          "method": "GET",
          "path": "/items",
          "description": "Fetch paginated items list",
          "params": [
            { "name": "page", "in": "query", "type": "integer", "required": false, "description": "Page number" }
          ],
          "headers": [],
          "body": { "schema": "", "example": "" },
          "responses": [
            { "status": 200, "description": "Success", "schema": "{ items: Item[], total: number }" }
          ],
          "errors": [
            { "code": 401, "message": "Unauthorized" }
          ]
        }
      ]
    }
  ]
}
```

Allowed HTTP methods: `GET` `POST` `PUT` `DELETE` `PATCH` `HEAD` `OPTIONS`
Allowed param locations (`in`): `query` `path` `header` `cookie`

---

### 4.7 `feature`

High-level user-facing features with cross-references. Store in `blueprint/features/`.

Frontmatter: `type`, `id`, `status`, `last_synced`

Section: `features`

```yaml
features:
  - id: user_authentication
    description: "Users can sign up, log in, reset password, and log out"
    user_types: "guest, user"
    flow: "Open app → See login screen → Enter credentials → Navigate to home"
    pages: "login_page, signup_page, forgot_password_page"
    components: "auth_form_component, social_login_component"
    models: "User"
    actions: "login_action, logout_action, signup_action"
    services: "auth_api"
    sub_features:
      - id: social_login
        description: "Sign in with Google or Apple"
        user_types: "guest"
        flow: "Tap social button → OAuth flow → Return to app → Navigate to home"
        pages: "login_page"
        components: "social_login_component"
        models: "User"
        actions: "social_login_action"
        services: "auth_api"
    sub_features: []
```

All reference fields (`pages`, `components`, `models`, `actions`, `services`) are **comma-separated IDs** matching the `id` frontmatter values of those files.

---

### 4.8 `composition` Section (JSON node tree)

Used inside `page` and `component` files. The section heading is `## composition` and the code block is ` ```json `.

```json
{
  "nodes": [
    {
      "node": "root",
      "nodeType": "layout",
      "layoutType": "column",
      "description": "Full-screen column layout",
      "dataSource": null,
      "triggers": [],
      "children": [
        {
          "node": "header",
          "nodeType": "element",
          "elementType": "text",
          "description": "Page title",
          "dataSource": { "type": "state", "ref": "state.title" },
          "triggers": [],
          "children": []
        },
        {
          "node": "items_list",
          "nodeType": "list",
          "listType": "list",
          "description": "Scrollable list of items",
          "dataSource": { "type": "api", "ref": "get_items" },
          "triggers": [
            { "event": "on_scroll", "action": "load_more_action" }
          ],
          "children": [
            {
              "node": "item_card",
              "nodeType": "component",
              "component": "item_card_component",
              "description": "Individual item row",
              "params": [
                { "key": "item", "value": "{item}" }
              ],
              "dataSource": null,
              "triggers": [
                { "event": "on_press", "action": "open_item_action" }
              ],
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Node types:**

| `nodeType` | Sub-type field | Allowed sub-types |
|---|---|---|
| `layout` | `layoutType` | `container` `row` `column` `stack` `scroll` `tabs` |
| `list` | `listType` | `list` `grid` `carousel` |
| `element` | `elementType` | `text` `button` `icon` `image` `input` `badge` `divider` |
| `card` | — | — |
| `group` | — | — |
| `component` | `component` | id of another component blueprint |
| `slot` | `slotName`, `slotContent` | — |

**`dataSource` object:**

| `type` | `ref` value |
|---|---|
| `api` | service endpoint `id` |
| `state` | `state.keyName` |
| `parameter` | param name |
| `function` | function blueprint `id` |
| `local_data` | inline description or literal |

**Common `triggers` events:** `on_press` `on_load` `on_change` `on_scroll` `on_submit` `on_focus` `on_blur` `on_appear` `on_long_press` `on_swipe`

Nodes that can have `children`: `layout`, `list`, `card`, `group`, `component`
Nodes that can have a `dataSource`: `layout`, `list`, `card`, `group`, `component`
Nodes that can have `triggers`: `layout`, `list`, `element`, `card`, `group`, `component`

---

### 4.9 `function`

Pure logic functions (transformers, validators, utilities). Store in `blueprint/functions/`.

Frontmatter: `type`, `id`, `status`

Sections: `inputs`, `outputs`, `logic`

```yaml
# inputs
inputs:
  - name: items
    type: Item[]
    default: []
  - name: query
    type: string
    default: ""

# outputs
outputs:
  - name: filtered
    type: Item[]

# logic
logic:
  description: "Filter items by name containing query string (case-insensitive). Return all items when query is empty."
```

---

### 4.10 `general`

Free-form documentation (changelogs, ADRs, onboarding notes). No fixed sections required.

---

## 5. Canonical File Structure

```
blueprint/
├── _app.md                  # type: config — app meta, environments, constants
├── _auth.md                 # type: config — auth provider and guards
├── _navigation.md           # type: config — routing, routes, nav_bar
├── _theme.md                # type: config — tokens, styled_elements, responsive
├── _changelog.md            # type: general — version history
├── data/
│   ├── models.md            # type: datamodel — all enums and models
│   ├── queries.md           # type: service   — all external API definitions
│   └── state.md             # type: config    — app_state, local_storage, state_management
├── features/
│   └── features.md          # type: feature   — all user-facing features
├── pages/
│   └── <page_id>.md         # type: page      — one file per screen
├── components/
│   └── <component_id>.md    # type: component — one file per reusable component
├── actions/
│   └── <action_id>.md       # type: action    — one file per action
└── functions/
    └── <function_id>.md     # type: function  — one file per utility function
```

---

## 6. Cross-referencing Rules

- Every blueprint has a globally unique `id` in its frontmatter.
- Reference another blueprint by its `id` string — never by file path.
- The following fields are recognized as references and build the dependency graph:
  - `composition` → `component` field (component node type)
  - `composition` → `dataSource.ref` (api → service id, function → function id)
  - `composition` → `triggers[].action` → action id
  - `page.lifecycle.*` → action id
  - `page/component.on_load` (frontmatter) → action id
  - `action.steps[].query` → service endpoint id (for api_call type)
  - `config.app.entry_page`, `config.app.login_page` → page id
  - `feature.features[].pages/components/models/actions/services` → respective ids

---

## 7. Status Lifecycle

Use statuses to reflect implementation progress:

| Status | Meaning |
|---|---|
| `draft` | Spec not yet reviewed |
| `approved` | Reviewed, ready to implement |
| `implementing` | Developer is actively building this |
| `implemented` | Code exists; `implements` path set |
| `deprecated` | No longer in use |

When writing a blueprint from an existing codebase, set `implemented` for things that clearly exist, `draft` for inferred/missing pieces.

---

## 8. Agent Workflow — Analysing an App and Writing a Blueprint

Follow these steps when given an app codebase to document:

### Step 1 — Understand the app
- Read `package.json` / `pubspec.yaml` / `build.gradle` to identify the framework, dependencies, and app name.
- Identify the entry point and routing setup.
- List all screens/pages, components, API calls, data models, and state management.

### Step 2 — Produce config files first
Write `_app.md`, `_auth.md`, `_navigation.md`, `_theme.md`, `data/state.md`. These establish the global context that other files reference.

### Step 3 — Write data files
Write `data/models.md` (enums + models extracted from types/interfaces/schemas) and `data/queries.md` (services extracted from API calls, axios/fetch instances, or REST client definitions).

### Step 4 — Write action files
One file per discrete user action or API interaction. Identify these from event handlers, thunks, mutations, or service calls.

### Step 5 — Write page files
One file per route/screen. Extract params from route definitions, local state from component state/hooks, lifecycle calls from `useEffect`/`componentDidMount`, and composition from the JSX/template tree.

### Step 6 — Write component files
One file per shared/reusable UI component. Extract props as `params`, local state, and composition.

### Step 7 — Write function files
One file per pure utility (formatters, validators, transformers).

### Step 8 — Write the features file
Synthesise user-facing features from the above files. Group related pages/components/actions/services under each feature.

### Step 9 — Write `_changelog.md`
Record what was created and the date. Status: `implemented`.

### Step 10 — Validate
- Every `id` must be unique across all files.
- Every cross-reference ID must resolve to a real file's `id`.
- Every section heading must match the schema for its type.
- Every code block must be valid YAML or JSON.
- No frontmatter key outside the allowed set for its type.

---

## 9. Quick-Reference: Section Field Types

| Type string | Meaning | Editor widget |
|---|---|---|
| `string` | Free text | text input |
| `boolean` | true/false | checkbox |
| `number` | Numeric value | number input |
| `integer` | Whole number | number input (step 1) |
| `date` | YYYY-MM-DD | date picker |
| `date-time` | ISO 8601 datetime | datetime-local picker |
| `any` | Untyped value | textarea |
| `object` | Nested YAML object | textarea |
| `string_list` | Comma-separated or YAML list | textarea |
| `action_list` | One or more action IDs | textarea |
| `enum:a\|b\|c` | Fixed choices | select dropdown |
| `ref:<type>` | Reference to another blueprint | select or text input |

---

## 10. Common Mistakes to Avoid

1. **Using spaces in section headings** — use `snake_case` always.
2. **Mixing YAML and JSON** — `composition` and `service.services` are JSON; everything else is YAML.
3. **Referencing non-existent IDs** — every referenced `id` must have a corresponding blueprint file.
4. **Duplicate IDs** — each blueprint's `id` must be globally unique within the blueprint set.
5. **Omitting the `---` frontmatter delimiters** — both opening and closing `---` are required.
6. **Putting non-YAML content inside ` ```yaml ` blocks** — use ` ```json ` for JSON, plain text for prose.
7. **Nesting sub-features deeper than one level** — sub-features cannot contain their own sub-features.
8. **Inventing frontmatter fields** — only use the fields defined in Section 3.
9. **Setting `status: implemented` without setting `implements`** — always pair them.
10. **Empty arrays as `""` instead of `[]`** — use proper YAML syntax for empty collections.

---

*This guide reflects the ABL schema as implemented in the ABL Editor (abl-editor). Keep this file updated when the schema changes.*
