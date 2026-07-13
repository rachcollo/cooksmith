import { spawnSync } from 'node:child_process'

const expectedNode = '24.14.0'
const expectedNpm = '11.9.0'

export function checkCommand(command, args = []) {
  return spawnSync(command, args, { encoding: 'utf8' })
}

export function validateToolVersions({ nodeVersion, npmVersion }) {
  const problems = []

  if (nodeVersion !== expectedNode) {
    problems.push(`Node.js ${expectedNode} is required. Found ${nodeVersion}.`)
  }

  if (npmVersion !== expectedNpm) {
    problems.push(`npm ${expectedNpm} is required. Found ${npmVersion}.`)
  }

  return problems
}

const npmResult = checkCommand('npm', ['--version'])
const npmVersion = npmResult.status === 0 ? npmResult.stdout.trim() : 'unavailable'
const problems = validateToolVersions({
  nodeVersion: process.versions.node,
  npmVersion,
})

if (process.argv.includes('--runtime')) {
  const dockerResult = checkCommand('docker', ['info', '--format', '{{.ServerVersion}}'])

  if (dockerResult.status !== 0) {
    problems.push(
      'A running Docker-compatible runtime is required for local Supabase. Install or start Docker, then run `docker info` before retrying.',
    )
  }
}

if (problems.length > 0) {
  process.stderr.write(
    `Cooksmith database prerequisites are not ready:\n- ${problems.join('\n- ')}\n`,
  )
  process.exit(1)
}

process.stdout.write('Cooksmith database prerequisites are ready.\n')
