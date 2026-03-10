export const BLUEPRINT_SCHEMA = {
  page: {
    frontmatter: ['type', 'id', 'status', 'on_load', 'last_synced', 'implements'],
    sections: ['settings', 'params', 'state', 'lifecycle', 'composition'],
    fieldTypes: {
      settings: { title: 'string', requires_auth: 'boolean', scroll: 'enum:vertical|horizontal|none', pull_to_refresh: 'boolean' },
      params: { _array: true, name: 'string', type: 'string', source: 'enum:route|query|prop|state', required: 'boolean', default: 'any' },
      state: { _array: true, name: 'string', type: 'string', default: 'any' },
      lifecycle: { on_enter: 'action_list', on_leave: 'action_list', on_focus: 'action_list' },
      composition: { _array: true, zone: 'string', component: 'string', props: 'object', notes: 'string', visible_when: 'string' },
    },
  },
  component: {
    frontmatter: ['type', 'id', 'status', 'on_load', 'last_synced', 'implements'],
    sections: ['params', 'state', 'lifecycle', 'composition', 'responsive'],
    fieldTypes: {
      params: { _array: true, name: 'string', type: 'string', required: 'boolean', default: 'any' },
      state: { _array: true, name: 'string', type: 'string', default: 'any' },
      lifecycle: { on_mount: 'action_list', on_unmount: 'action_list', on_update: 'action_list' },
      composition: { _array: true, zone: 'string', component: 'string', style_token: 'string', notes: 'string' },
      responsive: { notes: 'string' },
    },
  },
  action: {
    frontmatter: ['type', 'id', 'status', 'scope', 'last_synced', 'implements'],
    sections: ['steps', 'error_handling'],
    fieldTypes: {
      steps: { _array: true, id: 'string', type: 'enum:guard|api_call|transform|state_update|navigation', description: 'string', ref: 'string' },
      error_handling: { default: 'string', retry: 'object' },
    },
  },
  datamodel: {
    frontmatter: ['type', 'id', 'status'],
    sections: ['enums', 'models'],
    fieldTypes: {
      enums: { _array: true, id: 'string', values: 'string_list' },
      models: { _array: true, id: 'string', description: 'string', fields: 'object' },
    },
  },
  config: {
    frontmatter: ['type', 'id', 'status'],
    sections: ['app', 'environments', 'constants'],
    fieldTypes: {
      app: { name: 'string', version: 'string', entry_page: 'ref:page', login_page: 'ref:page' },
      environments: { _array: true, name: 'string', api_base: 'string', feature_flags: 'string_list' },
    },
  },
  service: {
    frontmatter: ['type', 'id', 'status'],
    sections: ['services'],
    fieldTypes: {},
  },
  feature: {
    frontmatter: ['type', 'id', 'status', 'last_synced'],
    sections: ['features'],
    fieldTypes: {
      features: { _array: true, id: 'string', description: 'string', user_types: 'string', flow: 'string', pages: 'string', components: 'string', models: 'string', actions: 'string', services: 'string' },
    },
  },
  // eslint-disable-next-line no-dupe-keys
  function: {
    frontmatter: ['type', 'id', 'status'],
    sections: ['inputs', 'outputs', 'logic'],
    fieldTypes: {
      inputs:  { _array: true, name: 'string', type: 'string', default: 'any' },
      outputs: { _array: true, name: 'string', type: 'string' },
      logic:   { description: 'string' },
    },
  },
  general: {
    frontmatter: ['type', 'id', 'status'],
    sections: [],
    fieldTypes: {},
  },
}

export const STATUS_OPTIONS = ['draft', 'approved', 'implementing', 'implemented', 'deprecated']

export const SCOPE_OPTIONS = ['global', 'page', 'component']

export const STATUS_COLORS = {
  draft: '#6B7280',
  approved: '#3B82F6',
  implementing: '#F59E0B',
  implemented: '#10B981',
  deprecated: '#EF4444',
}

