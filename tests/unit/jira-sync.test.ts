import { afterEach, describe, expect, it, vi } from 'vitest'

import { HANDLERS, readConfig, transitionForward } from '../../scripts/engineering/jira-sync.mjs'

const config = {
  baseUrl: 'https://example.atlassian.net',
  email: 'bot@example.com',
  token: 'secret-token',
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readConfig', () => {
  it('returns null when any required variable is missing', () => {
    expect(readConfig({})).toBeNull()
    expect(readConfig({ JIRA_BASE_URL: 'x', JIRA_EMAIL: 'y' })).toBeNull()
  })

  it('trims a trailing slash from the base URL', () => {
    expect(
      readConfig({
        JIRA_BASE_URL: 'https://example.atlassian.net/',
        JIRA_EMAIL: 'bot@example.com',
        JIRA_API_TOKEN: 'secret-token',
      }),
    ).toEqual(config)
  })
})

describe('transitionForward', () => {
  it('moves the issue when a forward transition is offered', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ fields: { status: { name: 'Backlog' } } }))
      .mockResolvedValueOnce(
        jsonResponse({
          transitions: [
            { id: '21', name: 'Ready' },
            { id: '31', name: 'In Progress' },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    const result = await transitionForward(config, 'CS-21', 'In Progress')

    expect(result).toEqual({ moved: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const transitionCall = fetchMock.mock.calls[2]
    expect(transitionCall[0]).toBe(
      'https://example.atlassian.net/rest/api/3/issue/CS-21/transitions',
    )
    expect(JSON.parse(transitionCall[1].body)).toEqual({ transition: { id: '31' } })
  })

  it('never moves the issue backward and does not call the transitions endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ fields: { status: { name: 'In Review' } } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await transitionForward(config, 'CS-21', 'In Progress')

    expect(result).toEqual({ moved: false, reason: 'already at or past "in review"' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports when the desired transition is not currently offered', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ fields: { status: { name: 'Backlog' } } }))
      .mockResolvedValueOnce(jsonResponse({ transitions: [{ id: '11', name: 'Backlog' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await transitionForward(config, 'CS-21', 'In Progress')

    expect(result.moved).toBe(false)
    expect(result.reason).toContain('no transition to "In Progress" is currently offered')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('handlers', () => {
  it('package-merged promotes to Ready, swaps labels and comments', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ fields: { status: { name: 'Backlog' } } }))
      .mockResolvedValueOnce(jsonResponse({ transitions: [{ id: '21', name: 'Ready' }] }))
      .mockResolvedValueOnce(jsonResponse(null, 204))
      .mockResolvedValueOnce(jsonResponse(null, 204))
      .mockResolvedValueOnce(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    await HANDLERS['package-merged'](config, {
      key: 'CS-60',
      prUrl: 'https://github.com/rachcollo/cooksmith/pull/99',
    })

    expect(fetchMock).toHaveBeenCalledTimes(5)
    const labelCall = fetchMock.mock.calls[3]
    expect(labelCall[0]).toBe('https://example.atlassian.net/rest/api/3/issue/CS-60')
    expect(labelCall[1].method).toBe('PUT')
    expect(JSON.parse(labelCall[1].body)).toEqual({
      update: { labels: [{ add: 'codex-ready' }, { remove: 'package-requested' }] },
    })
    const commentCall = fetchMock.mock.calls[4]
    expect(commentCall[0]).toBe('https://example.atlassian.net/rest/api/3/issue/CS-60/comment')
    expect(JSON.stringify(JSON.parse(commentCall[1].body))).toContain('Status moved to Ready')
  })

  it('pr-merged posts an evidence comment without transitioning status', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    await HANDLERS['pr-merged'](config, {
      key: 'CS-21',
      prUrl: 'https://github.com/rachcollo/cooksmith/pull/45',
      mergeCommit: 'abc123',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.atlassian.net/rest/api/3/issue/CS-21/comment')
    const body = JSON.parse(options.body)
    const text = JSON.stringify(body)
    expect(text).toContain('https://github.com/rachcollo/cooksmith/pull/45')
    expect(text).toContain('abc123')
    expect(text).not.toContain('secret-token')
  })

  it('pr-merged states neither release is required when nothing relevant changed', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    await HANDLERS['pr-merged'](config, {
      key: 'CS-21',
      prUrl: 'https://github.com/rachcollo/cooksmith/pull/45',
      mergeCommit: 'abc123',
      dbRequired: 'no',
      edgeRequired: 'no',
    })

    const text = JSON.stringify(JSON.parse(fetchMock.mock.calls[0][1].body))
    expect(text).toContain('Production database release: not required')
    expect(text).toContain('Production Edge Function release: not required')
    expect(text).not.toContain('REQUIRED')
  })

  it('pr-merged calls out a required database release when a migration changed', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    await HANDLERS['pr-merged'](config, {
      key: 'CS-21',
      prUrl: 'https://github.com/rachcollo/cooksmith/pull/45',
      mergeCommit: 'abc123',
      dbRequired: 'yes',
      edgeRequired: 'no',
    })

    const text = JSON.stringify(JSON.parse(fetchMock.mock.calls[0][1].body))
    expect(text).toContain('Production database release REQUIRED')
    expect(text).toContain('Production Edge Function release: not required')
  })

  it('pr-merged calls out both releases when a migration and an Edge Function changed', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    await HANDLERS['pr-merged'](config, {
      key: 'CS-21',
      prUrl: 'https://github.com/rachcollo/cooksmith/pull/45',
      mergeCommit: 'abc123',
      dbRequired: 'yes',
      edgeRequired: 'yes',
    })

    const text = JSON.stringify(JSON.parse(fetchMock.mock.calls[0][1].body))
    expect(text).toContain('Production database release REQUIRED')
    expect(text).toContain('Production Edge Function release REQUIRED')
  })
})
