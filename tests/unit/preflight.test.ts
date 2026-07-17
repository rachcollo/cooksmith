import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  collectPreflight,
  environmentVariableNames,
  formatPreflight,
} from '../../scripts/preflight.mjs'

type CommandResult = { status: number; stdout: string; stderr?: string }

function runner(responses: Record<string, CommandResult>) {
  return (command: string, args: string[]) =>
    responses[[command, ...args].join(' ')] ?? { status: 0, stdout: '' }
}

const completeEnv = Object.fromEntries(
  environmentVariableNames.map((name: string) => [name, 'present']),
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

  it('accepts development without optional environment variables', () => {
    const checks = collectPreflight({
      env: {},
      argv: [],
      nodeVersion: '24.14.0',
      runner: runner({
        'npm --version': { status: 0, stdout: '11.9.0\n' },
        'git remote': { status: 0, stdout: 'origin\n' },
        'git branch --show-current': { status: 0, stdout: 'feature\n' },
        'npx supabase --version': { status: 0, stdout: '2.109.1\n' },
      }),
    })

    const output = formatPreflight(checks)
    expect(output.ok).toBe(true)
    expect(output.text).toContain('Environment variables are valid for development.')
  })

  it('loads preview configuration from .env.local without overriding shell values', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'cooksmith-preflight-'))
    writeFileSync(
      join(cwd, '.env.local'),
      [
        'VITE_APP_ENV=preview',
        'VITE_SUPABASE_URL=https://file.supabase.co',
        'VITE_SUPABASE_PUBLISHABLE_KEY=file-key',
        'COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS=production-ref',
      ].join('\n'),
    )

    try {
      const checks = collectPreflight({
        cwd,
        env: { VITE_SUPABASE_URL: 'https://shell.supabase.co' },
        argv: [],
        nodeVersion: '24.14.0',
        runner: runner({
          'npm --version': { status: 0, stdout: '11.9.0\n' },
          'git remote': { status: 0, stdout: 'origin\n' },
          'git branch --show-current': { status: 0, stdout: 'feature\n' },
          'npx supabase --version': { status: 0, stdout: '2.109.1\n' },
        }),
      })

      const output = formatPreflight(checks)
      expect(output.ok).toBe(true)
      expect(output.text).toContain('Environment variables are valid for preview.')
      expect(output.text).not.toContain('file-key')
      expect(output.text).not.toContain('shell.supabase.co')
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })

  it('requires preview configuration and rejects an incomplete Supabase pair', () => {
    const checks = collectPreflight({
      env: {
        VITE_APP_ENV: 'preview',
        VITE_SUPABASE_URL: 'https://example.supabase.co',
      },
      argv: [],
      nodeVersion: '24.14.0',
      runner: runner({
        'npm --version': { status: 0, stdout: '11.9.0\n' },
        'git remote': { status: 0, stdout: 'origin\n' },
        'git branch --show-current': { status: 0, stdout: 'feature\n' },
        'npx supabase --version': { status: 0, stdout: '2.109.1\n' },
      }),
    })

    const output = formatPreflight(checks)
    expect(output.ok).toBe(false)
    expect(output.text).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
    expect(output.text).toContain('COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS')
  })

  it('recognises the Chromium install location reported by Playwright', () => {
    const checks = collectPreflight({
      env: completeEnv,
      argv: ['--e2e'],
      nodeVersion: '24.14.0',
      runner: runner({
        'npm --version': { status: 0, stdout: '11.9.0\n' },
        'git remote': { status: 0, stdout: 'origin\n' },
        'git branch --show-current': { status: 0, stdout: 'feature\n' },
        'npx supabase --version': { status: 0, stdout: '2.109.1\n' },
        'npx playwright install --dry-run chromium': {
          status: 0,
          stdout: `browser: chromium version 149.0.7827.55\n  Install location: ${process.cwd()}\n`,
        },
      }),
    })

    expect(formatPreflight(checks).ok).toBe(true)
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
