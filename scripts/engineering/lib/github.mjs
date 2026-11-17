// Minimal, read-only GitHub REST v3 helpers. Requires GITHUB_TOKEN and
// GITHUB_REPOSITORY ("owner/repo"); readConfig returns null when either is
// missing so callers can skip cleanly. Read-only: nothing here creates,
// merges or deletes anything in GitHub.

export function readConfig(env) {
  const token = env.GITHUB_TOKEN
  const repository = env.GITHUB_REPOSITORY
  if (!token || !repository || !repository.includes('/')) return null
  const [owner, repo] = repository.split('/')
  return { token, owner, repo }
}

async function githubFetch(config, path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`GitHub request to ${path} failed: ${response.status} ${body.slice(0, 500)}`)
  }
  return response.json()
}

// Exhaust pagination; an incomplete inventory must never permit admission.
async function listAll(config, path) {
  const result = []
  for (let page = 1; ; page += 1) {
    const batch = await githubFetch(config, `${path}&per_page=100&page=${page}`)
    if (!Array.isArray(batch)) throw new Error('Invalid GitHub inventory')
    result.push(...batch)
    if (batch.length < 100) return result
  }
}
export function listOpenPullRequests(config) {
  return listAll(config, `/repos/${config.owner}/${config.repo}/pulls?state=open`)
}
export function listBranches(config) {
  return listAll(config, `/repos/${config.owner}/${config.repo}/branches?`)
}
