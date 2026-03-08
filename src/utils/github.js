const BASE = 'https://api.github.com'

async function ghFetch(token, path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || 'GitHub API error ' + res.status)
  }
  return res.json()
}

export async function fetchUser(token) {
  return ghFetch(token, '/user')
}

export async function fetchRepos(token) {
  return ghFetch(token, '/user/repos?per_page=100&sort=updated&type=all')
}

export async function fetchBranches(token, owner, repo) {
  return ghFetch(token, `/repos/${owner}/${repo}/branches?per_page=100`)
}

// Returns array of { path, sha } for every .md file under blueprint/
export async function fetchBlueprintTree(token, owner, repo, branch) {
  const br = await ghFetch(token, `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`)
  const treeSha = br.commit.commit.tree.sha
  const tree = await ghFetch(token, `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`)
  return (tree.tree || []).filter(
    item => item.type === 'blob' && item.path.startsWith('blueprint/') && item.path.endsWith('.md')
  )
}

// Decode base64 content with UTF-8 support
export async function fetchFileContent(token, owner, repo, path, ref) {
  const data = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`)
  const bin = atob(data.content.replace(/\s/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { content: new TextDecoder().decode(bytes), sha: data.sha }
}

// Create or update a file in a specific branch
export async function upsertFile(token, owner, repo, path, content, message, sha, branch) {
  const bytes = new TextEncoder().encode(content)
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  const encoded = btoa(bin)
  return ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: encoded, branch, ...(sha ? { sha } : {}) }),
  })
}
