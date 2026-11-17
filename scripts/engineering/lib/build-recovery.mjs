// Recovery is deliberately serial and opt-in through a reviewed external manifest.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { CLAIMS, LOCK } from './build-claims.mjs'

const sha = /^[a-f0-9]{40}$/
const text = (value) => typeof value === 'string' && value.trim().length > 0
const evidence = (value) => typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value)
const requireState = (condition, message) => {
  if (!condition) throw new Error(`Recovery stopped: ${message}`)
}
export function reviewedManifest(raw, digest, baseline) {
  const manifest = JSON.parse(raw)
  requireState(
    createHash('sha256').update(JSON.stringify(manifest)).digest('hex') === digest,
    'reviewed manifest digest mismatch',
  )
  requireState(manifest.baseline === baseline, 'reviewed manifest baseline mismatch')
  return manifest
}
export function readRecovery(cwd = process.cwd()) {
  const value = JSON.parse(readFileSync(join(cwd, 'engineering/build-recovery.json'), 'utf8'))
  requireState(value?.version === 1 && value.mode === 'frozen', 'invalid or missing freeze')
  return value
}
export function assertNormalAdmission(cwd = process.cwd()) {
  // Missing/malformed configuration also fails closed; unfreezing is a reviewed code change.
  readRecovery(cwd)
  throw new Error('New build admission frozen during reviewed legacy recovery')
}
export function inventorySnapshot(branches, pulls) {
  requireState(Array.isArray(branches) && Array.isArray(pulls), 'incomplete inventory')
  const branchRows = branches
    .map((b) => {
      requireState(text(b.name) && sha.test(b.commit?.sha), 'invalid branch head')
      return { name: b.name, sha: b.commit.sha }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  const prRows = pulls
    .map((p) => {
      requireState(
        Number.isSafeInteger(p.number) &&
          p.number > 0 &&
          text(p.head?.ref) &&
          sha.test(p.head?.sha) &&
          text(p.head?.repo?.full_name) &&
          text(p.base?.ref) &&
          sha.test(p.base?.sha) &&
          typeof p.draft === 'boolean',
        'invalid PR head',
      )
      return {
        number: p.number,
        branch: p.head.ref,
        sha: p.head.sha,
        repository: p.head.repo.full_name,
        base: p.base.ref,
        baseSha: p.base.sha,
        draft: p.draft,
      }
    })
    .sort((a, b) => a.number - b.number)
  requireState(
    new Set(branchRows.map((b) => b.name)).size === branchRows.length &&
      new Set(prRows.map((p) => p.number)).size === prRows.length,
    'duplicate inventory',
  )
  // Main is verified independently, including PR base SHAs. All other branches, including
  // package/v2/historical branches, remain exact-head witnesses rather than free capacity.
  return { branches: branchRows.filter((b) => b.name !== 'main'), pulls: prRows }
}
export function validateRecovery(manifest, snapshot, baseline) {
  requireState(manifest?.version === 1 && manifest.mode === 'frozen', 'freeze required')
  requireState(manifest.baseline === baseline, 'manifest baseline changed')
  const plan = manifest.adoption
  requireState(
    plan && evidence(plan.approval) && evidence(plan.sourcesStopped),
    'review/stop evidence missing',
  )
  requireState(
    Array.isArray(plan.owners) &&
      plan.owners.length > 0 &&
      plan.owners.every(
        (o) =>
          text(o.id) &&
          o.state === 'terminated' &&
          evidence(o.evidence) &&
          Array.isArray(o.sessions) &&
          o.sessions.length > 0 &&
          o.sessions.every(text),
      ) &&
      new Set(plan.owners.map((o) => o.id)).size === plan.owners.length,
    'active, suspended or unknown owner',
  )
  requireState(
    Array.isArray(plan.branches) && Array.isArray(plan.pulls),
    'manifest inventory missing',
  )
  const expected = inventorySnapshot(
    plan.branches.map((b) => ({ name: b.name, commit: { sha: b.sha } })),
    plan.pulls.map((p) => ({
      number: p.number,
      head: { ref: p.branch, sha: p.sha, repo: { full_name: p.repository } },
      base: { ref: p.base, sha: p.baseSha },
      draft: p.draft,
    })),
  )
  requireState(JSON.stringify(snapshot) === JSON.stringify(expected), 'branch/PR inventory changed')
  requireState(
    !plan.branches.some((b) => b.name === 'main') &&
      expected.pulls.every(
        (p) =>
          p.base === 'main' &&
          p.baseSha === baseline &&
          p.repository === 'rachcollo/cooksmith' &&
          plan.branches.some((b) => b.name === p.branch && b.sha === p.sha),
      ),
    'unowned or foreign PR',
  )
  requireState(
    plan.branches.every(
      (b) =>
        ['historical', 'frozen', 'target'].includes(b.classification) &&
        evidence(b.evidence) &&
        plan.owners.some((o) => o.id === b.owner),
    ),
    'unverified classification or owner',
  )
  const target = plan.target
  requireState(
    target &&
      /^CS-\d+$/.test(target.key) &&
      sha.test(target.sha) &&
      text(target.branch) &&
      new RegExp(`\\b${target.key}\\b`, 'i').test(target.branch) &&
      Array.isArray(target.dependencies) &&
      target.dependencies.every((k) => /^CS-\d+$/.test(k) && k !== target.key) &&
      evidence(target.scope),
    'invalid exact target or dependency/scope evidence',
  )
  requireState(
    plan.branches.filter((b) => b.classification === 'target').length === 1 &&
      plan.branches.some(
        (b) => b.name === target.branch && b.sha === target.sha && b.classification === 'target',
      ),
    'target head mismatch',
  )
  requireState(
    expected.pulls.filter((p) => p.branch === target.branch).length === 1 &&
      expected.pulls.some(
        (p) =>
          p.number === target.pr &&
          p.branch === target.branch &&
          p.sha === target.sha &&
          p.base === 'main' &&
          p.repository === 'rachcollo/cooksmith',
      ),
    'target PR mismatch',
  )
  return target
}
export async function adoptRecovery({
  store,
  baseline,
  manifest,
  inventory,
  checkDependencies,
  owner = randomUUID(),
}) {
  requireState(sha.test(baseline), 'verified baseline required')
  const digest = createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
  const lock = await store.create(LOCK, { version: 1, owner, baseline, recovery: digest }, baseline)
  // No finally: every uncertain outcome preserves the lock and any committed claim/receipt.
  const verify = async () => {
    requireState((await store.currentMain()) === baseline, 'main changed')
    const target = validateRecovery(manifest, await inventory(), baseline)
    requireState(await checkDependencies(target), 'dependency/package evidence failed')
    requireState((await store.currentMain()) === baseline, 'main changed')
    await store.assertOwned(LOCK, lock)
    return target
  }
  requireState((await store.list()).length === 0, 'existing claims require operator reconciliation')
  const target = await verify()
  // Immutable consumption receipt prevents repeat adoption even after claim retirement.
  await store.create(
    `tags/cooksmith-builds/recovery/${digest}`,
    { version: 1, owner, baseline, target },
    baseline,
  )
  await verify()
  const claim = {
    version: 1,
    key: target.key,
    owner,
    baseline,
    safety: null,
    recovery: { digest, branch: target.branch, head: target.sha, pr: target.pr },
  }
  const claimSha = await store.create(`${CLAIMS}${target.key}`, claim, baseline)
  await verify()
  await store.removeOwned(LOCK, lock)
  return { selected: target.key, claim: { ...claim, sha: claimSha } }
}
