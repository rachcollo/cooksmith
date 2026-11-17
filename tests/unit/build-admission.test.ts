import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  admitBuild,
  githubClaimStore,
  LOCK,
  CLAIMS,
} from '../../scripts/engineering/lib/build-claims.mjs'
import {
  independent,
  readSafety,
  verifySafety,
} from '../../scripts/engineering/lib/build-safety.mjs'
import { selectNextReadyIssue } from '../../scripts/engineering/select-next-ready-issue.mjs'

const baseline = 'a'.repeat(40)
const githubConfig = { owner: 'test', repo: 'test', token: 'synthetic' }
const jiraConfig = { baseUrl: 'https://jira.invalid', email: 'test', token: 'synthetic' }
const safety = (epic: string, scope: string) => ({
  epic,
  scopes: [scope],
  schemaChange: false,
  dependencies: [] as string[],
})
const temps: string[] = []
afterEach(() => {
  vi.unstubAllGlobals()
  for (const path of temps.splice(0)) rmSync(path, { recursive: true, force: true })
})

// Shared server fake models atomic create-ref, immutable tags and uncertain replies.
function server() {
  const refs = new Map<string, string>()
  const tags = new Map<string, { message: string }>()
  let next = 1
  let failAfterCreate = ''
  const response = (body: unknown, status = 200) => ({
    ok: status < 300,
    status,
    json: async () => body,
  })
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = new URL(url).pathname.replace('/repos/test/test', '')
    const data = init.body ? JSON.parse(String(init.body)) : null
    if (path === '/git/tags' && init.method === 'POST') {
      const sha = (next++).toString(16).padStart(40, '0')
      tags.set(sha, data)
      return response({ sha }, 201)
    }
    if (path === '/git/refs' && init.method === 'POST') {
      const ref = data.ref.slice(5)
      if (refs.has(ref)) return response({}, 422)
      refs.set(ref, data.sha)
      if (ref === failAfterCreate) throw new Error('connection lost after commit')
      return response({ ref: data.ref, object: { sha: data.sha } }, 201)
    }
    if (path === '/git/ref/heads/main')
      return response({ ref: 'refs/heads/main', object: { sha: baseline } })
    if (path.startsWith('/git/ref/')) {
      const ref = path.slice('/git/ref/'.length)
      return refs.has(ref)
        ? response({ ref: `refs/${ref}`, object: { sha: refs.get(ref) } })
        : response({}, 404)
    }
    if (path.startsWith('/git/refs/') && init.method === 'DELETE') {
      refs.delete(path.slice('/git/refs/'.length))
      return response(null, 204)
    }
    if (path.startsWith('/git/matching-refs/'))
      return response(
        [...refs]
          .filter(([ref]) => ref.startsWith(CLAIMS))
          .map(([ref, sha]) => ({ ref: `refs/${ref}`, object: { type: 'tag', sha } })),
      )
    if (path.startsWith('/git/tags/')) return response(tags.get(path.slice('/git/tags/'.length)))
    throw new Error(`Unexpected API: ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return {
    refs,
    tags,
    fetchMock,
    failAfter: (ref: string) => {
      failAfterCreate = ref
    },
    store: githubClaimStore(githubConfig),
  }
}

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'admission-'))
  temps.push(cwd)
  mkdirSync(join(cwd, 'engineering/ready'), { recursive: true })
  for (let n = 1; n <= 4; n++)
    writeFileSync(
      join(cwd, `engineering/ready/cs${n}.md`),
      `# CS-${n}\n- **Status:** Ready\n- [ ] One\n- [ ] Two\n- [ ] Three\n`,
    )
  const registry = Object.fromEntries(
    [1, 2, 3, 4].map((n) => [`CS-${n}`, safety(`CS-${100 + n}`, `scope-${n}`)]),
  )
  writeFileSync(join(cwd, 'engineering/build-safety.json'), JSON.stringify(registry))
  return { cwd, registry }
}

function selectionServer() {
  const api = server()
  const original = api.fetchMock.getMockImplementation()!
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const json = (body: unknown) => ({ ok: true, json: async () => body })
    if (url.includes('/pulls') || url.includes('/branches')) return json([])
    if (url.includes('/search'))
      return json({
        issues: [1, 2, 3, 4].map((n) => ({
          key: `CS-${n}`,
          fields: {
            summary: 'fixture',
            status: { name: 'Ready' },
            labels: ['codex-ready'],
            issuelinks: [],
          },
        })),
      })
    const match = url.match(/\/issue\/CS-(\d+)/)
    if (match)
      return json({
        fields: {
          parent: { key: `CS-${100 + Number(match[1])}`, fields: { issuetype: { name: 'Epic' } } },
          issuelinks: [],
          status: { name: 'Done' },
        },
      })
    return original(url, init)
  })
  return api
}

