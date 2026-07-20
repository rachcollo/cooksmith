import { parseArgs } from './lib/args.mjs'

// Public, unauthenticated smoke verification for a deployed Cooksmith environment.
// Deliberately shallow: it confirms the deployment is live and serving the
// expected build, not full application behaviour. Deep flows remain human or
// hosted end-to-end coverage, per the release checklist.

const EXPECTED_HEALTH_APPLICATION = 'cooksmith-v2'

async function checkHealth(baseUrl) {
  const url = `${baseUrl}/health.json`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { ok: false, message: `${url} returned HTTP ${response.status}.` }
    }
    const body = await response.json()
    if (body.application !== EXPECTED_HEALTH_APPLICATION || body.status !== 'ok') {
      return {
        ok: false,
        message: `${url} returned unexpected content: ${JSON.stringify(body)}.`,
      }
    }
    return { ok: true, message: `${url} reports ${body.application} status ${body.status}.` }
  } catch (error) {
    return { ok: false, message: `${url} was unreachable: ${error.message}` }
  }
}

async function checkRoot(baseUrl) {
  try {
    const response = await fetch(baseUrl)
    if (!response.ok) {
      return { ok: false, message: `${baseUrl} returned HTTP ${response.status}.` }
    }
    const body = await response.text()
    if (!body.includes('<div id="root">')) {
      return { ok: false, message: `${baseUrl} did not serve the expected application shell.` }
    }
    return { ok: true, message: `${baseUrl} served the application shell.` }
  } catch (error) {
    return { ok: false, message: `${baseUrl} was unreachable: ${error.message}` }
  }
}

// Reduce whatever the operator pastes (often a full browser URL, complete
// with an auth-redirect path and query string) to just the origin, since the
// checks below only ever hit the site root and /health.json. Falls back to a
// trailing-slash trim if the input is not a parseable URL.
function toOrigin(baseUrl) {
  try {
    return new URL(baseUrl).origin
  } catch {
    return baseUrl.replace(/\/$/, '')
  }
}

export async function verifyDeployment(baseUrl) {
  const normalised = toOrigin(baseUrl)
  const checks = [await checkHealth(normalised), await checkRoot(normalised)]
  return checks
}

export function formatVerification(checks) {
  const ok = checks.every((check) => check.ok)
  const lines = checks.map((check) => `${check.ok ? '✓' : '✗'} ${check.message}`)
  return {
    ok,
    text: `Cooksmith deployment verification ${ok ? 'passed' : 'failed'}:\n${lines.join('\n')}\n`,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = parseArgs(process.argv.slice(2))
  if (!url) {
    process.stderr.write('Usage: verify-deployment.mjs --url <deployed base URL>\n')
    process.exit(1)
  }
  const checks = await verifyDeployment(url)
  const result = formatVerification(checks)
  ;(result.ok ? process.stdout : process.stderr).write(result.text)
  process.exit(result.ok ? 0 : 1)
}
