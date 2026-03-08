import { useState, useEffect } from 'react'
import { fetchUser, fetchRepos, fetchBranches } from '../utils/github'

export function GHIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

export function relTime(iso) {
  if (!iso) return null
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}

// ── Auth view ──────────────────────────────────────────────────────────────────

function AuthView({ pat, onPat, error, loading, onConnect, onClose }) {
  return (
    <>
      <div className="gh-modal-header">
        <GHIcon size={16} />
        <span>Connect to GitHub</span>
        <button className="gh-modal-close" onClick={onClose}>×</button>
      </div>
      <div className="gh-modal-body">
        <p className="gh-hint">
          Authenticate with a Personal Access Token to pull and push blueprint files
          from any GitHub repository you have access to.
        </p>
        <div>
          <label>Personal Access Token</label>
          <input
            type="password"
            placeholder="ghp_…"
            value={pat}
            onChange={e => onPat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onConnect()}
            autoFocus
          />
        </div>
        {error && <div className="gh-error">{error}</div>}
        <a
          className="gh-token-link"
          href="https://github.com/settings/tokens/new?scopes=repo&description=ABL+Editor"
          target="_blank"
          rel="noopener noreferrer"
        >
          → Create a token with <code>repo</code> scope at github.com/settings/tokens
        </a>
        <p className="gh-hint" style={{ fontSize: 11 }}>
          Token is stored in your browser's localStorage and never sent anywhere except GitHub's API.
        </p>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={onConnect} disabled={!pat.trim() || loading}>
          {loading ? 'Connecting…' : 'Connect →'}
        </button>
      </div>
    </>
  )
}

// ── Repo selector view ─────────────────────────────────────────────────────────

