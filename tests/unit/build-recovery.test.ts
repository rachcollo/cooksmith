import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  adoptRecovery,
  reviewedManifest,
  validateRecovery,
  inventorySnapshot,
  assertNormalAdmission,
} from '../../scripts/engineering/lib/build-recovery.mjs'
import { LOCK, CLAIMS } from '../../scripts/engineering/lib/build-claims.mjs'

const baseline = 'a'.repeat(40)
const head = 'b'.repeat(40)
const olderBase = 'c'.repeat(40)
function fixture() {
  const branches = [
    {
      name: 'fix/cs-111-ui',
      sha: head,
      classification: 'target',
      owner: 'old',
      evidence: 'https://evidence.invalid/branch',
    },
    {
      name: 'legacy',
      sha: head,
      classification: 'historical',
      owner: 'old',
      evidence: 'https://evidence.invalid/history',
    },
  ]
  const pulls = [
    {
      number: 231,
      branch: branches[0].name,
      sha: head,
      repository: 'rachcollo/cooksmith',
      base: 'main',
      baseRepository: 'rachcollo/cooksmith',
      baseSha: olderBase,
      draft: false,
    },
  ]
  const manifest = {
    baseline,
    version: 1,
    mode: 'frozen',
    adoption: {
      approval: 'https://evidence.invalid/review',
      sourcesStopped: 'https://evidence.invalid/sources',
      owners: [
        {
          id: 'old',
          state: 'terminated',
          sessions: ['old-session'],
          evidence: 'https://evidence.invalid/join',
        },
      ],
      branches,
      pulls,
      target: {
        key: 'CS-111',
        branch: branches[0].name,
        sha: head,
        pr: 231,
        dependencies: [],
        scope: 'https://evidence.invalid/package',
      },
    },
  }
  const snapshot = inventorySnapshot(
    branches.map((b) => ({ name: b.name, commit: { sha: b.sha } })),
    pulls.map((p) => ({
      number: p.number,
      head: { ref: p.branch, sha: p.sha, repo: { full_name: p.repository } },
      base: { ref: p.base, sha: p.baseSha, repo: { full_name: p.baseRepository } },
      draft: p.draft,
    })),
  )
  const refs = new Map<string, { sha: string; data: { key?: string } }>()
  let next = 1
  const store = {
    currentMain: vi.fn(async () => baseline),
    create: vi.fn(async (ref: string, data: { key?: string }) => {
      if (refs.has(ref)) throw new Error('existing ref')
      const sha = (next++).toString(16).padStart(40, '0')
      refs.set(ref, { sha, data })
      return sha
    }),
    list: async () => [...refs].filter(([r]) => r.startsWith(CLAIMS)).map(([, r]) => r.data),
    assertOwned: async (ref: string, sha: string) => {
      if (refs.get(ref)?.sha !== sha) throw new Error('owner changed')
    },
    removeOwned: async (ref: string, sha: string) => {
      await store.assertOwned(ref, sha)
      refs.delete(ref)
    },
  }
  return {
    manifest,
    snapshot,
    refs,
    store,
    args: {
      store,
      baseline,
      manifest,
      inventory: vi.fn(async () => structuredClone(snapshot)),
      checkDependencies: vi.fn(async () => true),
    },
  }
}

