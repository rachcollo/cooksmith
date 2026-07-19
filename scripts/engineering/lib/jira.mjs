// Shared Jira Cloud REST v3 helpers. Requires JIRA_BASE_URL, JIRA_EMAIL and
// JIRA_API_TOKEN; readConfig returns null when any are missing so callers can
// skip cleanly instead of failing. Never logs secret values.

export function readConfig(env) {
  const baseUrl = env.JIRA_BASE_URL
  const email = env.JIRA_EMAIL
  const token = env.JIRA_API_TOKEN
  if (!baseUrl || !email || !token) return null
  return { baseUrl: baseUrl.replace(/\/$/, ''), email, token }
}

function authHeader(config) {
  const encoded = Buffer.from(`${config.email}:${config.token}`).toString('base64')
  return `Basic ${encoded}`
}

export async function jiraFetch(config, path, options = {}) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(config),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Jira request to ${path} failed: ${response.status} ${body.slice(0, 500)}`)
  }
  return response.status === 204 ? null : response.json()
}
