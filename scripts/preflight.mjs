import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

export const requiredEnvironmentVariables = [
  'VITE_APP_ENV',
  'VITE_BUILD_COMMIT',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS',
]

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: 'utf8', ...options })
}

function checkVersion(name, actual, expected) {
  return actual === expected
    ? { ok: true, message: `${name} ${actual}` }
    : {
        ok: false,
        message: `${name} ${expected} is required. Found ${actual || 'unavailable'}. Install the pinned version before running repository checks.`,
      }
}

export function collectPreflight({
  env = process.env,
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  runner = run,
  nodeVersion = process.versions.node,
} = {}) {
  const checks = []
  const requireDatabase = argv.includes('--database') || argv.includes('--all')
  const requireE2e = argv.includes('--e2e') || argv.includes('--all')
  const expectedNode = pkg.engines.node
  const expectedNpm = pkg.engines.npm

  checks.push(checkVersion('Node.js', nodeVersion, expectedNode))

  const npm = runner('npm', ['--version'], { cwd })
  checks.push(checkVersion('npm', npm.status === 0 ? npm.stdout.trim() : '', expectedNpm))

  const missingEnv = requiredEnvironmentVariables.filter((name) => !env[name])
  checks.push(
    missingEnv.length === 0
      ? { ok: true, message: 'Required environment variable names are present.' }
      : {
          ok: false,
          message: `Missing environment variable names: ${missingEnv.join(', ')}. Add them to the relevant local shell, Codespaces secret or hosted environment without printing values.`,
        },
  )

  const remotes = runner('git', ['remote'], { cwd })
  checks.push(
    remotes.status === 0 && remotes.stdout.trim().length > 0
      ? {
          ok: true,
          message: `Git remote configured: ${remotes.stdout.trim().split(/\s+/).join(', ')}`,
        }
      : {
          ok: false,
          message:
            'No Git remote is configured. Add or restore the repository remote before claiming baseline, push or PR status.',
        },
  )

  const branch = runner('git', ['branch', '--show-current'], { cwd })
  const branchName = branch.status === 0 ? branch.stdout.trim() : ''
  checks.push(
    branchName && branchName !== 'main' && branchName !== 'v2'
      ? { ok: true, message: `Working branch: ${branchName}` }
      : {
          ok: false,
          message: branchName
            ? `Unexpected baseline branch ${branchName}. Create a scoped feature branch from the verified main baseline before editing.`
            : 'Detached HEAD or unreadable branch state. Check out a scoped feature branch from the verified main baseline before editing.',
        },
  )

  const supabase = runner('npx', ['supabase', '--version'], { cwd })
  checks.push(
    supabase.status === 0
      ? { ok: true, message: `Supabase CLI available: ${supabase.stdout.trim()}` }
      : {
          ok: false,
          message:
            'Supabase CLI is unavailable. Run `npm ci` and use repository npm scripts so the pinned local CLI is on PATH.',
        },
  )

  if (requireDatabase) {
    const docker = runner('docker', ['info', '--format', '{{.ServerVersion}}'], { cwd })
    checks.push(
      docker.status === 0
        ? { ok: true, message: `Docker daemon available: ${docker.stdout.trim()}` }
        : {
            ok: false,
            message:
              'Docker is required for database validation but is unavailable. Start Docker and verify `docker info`, then rerun `npm run db:validate`.',
          },
    )
  }

  if (requireE2e) {
    const chromium = runner('npx', ['playwright', 'install', '--dry-run', 'chromium'], { cwd })
    const browserPath = chromium.stdout.match(/browser:\s+([^\n]+)/)?.[1]?.trim()
    checks.push(
      browserPath && existsSync(browserPath)
        ? { ok: true, message: `Playwright Chromium available: ${browserPath}` }
        : {
            ok: false,
            message:
              'Playwright Chromium is not installed. Run `npm run test:e2e:install`; if the network blocks downloads, rely on CI and record the limitation.',
          },
    )
  }

  return checks
}

export function formatPreflight(checks) {
  const ok = checks.every((check) => check.ok)
  const lines = checks.map((check) => `${check.ok ? '✓' : '✗'} ${check.message}`)
  return {
    ok,
    text: `Cooksmith environment preflight ${ok ? 'passed' : 'failed'}:\n${lines.join('\n')}\n`,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = formatPreflight(collectPreflight())
  ;(result.ok ? process.stdout : process.stderr).write(result.text)
  process.exit(result.ok ? 0 : 1)
}