describe('reviewed serial legacy recovery', () => {
  it('accepts faithful older PR base metadata while pinning current main', async () => {
    const { args, refs, manifest, snapshot } = fixture()
    expect(snapshot.pulls[0].baseSha).toBe(olderBase)
    expect(snapshot.pulls[0].baseSha).not.toBe(baseline)
    expect(validateRecovery(manifest, snapshot, baseline)).toEqual(manifest.adoption.target)
    await adoptRecovery(args)
    expect(refs.has(`${CLAIMS}CS-111`)).toBe(true)
  })
  it.each(['base', 'baseRepository'])('rejects an approved but wrong PR %s', (field) => {
    const { manifest, snapshot } = fixture()
    Object.assign(manifest.adoption.pulls[0], { [field]: field === 'base' ? 'v2' : 'foreign/repo' })
    Object.assign(snapshot.pulls[0], { [field]: field === 'base' ? 'v2' : 'foreign/repo' })
    expect(() => validateRecovery(manifest, snapshot, baseline)).toThrow('unowned or foreign PR')
  })
  it('rejects missing base repository evidence', () => {
    expect(() =>
      inventorySnapshot(
        [],
        [
          {
            number: 1,
            head: { ref: 'fix/cs-111-ui', sha: head, repo: { full_name: 'rachcollo/cooksmith' } },
            base: { ref: 'main', sha: olderBase },
            draft: false,
          },
        ],
      ),
    ).toThrow('invalid PR head')
  })

  it('binds review to exact baseline and historical classification without branch publication', () => {
    const { manifest } = fixture()
    const raw = JSON.stringify(manifest)
    const digest = createHash('sha256').update(raw).digest('hex')
    expect(reviewedManifest(raw, digest, baseline)).toEqual(manifest)
    expect(() => reviewedManifest(raw, digest, head)).toThrow('baseline')
    manifest.adoption.branches[1].classification = 'frozen'
    expect(() => reviewedManifest(JSON.stringify(manifest), digest, baseline)).toThrow('digest')
    expect(() => reviewedManifest(raw, '', baseline)).toThrow('digest')
  })

  it.each(['foreign', 'missing', 'baseline'])(
    'rejects %s inventory ownership or baseline',
    (kind) => {
      const { manifest, snapshot } = fixture()
      if (kind === 'baseline') manifest.baseline = head
      if (kind === 'foreign') {
        manifest.adoption.pulls[0].repository = 'foreign/repo'
        snapshot.pulls[0].repository = 'foreign/repo'
      }
      if (kind === 'missing') {
        manifest.adoption.pulls[0].branch = 'missing'
        snapshot.pulls[0].branch = 'missing'
      }
      expect(() => validateRecovery(manifest, snapshot, baseline)).toThrow()
    },
  )

  it('permits exactly one concurrent writer and retains an immutable consumption receipt', async () => {
    const { args, refs } = fixture()
    const results = await Promise.allSettled([adoptRecovery(args), adoptRecovery(args)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(refs.has(LOCK)).toBe(false)
    expect(refs.has(`${CLAIMS}CS-111`)).toBe(true)
    expect([...refs.keys()].filter((k) => k.includes('/recovery/'))).toHaveLength(1)
    await expect(adoptRecovery(args)).rejects.toThrow('existing claims')
  })
  it('prevents reuse after an operator retires a claim', async () => {
    const { args, refs } = fixture()
    await adoptRecovery(args)
    refs.delete(`${CLAIMS}CS-111`)
    await expect(adoptRecovery(args)).rejects.toThrow('existing ref')
    expect(refs.has(LOCK)).toBe(true)
  })
  it.each(['active', 'suspended', 'unknown', ''])(
    'rejects %s owners without deleting evidence',
    async (state) => {
      const { args, refs } = fixture()
      args.manifest.adoption.owners[0].state = state
      await expect(adoptRecovery(args)).rejects.toThrow('owner')
      expect(refs.size).toBe(1)
    },
  )
  it.each(['approval', 'sourcesStopped'])('requires %s evidence', async (field) => {
    const { args } = fixture()
    Object.assign(args.manifest.adoption, { [field]: '' })
    await expect(adoptRecovery(args)).rejects.toThrow('evidence')
  })
  it('rejects unverified historical classification and missing session termination evidence', () => {
    const { manifest, snapshot } = fixture()
    manifest.adoption.branches[1].classification = 'ignored'
    expect(() => validateRecovery(manifest, snapshot, baseline)).toThrow('classification')
    manifest.adoption.branches[1].classification = 'historical'
    manifest.adoption.owners[0].sessions = []
    expect(() => validateRecovery(manifest, snapshot, baseline)).toThrow('owner')
  })
  it.each(['target', 'historical', 'pr', 'baseSha', 'base', 'baseRepository', 'new', 'deleted'])(
    'rejects %s movement even after claim creation',
    async (kind) => {
      const { args, snapshot, refs } = fixture()
      args.inventory.mockImplementation(async () => {
        const changed = structuredClone(snapshot)
        if (args.inventory.mock.calls.length === 3) {
          if (kind === 'target') changed.branches[0].sha = 'c'.repeat(40)
          if (kind === 'historical') changed.branches[1].sha = 'c'.repeat(40)
          if (kind === 'pr') changed.pulls[0].sha = 'c'.repeat(40)
          if (kind === 'baseSha') changed.pulls[0].baseSha = baseline
          if (kind === 'base') changed.pulls[0].base = 'v2'
          if (kind === 'baseRepository') changed.pulls[0].baseRepository = 'foreign/repo'
          if (kind === 'new') changed.branches.push({ name: 'new', sha: head })
          if (kind === 'deleted') changed.branches.pop()
        }
        return changed
      })
      await expect(adoptRecovery(args)).rejects.toThrow('inventory changed')
      expect(refs.has(LOCK)).toBe(true)
      expect(refs.has(`${CLAIMS}CS-111`)).toBe(true)
    },
  )
  it.each([1, 3, 6])('stops on main movement at check %s', async (check) => {
    const { args, store, refs } = fixture()
    store.currentMain.mockImplementation(async () =>
      store.currentMain.mock.calls.length === check ? head : baseline,
    )
    await expect(adoptRecovery(args)).rejects.toThrow('main changed')
    expect(refs.has(LOCK)).toBe(true)
  })
  it.each(['lock', 'claim', 'receipt', 'unlock'])(
    'fails closed after lost %s response',
    async (stage) => {
      const { args, store, refs } = fixture()
      const create = store.create.getMockImplementation()!
      store.create.mockImplementation(async (ref, data) => {
        const result = await create(ref, data)
        if (
          (stage === 'lock' && ref === LOCK) ||
          (stage === 'claim' && ref.startsWith(CLAIMS)) ||
          (stage === 'receipt' && ref.includes('/recovery/'))
        )
          throw new Error('lost response')
        return result
      })
      if (stage === 'unlock')
        store.removeOwned = async (ref) => {
          refs.delete(ref)
          throw new Error('lost response')
        }
      await expect(adoptRecovery(args)).rejects.toThrow('lost response')
      await expect(adoptRecovery(args)).rejects.toThrow()
      expect(refs.size).toBeGreaterThan(0)
    },
  )
  it('preserves stale lock and claims, and rejects lost ownership', async () => {
    const { args, refs } = fixture()
    refs.set(LOCK, { sha: head, data: {} })
    await expect(adoptRecovery(args)).rejects.toThrow('existing ref')
    expect(refs.get(LOCK)?.sha).toBe(head)
    refs.delete(LOCK)
    refs.set(`${CLAIMS}CS-110`, { sha: head, data: {} })
    await expect(adoptRecovery(args)).rejects.toThrow('existing claims')
    expect(refs.get(`${CLAIMS}CS-110`)?.sha).toBe(head)
    const other = fixture()
    other.args.checkDependencies.mockImplementation(async () => {
      other.refs.set(LOCK, { sha: head, data: {} })
      return true
    })
    await expect(adoptRecovery(other.args)).rejects.toThrow('owner changed')
  })
  it('rejects missing adoption and failed dependency evidence', async () => {
    const { args } = fixture()
    args.checkDependencies.mockResolvedValue(false)
    await expect(adoptRecovery(args)).rejects.toThrow('dependency')
    expect(() =>
      validateRecovery({ baseline, version: 1, mode: 'frozen', adoption: null }, {}, baseline),
    ).toThrow('evidence')
  })
  it('freezes normal admission with missing, malformed and active configuration', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'recovery-'))
    try {
      mkdirSync(join(cwd, 'engineering'))
      expect(() => assertNormalAdmission(cwd)).toThrow()
      for (const value of [
        'invalid',
        '{"version":1,"mode":"frozen","adoption":null}',
        '{"version":1,"mode":"normal"}',
      ]) {
        writeFileSync(join(cwd, 'engineering/build-recovery.json'), value)
        expect(() => assertNormalAdmission(cwd)).toThrow()
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  })
})