function SelectView({ token, user, existingConfig, repos, reposLoading, reposErr, onConfigChange, onClose }) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(
    existingConfig?.repo
      ? { id: existingConfig.repo, full_name: `${existingConfig.owner}/${existingConfig.repo}`, name: existingConfig.repo, owner: { login: existingConfig.owner }, default_branch: existingConfig.branch }
      : null
  )
  const [branches, setBranches] = useState([])
  const [branch, setBranch] = useState(existingConfig?.branch || '')

  useEffect(() => {
    if (!picked || !token) return
    setBranches([])
    setBranch(picked.default_branch || 'main')
    fetchBranches(token, picked.owner.login, picked.name)
      .then(bs => setBranches(bs.map(b => b.name)))
      .catch(() => {})
  }, [picked, token])

  const filtered = repos.filter(r =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleConfirm = () => {
    if (!picked || !branch) return
    onConfigChange({
      token,
      user,
      owner: picked.owner.login,
      repo: picked.name,
      branch,
      lastPulled: existingConfig?.lastPulled || null,
      lastPushed: existingConfig?.lastPushed || null,
    })
  }

  return (
    <>
      <div className="gh-modal-header">
        <GHIcon size={16} />
        <span>Select Repository</span>
        {user && <span className="gh-user-badge">● {user.login}</span>}
        <button className="gh-modal-close" onClick={onClose}>×</button>
      </div>
      <div className="gh-modal-body">
        <input
          placeholder="Search repositories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="gh-repo-list">
          {reposLoading && <div className="gh-repo-hint">Loading repositories…</div>}
          {reposErr && <div className="gh-error">{reposErr}</div>}
          {!reposLoading && !reposErr && filtered.length === 0 && (
            <div className="gh-repo-hint">No repositories found</div>
          )}
          {!reposLoading && filtered.map(r => (
            <div
              key={r.id}
              className={`gh-repo-item${picked?.id === r.id ? ' gh-repo-picked' : ''}`}
              onClick={() => setPicked(r)}
            >
              <div className="gh-repo-name">{r.full_name}</div>
              <div className="gh-repo-meta">
                {r.private ? '🔒 private' : '○ public'}
                {r.language ? ` · ${r.language}` : ''}
                {' · updated '}
                {new Date(r.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
        {picked && (
          <div className="gh-branch-row">
            <label>Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)}>
              {branches.length > 0
                ? branches.map(b => <option key={b} value={b}>{b}</option>)
                : <option value={branch}>{branch || 'main'}</option>
              }
            </select>
          </div>
        )}
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={handleConfirm} disabled={!picked || !branch}>
          Confirm →
        </button>
      </div>
    </>
  )
}

// ── Sync view ──────────────────────────────────────────────────────────────────

function SyncView({ config, onPull, onPush, onChangeRepo, onDisconnect, onClose }) {
  const [pullBusy, setPullBusy] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushProgress, setPushProgress] = useState(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const busy = pullBusy || pushBusy

  const handlePull = async () => {
    setPullBusy(true); setErr(''); setOk('')
    try {
      await onPull()
      setOk('Pulled successfully — blueprint loaded from GitHub.')
    } catch (e) { setErr(e.message || 'Pull failed') }
    setPullBusy(false)
  }

  const handlePush = async () => {
    setPushBusy(true); setErr(''); setOk('')
    setPushProgress({ done: 0, total: 0 })
    try {
      await onPush((done, total) => setPushProgress({ done, total }))
      setOk('Pushed successfully — all files committed to GitHub.')
    } catch (e) { setErr(e.message || 'Push failed') }
    setPushBusy(false)
    setPushProgress(null)
  }

  const pulled = relTime(config.lastPulled)
  const pushed = relTime(config.lastPushed)

  return (
    <>
      <div className="gh-modal-header">
        <GHIcon size={16} />
        <span className="gh-connected-title">{config.owner}/{config.repo}</span>
        <button className="gh-modal-close" onClick={onClose}>×</button>
      </div>
      <div className="gh-modal-body">
        <div className="gh-sync-meta-block">
          <div className="gh-sync-meta-row">
            <span className="gh-meta-label">Branch</span>
            <span className="gh-meta-value">{config.branch}</span>
          </div>
          <div className="gh-sync-meta-row">
            <span className="gh-meta-label">Last pulled</span>
            <span className="gh-meta-value">{pulled || 'never'}</span>
          </div>
          <div className="gh-sync-meta-row">
            <span className="gh-meta-label">Last pushed</span>
            <span className="gh-meta-value">{pushed || 'never'}</span>
          </div>
        </div>

        <div className="gh-sync-actions">
          <button className="btn gh-pull-btn" onClick={handlePull} disabled={busy}>
            {pullBusy ? 'Pulling…' : '↓  Pull from GitHub'}
          </button>
          <button className="btn gh-push-btn" onClick={handlePush} disabled={busy}>
            {pushBusy
              ? pushProgress?.total > 0
                ? `↑  Pushing ${pushProgress.done} / ${pushProgress.total}…`
                : '↑  Preparing…'
              : '↑  Push to GitHub'
            }
          </button>
        </div>

        {err && <div className="gh-error">{err}</div>}
        {ok  && <div className="gh-ok">{ok}</div>}

        <p className="gh-hint" style={{ marginTop: 4 }}>
          Push commits all local blueprint files to <code>{config.branch}</code>.
          Pull replaces your local blueprint with the files from GitHub.
        </p>
      </div>
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={onChangeRepo}>Change Repo</button>
          <button className="btn sm danger" onClick={onDisconnect}>Disconnect</button>
        </div>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function GitHubModal({ config, onClose, onConfigChange, onPull, onPush }) {
  const initView = !config?.token ? 'auth' : !config?.repo ? 'select' : 'sync'
  const [view, setView] = useState(initView)

  // auth state
  const [pat, setPat] = useState('')
  const [authErr, setAuthErr] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // repos (fetched once when entering select view)
  const [repos, setRepos] = useState([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposErr, setReposErr] = useState('')

  useEffect(() => {
    if (view !== 'select' || !config?.token) return
    if (repos.length) return // already loaded
    setReposLoading(true)
    setReposErr('')
    fetchRepos(config.token)
      .then(r => { setRepos(r); setReposLoading(false) })
      .catch(e => { setReposErr(e.message || 'Failed to load repositories'); setReposLoading(false) })
  }, [view, config?.token])

  const handleConnect = async () => {
    setAuthLoading(true); setAuthErr('')
    try {
      const user = await fetchUser(pat.trim())
      onConfigChange({ token: pat.trim(), user: { login: user.login, avatar_url: user.avatar_url }, owner: user.login })
      setView('select')
    } catch (e) {
      setAuthErr(e.message || 'Invalid token or network error')
    }
    setAuthLoading(false)
  }

  const handleDisconnect = () => {
    onConfigChange(null)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal gh-modal" onClick={e => e.stopPropagation()}>
        {view === 'auth' && (
          <AuthView
            pat={pat} onPat={setPat}
            error={authErr} loading={authLoading}
            onConnect={handleConnect} onClose={onClose}
          />
        )}
        {view === 'select' && (
          <SelectView
            token={config?.token}
            user={config?.user}
            existingConfig={config}
            repos={repos}
            reposLoading={reposLoading}
            reposErr={reposErr}
            onConfigChange={(newCfg) => { onConfigChange(newCfg); setView('sync') }}
            onClose={onClose}
          />
        )}
        {view === 'sync' && (
          <SyncView
            config={config}
            onPull={onPull}
            onPush={onPush}
            onChangeRepo={() => setView('select')}
            onDisconnect={handleDisconnect}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
