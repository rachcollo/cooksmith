// Lightweight, low-false-positive complement to GitHub's native secret scanning
// (which must also be enabled in repository settings; see the operator guide).
// This check is intentionally narrow: forbidden tracked environment files, and a
// small set of high-confidence credential patterns.

import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const ALLOWED_ENV_FILENAME = '.env.example'
const ENV_FILENAME_PATTERN = /(^|\/)\.env(\..+)?$/
const MAX_SCANNED_BYTES = 500_000
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
])

const SECRET_PATTERNS = [
  { name: 'AWS access key ID', pattern: /AKIA[0-9A-Z]{16}/ },
  {
    name: 'private key block',
    pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  },
  {
    name: 'Supabase service-role key assignment',
    pattern: /(SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*=\s*[^\s#]+/,
  },
]

export function listTrackedFiles(cwd, runner = spawnSync) {
  const result = runner('git', ['ls-files'], { cwd, encoding: 'utf8' })
  if (result.status !== 0) return []
  return result.stdout.split('\n').filter(Boolean)
}

export function collectSecretChecks({ cwd = process.cwd(), trackedFiles } = {}) {
  const files = trackedFiles ?? listTrackedFiles(cwd)
  const checks = []

  const forbiddenEnvFiles = files.filter(
    (path) => ENV_FILENAME_PATTERN.test(path) && !path.endsWith(ALLOWED_ENV_FILENAME),
  )
  checks.push(
    forbiddenEnvFiles.length === 0
      ? { ok: true, message: 'No tracked environment files besides .env.example.' }
      : {
          ok: false,
          message: `Tracked environment file(s) must not be committed: ${forbiddenEnvFiles.join(', ')}.`,
        },
  )

  for (const path of files) {
    if (path.endsWith(ALLOWED_ENV_FILENAME)) continue
    const extension = path.slice(path.lastIndexOf('.')).toLowerCase()
    if (BINARY_EXTENSIONS.has(extension)) continue

    let content
    try {
      const fullPath = `${cwd}/${path}`
      if (statSync(fullPath).size > MAX_SCANNED_BYTES) continue
      content = readFileSync(fullPath, 'utf8')
    } catch {
      continue
    }

    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        checks.push({ ok: false, message: `Possible ${name} found in ${path}.` })
      }
    }
  }

  if (checks.length === 1) {
    checks.push({ ok: true, message: 'No high-confidence secret patterns found.' })
  }

  return checks
}

export function formatSecretReport(checks) {
  const ok = checks.every((check) => check.ok)
  const lines = checks.map((check) => `${check.ok ? '✓' : '✗'} ${check.message}`)
  return {
    ok,
    text: `Cooksmith secret and environment-file check ${ok ? 'passed' : 'failed'}:\n${lines.join('\n')}\n`,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = formatSecretReport(collectSecretChecks())
  ;(result.ok ? process.stdout : process.stderr).write(result.text)
  process.exit(result.ok ? 0 : 1)
}
