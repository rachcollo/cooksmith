import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { selectNextReadyIssue } from '../../scripts/engineering/select-next-ready-issue.mjs'

const jiraConfig = {
  baseUrl: 'https://example.atlassian.net',
  email: 'bot@example.com',
  token: 'secret',
}
const githubConfig = { token: 'ghs_secret', owner: 'rachcollo', repo: 'cooksmith' }

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }
}

function mockFetch({
  pulls = [],
  branches = [],
  issues = [],
}: {
  pulls?: unknown[]
  branches?: unknown[]
  issues?: unknown[]
} = {}) {
  return vi.fn(async (url: string) => {
    if (url.includes('/pulls')) return jsonResponse(pulls)
    if (url.includes('/branches')) return jsonResponse(branches)
    if (url.includes('/search')) return jsonResponse({ issues })
    throw new Error(`Unexpected fetch: ${url}`)
  })
}

function issue(key: string, priority = 'Medium', links: unknown[] = []) {
  return {
    key,
    fields: { summary: `${key} summary`, priority: { name: priority }, issuelinks: links },
  }
}

function blockedBy(key: string, status: string) {
  return { type: { name: 'Blocks' }, outwardIssue: { key, fields: { status: { name: status } } } }
}

function withReadyPackageFixture(jiraKey: string, fn: (cwd: string) => void | Promise<void>) {
  const cwd = mkdtempSync(join(tmpdir(), 'cooksmith-selector-'))
  mkdirSync(join(cwd, 'engineering', 'ready'), { recursive: true })
  writeFileSync(
    join(cwd, 'engineering', 'ready', `${jiraKey.toLowerCase()}.md`),
    [
      `# Fixture for ${jiraKey}`,
      '## Metadata',
      `- **Jira issue:** \`${jiraKey}\``,
      '- **Status:** `Ready`',
      '## Functional Requirements',
      '- [ ] Real outcome one.',
      '- [ ] Real outcome two.',
      '- [ ] Real outcome three.',
    ].join('\n'),
  )
  return Promise.resolve(fn(cwd)).finally(() => rmSync(cwd, { recursive: true, force: true }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('selectNextReadyIssue', () => {
  it('reports busy and does not query Jira when a story PR is already open', async () => {
    const fetchMock = mockFetch({ pulls: [{ title: '[CS-21] M10A — Shopping List Foundation' }] })
    vi.stubGlobal('fetch', fetchMock)

    const result = await selectNextReadyIssue({ jiraConfig, githubConfig })

    expect(result).toEqual({ selected: null, reason: 'busy', busyWith: 'CS-21', evaluated: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not treat an open engineering-package PR as a build in flight', async () => {
    await withReadyPackageFixture('CS-57', async (cwd) => {
      const fetchMock = mockFetch({
        pulls: [{ title: 'chore(package): CS-58 — engineering package draft' }],
        issues: [issue('CS-57')],
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })

      expect(result.selected).toBe('CS-57')
    })
  })

  it('does not treat a package/ branch as a claim on the story', async () => {
    await withReadyPackageFixture('CS-59', async (cwd) => {
      const fetchMock = mockFetch({
        branches: [{ name: 'package/cs-59-engineering-package' }],
        issues: [issue('CS-59')],
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })

      expect(result.selected).toBe('CS-59')
    })
  })

  it('skips a candidate blocked by an unfinished issue', async () => {
    const fetchMock = mockFetch({
      issues: [issue('CS-50', 'Medium', [blockedBy('CS-49', 'In Progress')])],
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await selectNextReadyIssue({ jiraConfig, githubConfig })

    expect(result.selected).toBeNull()
    expect(result.reason).toBe('none-eligible')
    expect(result.evaluated[0]).toMatchObject({
      key: 'CS-50',
      eligible: false,
      reason: 'blocked by CS-49 (In Progress)',
    })
  })

  it('treats a "Blocks" link resolved to Done as not blocking', async () => {
    await withReadyPackageFixture('CS-51', async (cwd) => {
      const fetchMock = mockFetch({
        issues: [issue('CS-51', 'Medium', [blockedBy('CS-49', 'Done')])],
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })

      expect(result.selected).toBe('CS-51')
    })
  })

  it('skips a candidate that already has a branch', async () => {
    const fetchMock = mockFetch({
      branches: [{ name: 'feat/cs-52-already-claimed' }],
      issues: [issue('CS-52')],
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await selectNextReadyIssue({ jiraConfig, githubConfig })

    expect(result.selected).toBeNull()
    expect(result.evaluated[0]).toMatchObject({
      key: 'CS-52',
      eligible: false,
      reason: 'a branch already exists for this issue',
    })
  })

  it('skips a candidate whose package readiness fails', async () => {
    const fetchMock = mockFetch({ issues: [issue('CS-53')] })
    vi.stubGlobal('fetch', fetchMock)

    const result = await selectNextReadyIssue({ jiraConfig, githubConfig })

    expect(result.selected).toBeNull()
    expect(result.evaluated[0].eligible).toBe(false)
    expect(result.evaluated[0].reason).toContain('No engineering package')
  })

  it('selects the fully eligible candidate and reports its priority and summary', async () => {
    await withReadyPackageFixture('CS-54', async (cwd) => {
      const fetchMock = mockFetch({ issues: [issue('CS-54', 'High')] })
      vi.stubGlobal('fetch', fetchMock)

      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })

      expect(result.selected).toBe('CS-54')
      expect(result.priority).toBe('High')
      expect(result.summary).toBe('CS-54 summary')
    })
  })

  it('picks the higher-priority candidate over a lower-priority one that is also eligible', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'cooksmith-selector-'))
    mkdirSync(join(cwd, 'engineering', 'ready'), { recursive: true })
    for (const key of ['CS-55', 'CS-56']) {
      writeFileSync(
        join(cwd, 'engineering', 'ready', `${key.toLowerCase()}.md`),
        [
          `# Fixture for ${key}`,
          '## Metadata',
          `- **Jira issue:** \`${key}\``,
          '- **Status:** `Ready`',
          '## Functional Requirements',
          '- [ ] One.',
          '- [ ] Two.',
          '- [ ] Three.',
        ].join('\n'),
      )
    }
    try {
      // Jira returns them key-ascending (CS-55 first); High-priority CS-56
      // should still win over Medium-priority CS-55.
      const fetchMock = mockFetch({ issues: [issue('CS-55', 'Medium'), issue('CS-56', 'High')] })
      vi.stubGlobal('fetch', fetchMock)

      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })

      expect(result.selected).toBe('CS-56')
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })
})
