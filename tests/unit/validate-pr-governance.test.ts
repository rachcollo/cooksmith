import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  collectGovernanceChecks,
  formatGovernanceReport,
} from '../../scripts/engineering/validate-pr-governance.mjs'

function withFixture(fn: (cwd: string) => void) {
  const cwd = mkdtempSync(join(tmpdir(), 'cooksmith-governance-'))
  try {
    mkdirSync(join(cwd, 'engineering', 'ready'), { recursive: true })
    mkdirSync(join(cwd, 'engineering', 'planned'), { recursive: true })
    mkdirSync(join(cwd, 'docs', 'engineering', 'packages'), { recursive: true })

    writeFileSync(
      join(cwd, 'engineering', 'ready', 'cs-18-package.md'),
      ['# M08B', '', '## Metadata', '- **Jira issue:** `CS-18`', '- **Depends on:** `CS-15`'].join(
        '\n',
      ),
    )
    writeFileSync(
      join(cwd, 'engineering', 'planned', 'cs-20-package.md'),
      [
        '# M08C',
        '',
        '## Metadata',
        '- **Jira issue:** `CS-20`',
        '- **Depends on:** `CS-18`, `CS-19`',
      ].join('\n'),
    )
    writeFileSync(
      join(cwd, 'docs', 'engineering', 'packages', 'cs27-package.md'),
      '# Engineering Package — CS-27: Multiline Recipe Authoring',
    )
    fn(cwd)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

describe('PR governance', () => {
  it('fails when the PR title has no Jira key', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({ prTitle: 'Fix a bug', branchName: 'fix/bug', cwd }),
      )
      expect(result.ok).toBe(false)
      expect(result.text).toContain('must contain a Jira key')
    })
  })

  it('exempts a "chore:" prefixed title from Jira, branch and package checks', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: 'chore: tidy up CI caching',
          branchName: 'chore/tidy-ci-caching',
          cwd,
        }),
      )
      expect(result.ok).toBe(true)
      expect(result.text).toContain('infrastructure changes')
    })
  })

  it('exempts a scoped "infra(ci):" prefixed title and still enforces base branch', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: 'infra(ci): add security scan job',
          branchName: 'infra/security-scan',
          baseBranch: 'develop',
          cwd,
        }),
      )
      expect(result.ok).toBe(false)
      expect(result.text).toContain('infrastructure changes')
      expect(result.text).toContain('must target main')
    })
  })

  it('still requires a migration declaration on an exempted infrastructure PR', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: 'chore: bump dependency',
          branchName: 'chore/bump-dependency',
          changedFiles: ['supabase/migrations/20260101000000_x.sql'],
          prBody: 'no mention',
          cwd,
        }),
      )
      expect(result.ok).toBe(false)
      expect(result.text).toContain('does not declare "Migrations in this PR: yes"')
    })
  })

  it('does not exempt a title that merely contains the word chore mid-sentence', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: 'Reduce the chore of manual testing',
          branchName: 'fix/manual-testing',
          cwd,
        }),
      )
      expect(result.ok).toBe(false)
      expect(result.text).toContain('must contain a Jira key')
    })
  })

  it('fails when the branch does not reference the same Jira key as the title', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({ prTitle: '[CS-18] thing', branchName: 'feat/cs-19-thing', cwd }),
      )
      expect(result.ok).toBe(false)
      expect(result.text).toContain('must reference the same Jira key')
    })
  })

  it('fails when no engineering package references the Jira key', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({ prTitle: 'CS-99: thing', branchName: 'feat/cs-99-thing', cwd }),
      )
      expect(result.ok).toBe(false)
      expect(result.text).toContain('No engineering package')
    })
  })

  it('finds the correct package and ignores dependency mentions of the same key elsewhere', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: '[CS-18] M08B — Meal Planner UX',
          branchName: 'feat/cs-18-meal-planner-drag-drop',
          cwd,
        }),
      )
      expect(result.ok).toBe(true)
      expect(result.text).toContain('cs-18-package.md')
    })
  })

  it('matches a package identified by its heading instead of a metadata field', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: 'CS-27: multiline recipe authoring',
          branchName: 'feat/cs-27-multiline',
          cwd,
        }),
      )
      expect(result.ok).toBe(true)
      expect(result.text).toContain('cs27-package.md')
    })
  })

  it('requires an explicit migration declaration when migration files changed', () => {
    withFixture((cwd) => {
      const failing = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: '[CS-18] thing',
          branchName: 'feat/cs-18-thing',
          changedFiles: ['supabase/migrations/20260101000000_x.sql'],
          prBody: 'no mention',
          cwd,
        }),
      )
      expect(failing.ok).toBe(false)
      expect(failing.text).toContain('does not declare "Migrations in this PR: yes"')

      const passing = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: '[CS-18] thing',
          branchName: 'feat/cs-18-thing',
          changedFiles: ['supabase/migrations/20260101000000_x.sql'],
          prBody: 'Migrations in this PR: yes',
          cwd,
        }),
      )
      expect(passing.ok).toBe(true)
    })
  })

  it('requires an explicit Edge Function declaration when function files changed', () => {
    withFixture((cwd) => {
      const failing = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: '[CS-18] thing',
          branchName: 'feat/cs-18-thing',
          changedFiles: ['supabase/functions/import-recipe/index.ts'],
          prBody: 'no mention',
          cwd,
        }),
      )
      expect(failing.ok).toBe(false)
      expect(failing.text).toContain('Edge Functions changed in this PR: yes')

      const passing = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: '[CS-18] thing',
          branchName: 'feat/cs-18-thing',
          changedFiles: ['supabase/functions/import-recipe/index.ts'],
          prBody: 'Edge Functions changed in this PR: yes',
          cwd,
        }),
      )
      expect(passing.ok).toBe(true)
    })
  })

  it('fails when the pull request does not target main', () => {
    withFixture((cwd) => {
      const result = formatGovernanceReport(
        collectGovernanceChecks({
          prTitle: '[CS-18] thing',
          branchName: 'feat/cs-18-thing',
          baseBranch: 'develop',
          cwd,
        }),
      )
      expect(result.ok).toBe(false)
      expect(result.text).toContain('must target main')
    })
  })
})
