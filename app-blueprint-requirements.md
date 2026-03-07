# App Blueprint Language (ABL) — Requirements Spec

> A declarative, stack-agnostic app definition language that serves as the **single source of truth** between human developers and coding agents. Written in Markdown + YAML. Lives alongside code in git.

---

## 1. Core Concept

The Blueprint is **not code** — it's a structured contract that:
- Defines what the app IS (structure, data, behavior, UI)
- Constrains what the agent CAN do (no deviation without approval)
- Mirrors the implemented code at all times
- Is the first thing an agent reads, and the last thing it updates

### Mental Model

```
User writes intent → Blueprint captures spec → Agent implements code → Blueprint stays in sync
                          ↑                                                    |
                          └────────── Agent proposes changes ←─────────────────┘
                                      User approves/rejects
```

### What It Is NOT
- Not a code generator (no compilation to runnable code)
- Not a visual builder export (human-authored, not drag-and-drop output)
- Not documentation (it's a live contract, not a reference doc)

---

## 2. Design Principles

1. **Human-first readability** — Markdown prose with YAML blocks for structured data
2. **Stack-agnostic** — Describes _what_, not _how_ (no framework-specific syntax)
3. **Incrementally adoptable** — Start with one file, expand as complexity grows
4. **Git-native** — Diffable, mergeable, reviewable in PRs
5. **Agent-parseable** — Consistent structure so agents can read/write reliably
6. **Bidirectional traceability** — Every blueprint block maps to code; every code module maps back

---

## 3. File Format

### Structure
Each blueprint file is Markdown with a YAML frontmatter header:

```markdown
---
type: page | component | service | datamodel | config | action
id: unique-identifier
status: draft | approved | implemented | deprecated
last_synced: 2026-03-07T00:00:00Z
implements: src/pages/Dashboard.tsx  # bidirectional code reference
---

# Dashboard Page

Human-readable description of what this is and why it exists.

## Parameters
```yaml
params:
  - name: projectId
    type: string
    required: true
    source: route
```

## Composition
...
```

### File Naming Convention
```
blueprint/
├── _app.md                  # App-level config (entry point)
├── _env.md                  # Environments & variables
├── _auth.md                 # Auth configuration
├── _navigation.md           # Nav structure & routing
├── _theme.md                # Style tokens & design system
```

### Blueprint Versioning

The blueprint is versioned as a single unit in `_app.md`:

```yaml
blueprint:
  version: "1.2.0"        # semver — one version for entire blueprint
  schema_version: "1"      # blueprint format version (for future migrations)
  last_updated: 2026-03-07

# version bumping rules:
# major: breaking structural changes (new required fields, removed sections)
# minor: new pages, components, actions, or data models added
# patch: notes, status changes, description edits
```

One app codebase = one blueprint. No separate versioning per file — the blueprint moves as a unit. Git history provides per-file change tracking.
├── data/
│   ├── models.md            # Data types & enums
│   ├── queries.md           # Data queries & services
│   └── state.md             # App state & local storage
├── pages/
│   ├── dashboard.md
│   ├── login.md
│   └── settings.md
├── components/
│   ├── property-card.md
│   └── map-viewer.md
├── actions/
│   ├── estimate-flow.md
│   └── auth-flow.md
└── _changelog.md            # Blueprint change history
```

---

## 4. App Definition Parameters

### 4.1 App Config (`_app.md`)

```yaml
app:
  name: string
  version: string
  entry_page: page_id
  login_page: page_id
  error_boundary: page_id | component_id

environments:
  - name: development | staging | production
    api_base: string
    feature_flags: [string]

constants:
  - name: string
    value: any
    description: string
```

### 4.2 Auth (`_auth.md`)

```yaml
auth:
  provider: supabase | firebase | custom | oauth2
  strategy: jwt | session | api_key
  token:
    storage: cookie | memory | local_storage
    refresh: boolean
    ttl: duration
  user_data:
    fields: [name, email, role, ...]
    roles: [admin, user, viewer, ...]
  guards:
    - route_pattern: /admin/*
      requires: [admin]
    - route_pattern: /app/*
      requires: [authenticated]
```

### 4.3 Data Types (`data/models.md`)

```yaml
enums:
  - id: difficulty_level
    values: [easy, average, difficult]

models:
  primary:
    - id: property
      fields:
        - name: id
          type: uuid
          primary: true
        - name: address
          type: string
          required: true
        - name: acreage
          type: float
        - name: services
          type: relation
          target: service_item
          cardinality: many
      indexes: [address]

  secondary:
    - id: audit_log
      fields: [...]
      ttl: 90d
```

### 4.4 Data Queries & Services (`data/queries.md`)

```yaml
queries:
  - id: get_properties_by_org
    source: database
    description: Fetch all properties for an org with service counts
    params: [org_id]
    returns: property[]
    cache: 5m

  - id: geocode_address
    source: api
    method: GET
    endpoint: /geocode
    params: [address]
    returns: { lat: float, lng: float }
    retry: { count: 3, backoff: exponential }
    error_handling: fallback_to_cache
```

### 4.5 State Management (`data/state.md`)

```yaml
app_state:
  - name: current_user
    type: user
    scope: global
    persist: session

  - name: selected_property
    type: property | null
    scope: global
    persist: none

local_storage:
  engine: indexeddb | sqlite | localStorage
  collections:
    - name: offline_audits
      model: audit
      sync_strategy: queue_on_reconnect
      max_size: 50mb

state_management:
  pattern: context | redux | zustand | signals
  # Agent decides implementation, but pattern is locked
```

### 4.6 Navigation (`_navigation.md`)

```yaml
routing:
  type: hash | history | file
  base_path: /app

routes:
  - path: /
    page: dashboard
    guard: authenticated
  - path: /property/:id
    page: property_detail
    params: [id]
  - path: /login
    page: login
    guard: guest_only

nav_bar:
  position: bottom | top | side
  items:
    - label: Dashboard
      icon: home
      route: /
    - label: Properties
      icon: map
      route: /properties
  behavior:
    hide_on: [login, onboarding]
    collapse_at: 768px

deep_linking:
  enabled: true
  prefix: siterecon://
```

### 4.7 Pages (`pages/*.md`)

Each page is its own blueprint file:

```yaml
---
type: page
id: property_detail
status: approved
implements: src/pages/PropertyDetail.tsx
---
```

```yaml
settings:
  title: "Property Detail"
  requires_auth: true
  scroll: vertical
  pull_to_refresh: true

params:
  - name: propertyId
    type: string
    source: route
    required: true

state:
  - name: activeTab
    type: enum[overview, services, history]
    default: overview
  - name: isEditing
    type: boolean
    default: false

lifecycle:
  on_enter:
    - action: fetch_property
      params: { id: $propertyId }
    - action: log_page_view
  on_leave:
    - action: save_draft_if_dirty
  on_focus:
    - action: refresh_property_data
```

### 4.8 Page Composition Tree

Composition defines **layout zones and key interactions only** — not individual buttons or elements. The agent fills in implementation details within each zone. Use `notes:` for responsive behavior and implementation hints.

```yaml
composition:
  - zone: header
    component: property_header
    props: { property: $property }
    notes: "Sticky on scroll. On mobile, collapse address to single line."

  - zone: tab_navigation
    component: tabs
    props: { active: $activeTab, options: [overview, services, history] }
    notes: "Scrollable tabs on mobile if > 3 items."

  - zone: tab_content
    conditional:
      - when: $activeTab == overview
        component: property_overview
      - when: $activeTab == services
        component: service_list
        props: { items: $property.services }
      - when: $activeTab == history
        component: audit_history
    notes: "Each tab lazy-loads on first switch."

  - zone: footer_actions
    visible_when: $isEditing
    actions: [save_property, cancel_edit]
    notes: "Fixed bottom bar on mobile. Inline button row on desktop."
```

**Granularity rule:** Zones define _what goes where_ and _what the key interactions are_. The agent decides the exact elements, spacing, and sub-layout within each zone. If specific UI behavior matters (sticky, collapsible, responsive breakpoint), capture it in `notes:`.

### 4.9 Components (`components/*.md`)

```yaml
---
type: component
id: property_card
status: implemented
implements: src/components/PropertyCard.tsx
---
```

```yaml
params:
  - name: property
    type: property
    required: true
  - name: onSelect
    type: callback
    signature: (id: string) => void

state:
  - name: isExpanded
    type: boolean
    default: false

composition:
  - zone: card_root
    on_click: $onSelect($property.id)
    style_token: card.elevated
    content: [thumbnail, address, acreage]
    notes: "Horizontal layout on tablet+. Vertical stack on mobile."

  - zone: expanded_detail
    visible_when: $isExpanded
    component: service_summary
    props: { services: $property.services }
    notes: "Slide-down animation. Lazy render."

responsive:
  notes: "Card is full-width on mobile, 1/2 on tablet, 1/3 on desktop grid."
```

### 4.10 Action Blocks (`actions/*.md`)

Actions are named, reusable behavior sequences:

```yaml
---
type: action
id: estimate_flow
status: approved
implements: src/actions/estimateFlow.ts
---
```

```yaml
description: Generate cost estimate for a property's services

triggers:
  - page: property_detail
    event: button_click
    element: generate_estimate_btn

steps:
  - id: validate
    type: guard
    condition: $property.services.length > 0
    on_fail:
      action: show_toast
      params: { message: "No services assigned", type: error }

  - id: fetch_rates
    type: api_call
    query: get_production_rates
    params: { service_ids: $property.services.map(s => s.id) }
    assign_to: $rates

  - id: calculate
    type: transform
    function: calculate_estimate
    input: { property: $property, rates: $rates }
    assign_to: $estimate

  - id: update_state
    type: state_update
    target: current_estimate
    value: $estimate

  - id: navigate
    type: navigation
    route: /estimate/$property.id
    params: { estimate: $estimate.id }

error_handling:
  default: show_error_toast
  retry:
    steps: [fetch_rates]
    max: 2
    backoff: exponential
```

### 4.11 Triggers & Interactions

Defined inline within page/component compositions or in action blocks:

```yaml
# Supported trigger types
triggers:
  lifecycle: [on_enter, on_leave, on_focus, on_blur, on_mount, on_destroy]
  user: [click, long_press, swipe, double_tap, hover, focus, blur]
  data: [on_change, on_error, on_success, on_loading]
  system: [on_connect, on_disconnect, on_resize, on_push_notification]
  timer: [interval, timeout, debounce, throttle]
```

### 4.12 Style System (`_theme.md`)

```yaml
tokens:
  colors:
    primary: "#2E75B6"
    surface: "#FFFFFF"
    error: "#D32F2F"
    # ...semantic tokens, not hex values in components
  spacing:
    xs: 4
    sm: 8
    md: 16
    lg: 24
    xl: 32
  typography:
    heading_lg: { size: 24, weight: bold, font: system }
    body: { size: 16, weight: regular, line_height: 1.5 }
    body_muted: { size: 14, weight: regular, color: $colors.text_secondary }
  radius:
    sm: 4
    md: 8
    card: 12

styled_elements:
  card.elevated:
    background: $colors.surface
    radius: $radius.card
    shadow: md
    padding: $spacing.md
  button.primary:
    background: $colors.primary
    color: white
    radius: $radius.sm
    padding: [$spacing.sm, $spacing.md]

responsive:
  breakpoints:
    mobile: 0        # default
    tablet: 768
    desktop: 1024
    wide: 1440
  notes: "All responsive behavior is specified in component/page notes: fields, not as separate blueprint configs."
```

### 4.13 Additional Concerns

```yaml
# In _app.md or separate files as needed

push_notifications:
  provider: firebase | apns | custom
  channels:
    - id: audit_updates
      title: "Audit Updates"
      default_enabled: true
  handlers:
    - channel: audit_updates
      action: navigate_to_audit

telemetry:
  provider: mixpanel | amplitude | posthog | custom
  events:
    - id: page_view
      auto: true
      properties: [page_id, timestamp]
    - id: estimate_generated
      properties: [property_id, total_amount, service_count]
  pii_scrub: true

error_handling:
  boundaries:
    - scope: page
      fallback: error_page
    - scope: component
      fallback: error_placeholder
  logging: sentry | custom
  retry_defaults:
    count: 3
    backoff: exponential

permissions:
  roles: [admin, manager, estimator, viewer]
  matrix:
    - resource: property
      admin: [create, read, update, delete]
      manager: [create, read, update]
      estimator: [read, update]
      viewer: [read]
    - resource: estimate
      admin: [create, read, update, delete, approve]
      manager: [create, read, update, approve]
      estimator: [create, read]

deployment:
  history:
    - version: 1.0.0
      date: 2026-03-01
      environment: production
      notes: "Initial release"
```

---

## 5. Agent Workflow Protocol

### 5.1 Read Phase
Agent MUST read the full blueprint before writing any code:
1. Parse `_app.md` for app context
2. Identify relevant page/component/action blueprints for the task
3. Check `status` fields — only `approved` items can be implemented

### 5.2 Propose Phase
When the task requires structural changes:
1. Agent drafts blueprint changes as a **diff** (not a full rewrite)
2. Presents changes to user with rationale
3. Uses comments (`<!-- TODO: ... -->`) for implementation notes

**Proposal format:**
```markdown
## Proposed Blueprint Change

**File:** `blueprint/pages/dashboard.md`
**Reason:** User requested real-time property count widget

### Addition to composition tree:
​```yaml
# After: tab_bar container
- component: live_counter
  props: { query: get_property_count, refresh: 30s }
​```

### New query needed in `data/queries.md`:
​```yaml
- id: get_property_count
  source: database
  returns: integer
  cache: 30s
​```

Approve? [Y/N]
```

### 5.3 Implement Phase
After approval:
1. Update blueprint file(s) with approved changes
2. Set `status: approved` → `status: implementing`
3. Write/modify code
4. Run tests
5. Set `status: implementing` → `status: implemented`
6. Update `last_synced` timestamp
7. Update `implements` path if new files created

### 5.4 Sync Validation
Agent should check for drift:
- Every blueprint block with `implements:` must point to existing code
- Every major code module should be referenced by a blueprint
- `last_synced` older than latest git commit on the file = stale

---

## 6. Comment & TODO Convention

Blueprint files use HTML comments for agent instructions:

```markdown
<!-- TODO: Implement offline sync for this query -->
<!-- NOTE: Production rates API has 100rpm limit -->
<!-- AGENT: Do not modify this section without user approval -->
<!-- DECISION: Chose indexeddb over sqlite for web compat (2026-03-05) -->
<!-- DEPRECATED: Moving to v2 endpoint by 2026-04-01 -->
```

---

## 7. Cross-Referencing

Blueprints reference each other by `id`:

```yaml
# In a page blueprint
component: property_card          # → components/property_card.md
action: estimate_flow             # → actions/estimate_flow.md
query: get_properties_by_org      # → data/queries.md#get_properties_by_org
model: property                   # → data/models.md#property
style_token: card.elevated        # → _theme.md#styled_elements.card.elevated
route: /property/:id              # → _navigation.md#routes
```

No special syntax needed — IDs are unique within their type namespace.

---

## 8. Resolved Design Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Composition granularity | **Layout zones + key interactions** with `notes:` for detail | Agent fills in element-level detail; blueprint stays readable |
| Multi-platform | **Single blueprint, one codebase** — responsive behavior in component `notes:` | No platform forks; responsive hints guide agent per breakpoint |
| Versioning | **Single semver for entire blueprint** in `_app.md` + schema version for format migrations | One app = one blueprint; git provides file-level history |
| Testing | **Not in standard blueprint** — optional testing extension layer | Keeps core blueprint lean; test specs added as a separate `blueprint/tests/` layer when needed |

---

## 9. Validation CLI

A lightweight tool that checks blueprint ↔ code sync. Designed for efficiency — runs fast, fails loud, integrates into CI.

### Commands

```bash
# Quick check: are all implements: paths valid?
abl check --links

# Full sync: do blueprint IDs match code exports?
abl check --sync

# Stale detection: blueprint files not updated since last code change
abl check --drift

# All checks
abl check
```

### What It Validates

```yaml
link_check:
  # Every `implements:` path in frontmatter points to an existing file
  # Every file referenced in blueprint exists in the codebase
  severity: error

id_uniqueness:
  # No duplicate IDs within a type namespace
  severity: error

cross_reference_check:
  # Every component/action/query/model ID referenced in compositions exists
  severity: error

drift_detection:
  # Compare last_synced timestamps against git log for implements: files
  # Flag blueprints where code changed after last blueprint update
  severity: warning

orphan_detection:
  # Code files in key directories (pages/, components/, actions/) not referenced by any blueprint
  severity: info

schema_validation:
  # Required fields present in frontmatter (type, id, status)
  # Valid status values
  # Valid YAML syntax in code blocks
  severity: error
```

### Efficiency Principles
- **Incremental by default** — only check files changed since last run (git diff based)
- **No code parsing** — checks file existence and blueprint structure, not code ASTs
- **Fast fail** — errors stop the run, warnings/info collected and reported at end
- **CI-friendly** — exit code 0 (pass), 1 (errors), 2 (warnings only)

---

## 10. Testing Extension (Optional Layer)

Testing specs are **not part of the standard blueprint**. When needed, they're added as a parallel layer:

```
blueprint/
├── pages/
│   └── dashboard.md           # standard blueprint
├── tests/                     # optional testing extension
│   ├── _test-config.md        # test framework, coverage targets
│   ├── pages/
│   │   └── dashboard.test.md  # test spec for dashboard
│   └── actions/
│       └── estimate-flow.test.md
```

### Test Blueprint Format

```yaml
---
type: test
id: test_property_detail
tests_for: property_detail       # links to standard blueprint ID
status: approved
implements: src/__tests__/PropertyDetail.test.tsx
---
```

```yaml
scenarios:
  - id: loads_property_data
    type: integration
    given: "User navigates to /property/123"
    then: "Property header shows address and acreage"
    priority: critical

  - id: tab_switching
    type: interaction
    given: "User is on overview tab"
    when: "User clicks services tab"
    then: "Service list renders with correct items"
    priority: high

  - id: empty_services_guard
    type: edge_case
    given: "Property has no services assigned"
    when: "User clicks generate estimate"
    then: "Error toast shown, no navigation"
    priority: medium

coverage_target: 80%
```

The agent reads test blueprints only when working on test-related tasks. Standard development workflow ignores `blueprint/tests/` entirely.

---

## 11. What This Enables

1. **Agent guardrails** — Agent can't add pages, change routes, or modify data models without blueprint approval
2. **Onboarding** — New developer (or new agent session) reads blueprint to understand entire app
3. **Drift detection** — Automated checks that code matches blueprint
4. **Change tracking** — Blueprint changelog shows architectural decisions over time
5. **Multi-agent coordination** — Different agents work on different blueprint files without conflicts
6. **Estimation** — Blueprint complexity → rough effort estimates
