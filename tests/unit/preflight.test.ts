import { describe, expect, it } from 'vitest'

import {
  collectPreflight,
  formatPreflight,
  requiredEnvironmentVariables,
} from '../../scripts/preflight.mjs'

type CommandResult = { status: number; stdout: string; stderr?: string }

function runner(responses: Record<string, CommandResult>) {
  return (command: string, args: string[]) =>
    responses[[command, ...args].join(' ')] ?? { status: 0, stdout: '' }
}

const completeEnv = Object.fromEntries(
  requiredEnvironmentVariables.map((name: string) => [name, 'present']),
)

describe('environment preflight', () => {
  it('passes with pinned tools, a remote, a feature branch and optional runtime checks', () => {
    const checks = collectPreflight({
      env: completeEnv,
      argv: [],
      nodeVersion: '24.14.0',
      runner: runner({
        'npm --version': { status: 0, stdout: '11.9.0\n' },
        'git remote': { status: 0, stdout: 'origin\n' },
        'git branch --show-current': { status: 0, stdout: 'e01-ci-preview-release-hardening\n' },
        'npx supabase --version': { status: 0, stdout: '2.109.1\n' },
      }),
    })

    expect(formatPreflight(checks).ok).toBe(true)
  })

  it('reports wrong Node and npm versions with actionable messages', () => {
    const checks = collectPreflight({
      env: completeEnv,
      argv: [],
      nodeVersion: '22.0.0',
      runner: runner({
        'npm --version': { status: 0, stdout: '10.0.0\n' },
        'git remote': { status: 0, stdout: 'origin\n' },
        'git branch --show-current': { status: 0, stdout: 'feature\n' },
        'npx supabase --version': { status: 0, stdout: '2.109.1\n' },
      }),
    })

    const output = formatPreflight(checks)
    expect(output.ok).toBe(false)
    expect(output.text).toContain('Node.js 24.14.0 is required. Found 22.0.0.')
    expect(output.text).toContain('npm 11.9.0 is required. Found 10.0.0.')
  })

  it('accepts GitHub Actions pull request refs when checkout is detached', () => {
    const checks = collectPreflight({
      env: {
        ...completeEnv,
        GITHUB_ACTIONS: 'true',
        GITHUB_HEAD_REF: 'e01-ci-preview-release-hardening',
      },
      argv: [],
      nodeVersion: '24.14.0',
      runner: runner({
        'npm --version': { status: 0, stdout: '11.9.0\n' },
        'git remote': { status: 0, stdout: 'origin\n' },
        'git branch --show-current': { status: 0, stdout: '' },
        'npx supabase --version': { status: 0, stdout: '2.109.1\n' },
      }),
    })

    const output = formatPreflight(checks)
    expect(output.ok).toBe(true)
    expect(output.text).toContain('GitHub Actions ref: e01-ci-preview-release-hardening')
  })

  it('reports missing Docker and missing remote without ambiguity', () => {
    const checks = collectPreflight({
      env: completeEnv,
      argv: ['--database'],
      nodeVersion: '24.14.0',
      runner: runner({
        'npm --version': { status: 0, stdout: '11.9.0\n' },
        'git remote': { status: 0, stdout: '' },
        'git branch --show-current': { status: 0, stdout: 'feature\n' },
        'npx supabase --version': { status: 0, stdout: '2.109.1\n' },
        'docker info --format {{.ServerVersion}}': { status: 1, stdout: '' },
      }),
    })

    const output = formatPreflight(checks)
    expect(output.ok).toBe(false)
    expect(output.text).toContain('No Git remote is configured.')
    expect(output.text).toContain('Docker is required for database validation but is unavailable.')
  })
})