export const TYPE_COLORS = {
  config:    { bg: '#1a2332', border: '#2a4a6b', text: '#7cb3e0' },
  page:      { bg: '#1a2a1a', border: '#2a5a2a', text: '#7cd07c' },
  component: { bg: '#2a1a2a', border: '#5a2a5a', text: '#d07cd0' },
  action:    { bg: '#2a2a1a', border: '#5a5a2a', text: '#d0d07c' },
  service:   { bg: '#1a2a2a', border: '#2a5a5a', text: '#7cd0d0' },
  datamodel: { bg: '#2a1a1a', border: '#5a2a2a', text: '#d09a7c' },
  feature:   { bg: '#1a2028', border: '#2a4a5a', text: '#7cc8d0' },
  function:  { bg: '#1a2820', border: '#2a5040', text: '#7cccc0' },
  general:   { bg: '#1C1F2E', border: '#2A2D42', text: '#8B8FA7' },
}

export const FOLDER_OPTIONS = [
  'blueprint',
  'blueprint/pages',
  'blueprint/components',
  'blueprint/actions',
  'blueprint/services',
  'blueprint/data',
  'blueprint/features',
  'blueprint/functions',
]

export const DEFAULT_BLUEPRINT_FILES = [
  {
    path: 'blueprint/_app.md',
    content: "---\ntype: config\nid: app_config\nstatus: draft\n---\n\n# App Configuration\n\nMain application configuration.\n\n## app\n\n```yaml\napp:\n  name: \"\"\n  version: \"1.0.0\"\n  entry_page: \"\"\n  login_page: \"\"\n```\n\n## environments\n\n```yaml\nenvironments: []\n```\n\n## constants\n\n```yaml\nconstants: []\n```",
  },
  {
    path: 'blueprint/_auth.md',
    content: "---\ntype: config\nid: auth_config\nstatus: draft\n---\n\n# Auth Configuration\n\nAuthentication and authorization setup.\n\n## auth\n\n```yaml\nauth:\n  provider: \"\"\n  strategy: \"\"\n  token:\n    storage: \"\"\n    refresh: false\n    ttl: \"\"\n  user_data:\n    fields: []\n    roles: []\n  guards: []\n```",
  },
  {
    path: 'blueprint/_navigation.md',
    content: "---\ntype: config\nid: navigation_config\nstatus: draft\n---\n\n# Navigation\n\nRouting and navigation structure.\n\n## routing\n\n```yaml\nrouting:\n  type: history\n  base_path: /\n```\n\n## routes\n\n```yaml\nroutes: []\n```\n\n## nav_bar\n\n```yaml\nnav_bar:\n  position: bottom\n  items: []\n```",
  },
  {
    path: 'blueprint/_theme.md',
    content: "---\ntype: config\nid: theme_config\nstatus: draft\n---\n\n# Theme & Style System\n\nDesign tokens and styled elements.\n\n## tokens\n\n```yaml\ntokens:\n  colors:\n    primary: \"\"\n    surface: \"\"\n    error: \"\"\n  spacing:\n    xs: 4\n    sm: 8\n    md: 16\n    lg: 24\n  typography: {}\n  radius: {}\n```\n\n## styled_elements\n\n```yaml\nstyled_elements: {}\n```\n\n## responsive\n\n```yaml\nresponsive:\n  breakpoints:\n    mobile: 0\n    tablet: 768\n    desktop: 1024\n```",
  },
  {
    path: 'blueprint/data/models.md',
    content: "---\ntype: datamodel\nid: data_models\nstatus: draft\n---\n\n# Data Models\n\nData types, enums, and model definitions.\n\n## enums\n\n```yaml\nenums: []\n```\n\n## models\n\n```yaml\nmodels: []\n```",
  },
  {
    path: 'blueprint/data/queries.md',
    content: "---\ntype: service\nid: data_queries\nstatus: draft\n---\n\n# Data Queries & Services\n\nAPI calls and database queries.\n\n## services\n\n```json\n{\"services\":[]}\n```",
  },
  {
    path: 'blueprint/data/state.md',
    content: "---\ntype: config\nid: state_config\nstatus: draft\n---\n\n# State Management\n\nApp-wide state definitions and storage configuration.\n\n## app_state\n\n```yaml\napp_state: []\n```\n\n## local_storage\n\n```yaml\nlocal_storage:\n  engine: \"\"\n  collections: []\n```\n\n## state_management\n\n```yaml\nstate_management:\n  pattern: \"\"\n```",
  },
  {
    path: 'blueprint/_changelog.md',
    content: "---\ntype: general\nid: changelog\nstatus: implemented\n---\n\n# Blueprint Changelog\n\n## [1.0.0] - 2026-03-07\n\n- Initial blueprint scaffold created",
  },
];
