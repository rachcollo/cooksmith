// Durable reservations. Never expire locks/claims: recovery requires stopped owners.
import { randomUUID } from 'node:crypto'

export const LOCK = 'tags/cooksmith-builds/lock'
export const CLAIMS = 'tags/cooksmith-builds/claims/'
const shaPattern = /^[a-f0-9]{40}$/

export function githubClaimStore(config) {
  const base = `/repos/${config.owner}/${config.repo}`
  async function request(path, method = 'GET', body) {
    const response = await fetch(`https://api.github.com${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok)
      throw new Error(`Claim API ${method} ${path}: HTTP ${response.status}; stop and reconcile`)
    return response.status === 204 ? null : response.json()
  }
  async function read(ref) {
    const result = await request(`/git/ref/${ref}`)
    if (result.ref !== `refs/${ref}` || !shaPattern.test(result.object?.sha))
      throw new Error('Invalid claim ref')
    return result.object.sha
  }
  return {
    currentMain: () => read('heads/main'),
    async create(ref, data, baseline) {
      const tag = await request('/git/tags', 'POST', {
        tag: ref.slice(5),
        message: JSON.stringify(data),
        object: baseline,
        type: 'commit',
      })
      if (!shaPattern.test(tag.sha)) throw new Error('Invalid tag response')
      const result = await request('/git/refs', 'POST', { ref: `refs/${ref}`, sha: tag.sha })
      if (
        result.ref !== `refs/${ref}` ||
        result.object?.sha !== tag.sha ||
        (await read(ref)) !== tag.sha
      ) {
        throw new Error('Uncertain ref creation; stop and reconcile')
      }
      return tag.sha
    },
    async list() {
      const refs = await request(`/git/matching-refs/${CLAIMS}`)
      if (!Array.isArray(refs)) throw new Error('Invalid claims response')
      return Promise.all(
        refs.map(async (ref) => {
          if (
            !ref.ref?.startsWith(`refs/${CLAIMS}`) ||
            ref.object?.type !== 'tag' ||
            !shaPattern.test(ref.object.sha)
          )
            throw new Error('Malformed claim ref')
          const tag = await request(`/git/tags/${ref.object.sha}`)
          const data = JSON.parse(tag.message)
          if (ref.ref !== `refs/${CLAIMS}${data.key}`) throw new Error('Claim key mismatch')
          return data
        }),
      )
    },
    async assertOwned(ref, sha) {
      if ((await read(ref)) !== sha) throw new Error('Ref owner changed; stop')
    },
    async removeOwned(ref, sha) {
      if ((await read(ref)) !== sha) throw new Error('Ref owner changed; refusing deletion')
      await request(`/git/refs/${ref}`, 'DELETE')
    },
  }
}

export async function admitBuild({ store, baseline, select, owner = randomUUID() }) {
  if (!shaPattern.test(baseline)) throw new Error('A verified main SHA is required')
  // Atomic create at one fixed name. A conflict/timeout NEVER grants ownership.
  const lockSha = await store.create(LOCK, { version: 1, owner, baseline }, baseline)
  // Deliberately no finally cleanup: an exception may follow a committed write.
  if ((await store.currentMain()) !== baseline)
    throw new Error('Main changed before admission; reconcile lock and refresh checkout')
  const claims = await store.list()
  const keys = new Set()
  for (const claim of claims) {
    if (
      claim.version !== 1 ||
      !/^CS-\d+$/.test(claim.key) ||
      typeof claim.owner !== 'string' ||
      !claim.owner ||
      !shaPattern.test(claim.baseline) ||
      keys.has(claim.key)
    ) {
      throw new Error('Ambiguous claim state; manual reconciliation required')
    }
    keys.add(claim.key)
  }
  const result = await select(claims)
  if (result.selected) {
    if ((await store.currentMain()) !== baseline)
      throw new Error('Main changed during selection; no build permission')
    if (keys.has(result.selected)) throw new Error('Story already reserved')
    const claim = {
      version: 1,
      key: result.selected,
      owner,
      baseline,
      safety: result.safety ?? null,
    }
    const claimSha = await store.create(`${CLAIMS}${claim.key}`, claim, baseline)
    result.claim = { ...claim, sha: claimSha }
  }
  await store.removeOwned(LOCK, lockSha)
  return result
}
