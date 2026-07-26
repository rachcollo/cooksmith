import { spawnSync } from 'node:child_process'

const BLOCKING_SEVERITIES = new Set(['high', 'critical'])
const ALLOWED_ADVISORIES = new Map([
  [
    'GHSA-qwww-vcr4-c8h2',
    'Cooksmith is a browser-only SPA and does not enable React Router RSC mode or server actions.',
  ],
])

function advisoryId(via) {
  return typeof via?.url === 'string' ? via.url.split('/').at(-1) : null
}

export function assessProductionAudit(report) {
  const vulnerabilities = Object.entries(report?.vulnerabilities ?? {}).filter(
    ([, vulnerability]) => BLOCKING_SEVERITIES.has(vulnerability.severity),
  )
  const acceptedPackages = new Set()
  let changed = true

  while (changed) {
    changed = false
    for (const [packageName, vulnerability] of vulnerabilities) {
      if (acceptedPackages.has(packageName)) continue
      const vias = vulnerability.via ?? []
      const directAdvisories = vias.filter((via) => typeof via === 'object')
      const transitivePackages = vias.filter((via) => typeof via === 'string')
      const directAccepted =
        directAdvisories.length > 0 &&
        directAdvisories.every((via) => ALLOWED_ADVISORIES.has(advisoryId(via)))
      const transitiveAccepted =
        transitivePackages.length === 0 ||
        transitivePackages.every((dependency) => acceptedPackages.has(dependency))

      if (directAccepted && transitiveAccepted) {
        acceptedPackages.add(packageName)
        changed = true
      } else if (
        directAdvisories.length === 0 &&
        transitivePackages.length > 0 &&
        transitiveAccepted
      ) {
        acceptedPackages.add(packageName)
        changed = true
      }
    }
  }

  const blocking = vulnerabilities.filter(([packageName]) => !acceptedPackages.has(packageName))
  return {
    blocking,
    accepted: vulnerabilities.filter(([packageName]) => acceptedPackages.has(packageName)),
  }
}

function run() {
  const audit = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], {
    encoding: 'utf8',
  })
  let report
  try {
    report = JSON.parse(audit.stdout)
  } catch {
    process.stderr.write(audit.stderr || audit.stdout || 'npm audit returned no JSON report.\n')
    process.exit(1)
  }

  const result = assessProductionAudit(report)
  if (result.blocking.length > 0) {
    process.stderr.write(`${audit.stdout}\n`)
    process.stderr.write(
      `Production dependency audit failed for: ${result.blocking.map(([name]) => name).join(', ')}.\n`,
    )
    process.exit(1)
  }

  if (result.accepted.length > 0) {
    process.stdout.write(
      `Production dependency audit passed with reviewed exception GHSA-qwww-vcr4-c8h2: ${ALLOWED_ADVISORIES.get('GHSA-qwww-vcr4-c8h2')}\n`,
    )
    return
  }

  process.stdout.write('Production dependency audit passed with no high or critical findings.\n')
}

if (import.meta.url === `file://${process.argv[1]}`) run()
