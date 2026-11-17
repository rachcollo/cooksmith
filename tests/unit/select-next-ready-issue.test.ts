import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  resolveMaxParallelBuilds,
  selectNextReadyIssue,
} from '../../scripts/engineering/select-next-ready-issue.mjs'

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
    fields: {
      summary: `${key} summary`,
      priority: { name: priority },
      status: { name: 'Ready' },
      labels: ['codex-ready'],
      issuelinks: links,
    },
  }
}

function blockedBy(key: string, status: string) {
  return {
    type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
    inwardIssue: { key, fields: { status: { name: status } } },
  }
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
  it('allows CS-111 while its downstream CS-122 is unfinished', async () => {
    await withReadyPackageFixture('CS-111', async (cwd) => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          issues: [
            issue('CS-111', 'High', [
              {
                type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
                outwardIssue: { key: 'CS-122', fields: { status: { name: 'Backlog' } } },
              },
            ]),
          ],
        }),
      )
      expect((await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })).selected).toBe(
        'CS-111',
      )
    })
  })
  it('blocks CS-122 until upstream CS-111 is Done', async () => {
    await withReadyPackageFixture('CS-122', async (cwd) => {
      vi.stubGlobal(
        'fetch',
        mockFetch({ issues: [issue('CS-122', 'High', [blockedBy('CS-111', 'Ready')])] }),
      )
      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })
      expect(result.selected).toBeNull()
      expect(result.evaluated[0].reason).toContain('CS-111 (Ready)')
    })
  })
  it.each([
    ['In Progress', 'Done', false],
    ['Done', 'In Progress', false],
    ['Done', 'Done', true],
  ])('CS-116 requires both CS-79 (%s) and CS-101 (%s) complete', async (first, second, allowed) => {
    await withReadyPackageFixture('CS-116', async (cwd) => {
      vi.stubGlobal(
        'fetch',
        mockFetch({
          issues: [
            issue('CS-116', 'High', [
              blockedBy('CS-79', String(first)),
              blockedBy('CS-101', String(second)),
            ]),
          ],
        }),
      )
      expect((await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })).selected).toBe(
        allowed ? 'CS-116' : null,
      )
    })
  })
  it.each([
    { type: { name: 'Blocks' }, inwardIssue: { key: 'CS-111' } },
    {
      type: { name: 'Blocks', inward: 'blocks', outward: 'is blocked by' },
      inwardIssue: { key: 'CS-111' },
    },
    {
      type: { name: 'Custom', inward: 'requires', outward: 'enables' },
      outwardIssue: { key: 'CS-111' },
    },
    {
      type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
      inwardIssue: { key: 'CS-111' },
      outwardIssue: { key: 'CS-123' },
    },
    { type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' } },
  ])('fails closed on ambiguous link %#', async (link) => {
    await withReadyPackageFixture('CS-122', async (cwd) => {
      vi.stubGlobal('fetch', mockFetch({ issues: [issue('CS-122', 'High', [link])] }))
      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })
      expect(result.selected).toBeNull()
      expect(result.evaluated[0].reason).toContain('ambiguous Jira dependency link')
    })
  })
  it('reports busy and does not query Jira when the parallel build limit is reached', async () => {
    const fetchMock = mockFetch({
      pulls: [
        { title: '[CS-21] M10A — Shopping List Foundation' },
        { title: 'CS-22: Generate shopping list' },
        { title: 'CS-23: Pantry reconciliation' },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await selectNextReadyIssue({ jiraConfig, githubConfig })

    expect(result).toEqual({
      selected: null,
      reason: 'busy',
      busyWith: 'CS-21',
      inFlight: ['CS-21', 'CS-22', 'CS-23'],
      maxParallelBuilds: 3,
      evaluated: [],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('counts a pre-PR branch even without a pull request', async () => {
    vi.stubGlobal('fetch', mockFetch({ branches: [{ name: 'feat/cs-99-working' }] }))
    expect(
      (await selectNextReadyIssue({ jiraConfig, githubConfig, maxParallelBuilds: 1 })).reason,
    ).toBe('busy')
  })
  it('reads beyond the first GitHub inventory page before admission', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/pulls')) return jsonResponse([])
        if (new URL(url).searchParams.get('page') === '1')
          return jsonResponse(
            Array.from({ length: 100 }, (_, n) => ({ name: `package/cs-${n}-draft` })),
          )
        if (new URL(url).searchParams.get('page') === '2')
          return jsonResponse([{ name: 'feat/cs-99-working' }])
        throw new Error('Should not query Jira when busy')
      }),
    )
    expect(
      (await selectNextReadyIssue({ jiraConfig, githubConfig, maxParallelBuilds: 1 })).reason,
    ).toBe('busy')
  })
  it('fails closed when Jira approval or link evidence is missing', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ issues: [{ key: 'CS-1', fields: { summary: 'incomplete' } }] }),
    )
    expect((await selectNextReadyIssue({ jiraConfig, githubConfig })).selected).toBeNull()
  })
  it('keeps serial delivery when the limit is one', async () => {
    const fetchMock = mockFetch({ pulls: [{ title: 'CS-21: Shopping List Foundation' }] })
    vi.stubGlobal('fetch', fetchMock)

    const result = await selectNextReadyIssue({ jiraConfig, githubConfig, maxParallelBuilds: 1 })

    expect(result.reason).toBe('busy')
    expect(result.inFlight).toEqual(['CS-21'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('serialises when an existing build has no verified safety metadata', async () => {
    await withReadyPackageFixture('CS-57', async (cwd) => {
      const fetchMock = mockFetch({
        pulls: [{ title: 'CS-21: Shopping List Foundation' }],
        issues: [issue('CS-57')],
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })

      expect(result.selected).toBeNull()
      expect(result.evaluated[0].reason).toContain('parallel safety')
      expect(result.selected).toBeNull()
    })
  })

  it('never selects a story that already has a build in flight', async () => {
    const fetchMock = mockFetch({
      pulls: [{ title: 'CS-57: Observability' }],
      issues: [issue('CS-57')],
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await selectNextReadyIssue({ jiraConfig, githubConfig })

    expect(result.selected).toBeNull()
    expect(result.evaluated[0].reason).toBe('a build is already in flight for this issue')
  })

  it('counts two pull requests for one story as a single build', async () => {
    await withReadyPackageFixture('CS-57', async (cwd) => {
      const fetchMock = mockFetch({
        pulls: [
          { title: 'CS-21: part one' },
          { title: 'CS-21: part two' },
          { title: 'CS-22: other' },
        ],
        issues: [issue('CS-57')],
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await selectNextReadyIssue({ jiraConfig, githubConfig, cwd })

      expect(result.selected).toBeNull()
      expect(result.reason).not.toBe('busy')
    })
  })

  it('does not treat an open engineering-package PR as a build in flight', async () => {
    await withReadyPackageFixture('CS-57', async (cwd) => {
      const fetchMock = mockFetch({
        pulls: [
          {
            title: 'chore(package): CS-58 — engineering package draft',
            head: { ref: 'package/cs-58-draft' },
          },
        ],
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
      reason: 'a build is already in flight for this issue',
    })
  })

  it('skips a candidate whose package readiness fails', async () => {
    const fetchMock = mockFetch({ issues: [issue('CS-9999')] })
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

describe('resolveMaxParallelBuilds', () => {
  it('defaults only when absent and never authorises more than three', () => {
    expect(resolveMaxParallelBuilds(undefined)).toBe(3)
    for (const value of ['1', '2', '3']) expect(resolveMaxParallelBuilds(value)).toBe(Number(value))
    for (const value of ['5', '0', 'many', '', '1.5', 'Infinity', '03', null]) {
      expect(() => resolveMaxParallelBuilds(value)).toThrow()
    }
  })
})