describe('durable build admission', () => {
  it('overlapping sessions cannot both select; a pre-PR reservation consumes capacity and deduplicates the story', async () => {
    const { store, refs } = selectionServer()
    const { cwd } = fixture()
    const select = (claims: unknown[]) =>
      selectNextReadyIssue({ githubConfig, jiraConfig, cwd, claims })
    const first = await Promise.allSettled([
      admitBuild({ store, baseline, select }),
      admitBuild({ store, baseline, select }),
    ])
    expect(first.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect([...refs.keys()]).toEqual([`${CLAIMS}CS-1`])
    expect((await admitBuild({ store, baseline, select })).selected).toBe('CS-2')
    expect((await admitBuild({ store, baseline, select })).selected).toBe('CS-3')
    expect((await admitBuild({ store, baseline, select })).reason).toBe('busy')
    expect([...refs.keys()]).toHaveLength(3)
  })
  it.each([LOCK, `${CLAIMS}CS-1`])(
    'fails closed after uncertain create of %s and never retries ownership',
    async (ref) => {
      const api = server()
      api.failAfter(ref)
      const select = vi.fn(async () => ({ selected: 'CS-1', evaluated: [] }))
      await expect(admitBuild({ store: api.store, baseline, select })).rejects.toThrow()
      expect(api.refs.has(LOCK)).toBe(true)
      const calls = select.mock.calls.length
      await expect(admitBuild({ store: api.store, baseline, select })).rejects.toThrow()
      expect(select).toHaveBeenCalledTimes(calls)
    },
  )
  it('an uncertain unlock never loses the durable reservation', async () => {
    const api = selectionServer()
    const { cwd } = fixture()
    const remove = api.store.removeOwned
    api.store.removeOwned = async (ref: string, sha: string) => {
      await remove(ref, sha)
      throw new Error('lost unlock response')
    }
    const select = (claims: unknown[]) =>
      selectNextReadyIssue({ githubConfig, jiraConfig, cwd, claims, maxParallelBuilds: 1 })
    await expect(admitBuild({ store: api.store, baseline, select })).rejects.toThrow('lost unlock')
    expect(api.refs.has(`${CLAIMS}CS-1`)).toBe(true)
    api.store.removeOwned = remove
    expect((await admitBuild({ store: api.store, baseline, select })).reason).toBe('busy')
  })
  it('never deletes another owner’s lock', async () => {
    const api = server()
    const sha = await api.store.create(LOCK, { owner: 'first' }, baseline)
    api.refs.set(LOCK, baseline)
    await expect(api.store.removeOwned(LOCK, sha)).rejects.toThrow('owner changed')
    expect(api.refs.get(LOCK)).toBe(baseline)
  })
  it('retains lock on interrupted selection or malformed durable claim', async () => {
    const api = server()
    await api.store.create(`${CLAIMS}CS-1`, { key: 'CS-1', owner: 'old' }, baseline)
    const select = vi.fn()
    await expect(admitBuild({ store: api.store, baseline, select })).rejects.toThrow('Ambiguous')
    expect(select).not.toHaveBeenCalled()
    expect(api.refs.has(LOCK)).toBe(true)
  })
  it('does not expire a reservation based on age or issue status', async () => {
    const api = selectionServer()
    const { cwd } = fixture()
    await api.store.create(
      `${CLAIMS}CS-1`,
      { version: 1, key: 'CS-1', owner: 'old', baseline, createdAt: '2000-01-01', safety: null },
      baseline,
    )
    const result = await admitBuild({
      store: api.store,
      baseline,
      select: (claims: unknown[]) =>
        selectNextReadyIssue({ githubConfig, jiraConfig, cwd, claims, maxParallelBuilds: 1 }),
    })
    expect(result.reason).toBe('busy')
    expect(api.refs.has(`${CLAIMS}CS-1`)).toBe(true)
  })
  it('fails closed if main advances after lock acquisition', async () => {
    const api = server()
    const select = vi.fn()
    api.store.currentMain = async () => 'b'.repeat(40)
    await expect(admitBuild({ store: api.store, baseline, select })).rejects.toThrow('Main changed')
    expect(select).not.toHaveBeenCalled()
    expect(api.refs.has(LOCK)).toBe(true)
  })
  it('retains the lock if selection throws before a reservation', async () => {
    const api = server()
    await expect(
      admitBuild({
        store: api.store,
        baseline,
        select: async () => {
          throw new Error('interrupted')
        },
      }),
    ).rejects.toThrow('interrupted')
    expect(api.refs.has(LOCK)).toBe(true)
  })
})

describe('parallel safety', () => {
  it('requires different epics, disjoint scopes, and no schema changes', () => {
    const a = safety('CS-10', 'pantry'),
      b = safety('CS-20', 'planner')
    expect(independent(a, b)).toBe(true)
    expect(independent(a, { ...b, epic: a.epic })).toBe(false)
    expect(independent(a, { ...b, scopes: a.scopes })).toBe(false)
    expect(independent(a, { ...b, schemaChange: true })).toBe(false)
    expect(independent(a, null)).toBe(false)
  })
  it('rejects malformed metadata and serialises missing metadata', () => {
    const { cwd } = fixture()
    expect(readSafety(cwd, 'CS-999')).toBeNull()
    writeFileSync(join(cwd, 'engineering/build-safety.json'), '{"CS-1":{"schemaChange":"false"}}')
    expect(() => readSafety(cwd, 'CS-1')).toThrow('Malformed')
  })
  it('allows an unfinished downstream dependant while unrelated work is active', async () => {
    const meta = safety('CS-10', 'pantry')
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        fields: {
          parent: { key: 'CS-10', fields: { issuetype: { name: 'Epic' } } },
          issuelinks: [
            {
              type: { name: 'Blocks' },
              inwardIssue: { key: 'CS-9', fields: { status: { name: 'Backlog' } } },
            },
          ],
        },
      }),
    }))
    expect(
      await verifySafety({ jiraConfig, key: 'CS-1', safety: meta, activeKeys: ['CS-2'] }),
    ).toBe(true)
    expect(
      await verifySafety({ jiraConfig, key: 'CS-1', safety: meta, activeKeys: ['CS-9'] }),
    ).toBe(false)
  })
  it('denies an upstream dependency on an active story even with a stale Done status', async () => {
    const meta = safety('CS-10', 'pantry')
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        fields: {
          parent: { key: 'CS-10', fields: { issuetype: { name: 'Epic' } } },
          issuelinks: [
            {
              type: { name: 'Blocks' },
              outwardIssue: { key: 'CS-2', fields: { status: { name: 'Done' } } },
            },
          ],
        },
      }),
    }))
    expect(
      await verifySafety({ jiraConfig, key: 'CS-1', safety: meta, activeKeys: ['CS-2'] }),
    ).toBe(false)
  })
  it('requires verified epic and completed dependencies, including unknown link evidence', async () => {
    const meta = { ...safety('CS-10', 'pantry'), dependencies: ['CS-9'] }
    vi.stubGlobal('fetch', async (url: string) => ({
      ok: true,
      json: async () => ({
        fields: url.includes('CS-9?')
          ? { status: { name: 'In Progress' } }
          : { parent: { key: 'CS-10', fields: { issuetype: { name: 'Epic' } } }, issuelinks: [] },
      }),
    }))
    expect(await verifySafety({ jiraConfig, key: 'CS-1', safety: meta })).toBe(false)
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        fields: {
          parent: { key: 'CS-10', fields: { issuetype: { name: 'Epic' } } },
          issuelinks: [{ type: { name: 'Relates' } }],
        },
      }),
    }))
    expect(await verifySafety({ jiraConfig, key: 'CS-1', safety: meta })).toBe(false)
  })
  it.each(['epic', 'scope', 'schema', 'dependency', 'missing'])(
    'refuses conflicting %s evidence during actual admission',
    async (conflict) => {
      const api = selectionServer()
      const { cwd, registry } = fixture()
      if (conflict === 'epic') registry['CS-2'].epic = registry['CS-1'].epic
      if (conflict === 'scope') registry['CS-2'].scopes = registry['CS-1'].scopes
      if (conflict === 'schema') registry['CS-2'].schemaChange = true
      if (conflict === 'dependency') registry['CS-2'].dependencies = ['CS-1']
      if (conflict === 'missing') delete registry['CS-2']
      // Only CS-2 remains otherwise eligible.
      for (const n of [3, 4])
        writeFileSync(join(cwd, `engineering/ready/cs${n}.md`), `# CS-${n}\n- **Status:** Planned`)
      writeFileSync(join(cwd, 'engineering/build-safety.json'), JSON.stringify(registry))
      await api.store.create(
        `${CLAIMS}CS-1`,
        { version: 1, key: 'CS-1', owner: 'first', baseline, safety: registry['CS-1'] },
        baseline,
      )
      const result = await admitBuild({
        store: api.store,
        baseline,
        select: (claims: unknown[]) =>
          selectNextReadyIssue({ githubConfig, jiraConfig, cwd, claims }),
      })
      expect(result.selected).toBeNull()
      expect(api.refs.has(`${CLAIMS}CS-2`)).toBe(false)
    },
  )
})
