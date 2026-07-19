import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assessPackageReadiness,
  formatReadinessReport,
} from '../../scripts/engineering/validate-package-readiness.mjs'

function withFixture(files: Record<string, string>, fn: (cwd: string) => void) {
  const cwd = mkdtempSync(join(tmpdir(), 'cooksmith-readiness-'))
  try {
    mkdirSync(join(cwd, 'engineering', 'ready'), { recursive: true })
    mkdirSync(join(cwd, 'docs', 'engineering', 'packages'), { recursive: true })
    for (const [path, content] of Object.entries(files)) {
      writeFileSync(join(cwd, path), content)
    }
    fn(cwd)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

const readyChecklistPackage = [
  '# M99 — Fixture',
  '',
  '## Metadata',
  '- **Jira issue:** `CS-40`',
  '- **Status:** `Ready`',
  '',
  '## Functional Requirements',
  '### FR-1 — Thing',
  '- [ ] Real testable outcome one.',
  '- [ ] Real testable outcome two.',
  '- [ ] Real testable outcome three.',
].join('\n')

describe('validate-package-readiness', () => {
  it('fails when no package exists for the key', () => {
    withFixture({}, (cwd) => {
      const result = formatReadinessReport(assessPackageReadiness({ jiraKey: 'CS-40', cwd }))
      expect(result.ok).toBe(false)
      expect(result.text).toContain('No engineering package')
    })
  })

  it('passes a fully filled-in checkbox-style package', () => {
    withFixture({ 'engineering/ready/cs-40.md': readyChecklistPackage }, (cwd) => {
      const result = formatReadinessReport(assessPackageReadiness({ jiraKey: 'CS-40', cwd }))
      expect(result.ok).toBe(true)
    })
  })

  it('passes a fully filled-in prose-bullet package under an Acceptance Criteria heading', () => {
    const packageContent = [
      '# Engineering Package — CS-41: Fixture',
      '',
      '**Status:** Ready for Build',
      '',
      '## Acceptance Criteria',
      '',
      'CS-41 is complete when:',
      '',
      '- outcome one happens;',
      '- outcome two happens;',
      '- outcome three happens.',
    ].join('\n')
    withFixture({ 'docs/engineering/packages/cs-41.md': packageContent }, (cwd) => {
      const result = formatReadinessReport(assessPackageReadiness({ jiraKey: 'CS-41', cwd }))
      expect(result.ok).toBe(true)
    })
  })

  it('fails when the template metadata placeholders were never filled in', () => {
    const packageContent = [
      '# Fixture',
      '## Metadata',
      '- **Jira issue:** `CS-42`',
      '- **Status:** `Ready`',
      '- **Milestone:** `[ID]`',
      '- **Title:** `[Title]`',
      '## Functional Requirements',
      '- [ ] Testable result.',
      '- [ ] Testable result.',
      '- [ ] Testable result.',
    ].join('\n')
    withFixture({ 'engineering/ready/cs-42.md': packageContent }, (cwd) => {
      const result = formatReadinessReport(assessPackageReadiness({ jiraKey: 'CS-42', cwd }))
      expect(result.ok).toBe(false)
      expect(result.text).toContain('unresolved template placeholders')
    })
  })

  it('fails when the package status is not a Ready state', () => {
    const packageContent = [
      '# Fixture',
      '## Metadata',
      '- **Jira issue:** `CS-43`',
      '- **Status:** `Planned`',
      '## Functional Requirements',
      '- [ ] Real outcome one.',
      '- [ ] Real outcome two.',
      '- [ ] Real outcome three.',
    ].join('\n')
    withFixture({ 'engineering/ready/cs-43.md': packageContent }, (cwd) => {
      const result = formatReadinessReport(assessPackageReadiness({ jiraKey: 'CS-43', cwd }))
      expect(result.ok).toBe(false)
      expect(result.text).toContain('not a Ready state')
    })
  })

  it('fails when there are too few acceptance-criteria items', () => {
    const packageContent = [
      '# Fixture',
      '## Metadata',
      '- **Jira issue:** `CS-44`',
      '- **Status:** `Ready`',
      '## Functional Requirements',
      '- [ ] Only one real outcome.',
    ].join('\n')
    withFixture({ 'engineering/ready/cs-44.md': packageContent }, (cwd) => {
      const result = formatReadinessReport(assessPackageReadiness({ jiraKey: 'CS-44', cwd }))
      expect(result.ok).toBe(false)
      expect(result.text).toContain('at least 3 are required')
    })
  })

  it('fails on a bare TODO left in the package', () => {
    const packageContent = [
      '# Fixture',
      '## Metadata',
      '- **Jira issue:** `CS-45`',
      '- **Status:** `Ready`',
      '## Functional Requirements',
      '- [ ] Real outcome one.',
      '- [ ] Real outcome two.',
      '- [ ] Real outcome three.',
      '',
      'TODO: fill in RLS notes.',
    ].join('\n')
    withFixture({ 'engineering/ready/cs-45.md': packageContent }, (cwd) => {
      const result = formatReadinessReport(assessPackageReadiness({ jiraKey: 'CS-45', cwd }))
      expect(result.ok).toBe(false)
      expect(result.text).toContain('unresolved template placeholders')
    })
  })
})
