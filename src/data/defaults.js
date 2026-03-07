const today = new Date().toISOString().split('T')[0]

export const DEFAULT_BLUEPRINT_FILES = [
  {
    path: 'blueprint/_app.md',
    content: `---
type: config
id: app_config
status: draft
---

# App Configuration

Main application configuration.

## app

\`\`\`yaml
app:
  name: ""
  version: "1.0.0"
  entry_page: ""
  login_page: ""
\`\`\`

## environments

\`\`\`yaml
environments: []
\`\`\`

## constants

\`\`\`yaml
constants: []
\`\`\``,
  },
  {
    path: 'blueprint/_auth.md',
    content: `---
type: config
id: auth_config
status: draft
---

# Auth Configuration

Authentication and authorization setup.

## auth

\`\`\`yaml
auth:
  provider: ""
  strategy: ""
  token:
    storage: ""
    refresh: false
    ttl: ""
  user_data:
    fields: []
    roles: []
  guards: []
\`\`\``,
  },
  {
    path: 'blueprint/_navigation.md',
    content: `---
type: config
id: navigation_config
status: draft
---

# Navigation

Routing and navigation structure.

## routing

\`\`\`yaml
routing:
  type: history
  base_path: /
\`\`\`

## routes

\`\`\`yaml
routes: []
\`\`\`

## nav_bar

\`\`\`yaml
nav_bar:
  position: bottom
  items: []
\`\`\``,
  },
  {
    path: 'blueprint/_theme.md',
    content: `---
type: config
id: theme_config
status: draft
---

# Theme & Style System

Design tokens and styled elements.

## tokens

\`\`\`yaml
tokens:
  colors:
    primary: ""
    surface: ""
    error: ""
  spacing:
    xs: 4
    sm: 8
    md: 16
    lg: 24
  typography: {}
  radius: {}
\`\`\`

## styled_elements

\`\`\`yaml
styled_elements: {}
\`\`\`

## responsive

\`\`\`yaml
responsive:
  breakpoints:
    mobile: 0
    tablet: 768
    desktop: 1024
\`\`\``,
  },
  {
    path: 'blueprint/data/models.md',
    content: `---
type: datamodel
id: data_models
status: draft
---

# Data Models

Data types, enums, and model definitions.

## enums

\`\`\`yaml
enums: []
\`\`\`

## models

\`\`\`yaml
models: []
\`\`\``,
  },
  {
    path: 'blueprint/data/queries.md',
    content: `---
type: service
id: data_queries
status: draft
---

# Data Queries & Services

API calls and database queries.

## queries

\`\`\`yaml
queries: []
\`\`\``,
  },
  {
    path: 'blueprint/data/state.md',
    content: `---
type: config
id: state_config
status: draft
---

# State Management

App state and local storage configuration.

## app_state

\`\`\`yaml
app_state: []
\`\`\`

## local_storage

\`\`\`yaml
local_storage:
  engine: ""
  collections: []
\`\`\`

## state_management

\`\`\`yaml
state_management:
  pattern: ""
\`\`\``,
  },
  {
    path: 'blueprint/features/features.md',
    content: `---
type: feature
id: app_features
status: draft
last_synced: ${today}
---

# App Features

High-level feature breakdown with sub-features and references.

## features

\`\`\`yaml
features: []
\`\`\``,
  },
  {
    path: 'blueprint/_changelog.md',
    content: `---
type: general
id: changelog
status: implemented
---

# Blueprint Changelog

## [1.0.0] - ${today}

- Initial blueprint scaffold created`,
  },
]
