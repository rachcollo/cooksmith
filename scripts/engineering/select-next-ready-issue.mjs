// Diagnostic selection only; use admit-next-build.mjs before starting any work.
import { readSafety, verifySafety, independent } from './lib/build-safety.mjs'
import { jiraFetch, readConfig as readJiraConfig } from './lib/jira.mjs'
import {
  listBranches,
  listOpenPullRequests,
  readConfig as readGitHubConfig,
} from './lib/github.mjs'
import { assessPackageReadiness } from './validate-package-readiness.mjs'

const PRIORITY_RANK = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 }
const JIRA_KEY_IN_TEXT = /\bCS-(\d+)\b/i
// Parallel execution is authorised by the product owner up to this many
// builds in flight, including durable reservations before any PR exists.
// Override with COOKSMITH_MAX_PARALLEL_BUILDS; 1 restores serial delivery.
export const DEFAULT_MAX_PARALLEL_BUILDS = 3
const JQL = 'project = CS AND status = "Ready" AND labels = "codex-ready" ORDER BY key ASC'

function priorityRank(name) {
  return PRIORITY_RANK[name?.toLowerCase()] ?? 99
}

function keyNumber(key) {
  return Number(key.split('-')[1])
}

export function resolveMaxParallelBuilds(value) {
  if (value === undefined) return DEFAULT_MAX_PARALLEL_BUILDS
  if (!/^[123]$/.test(String(value))) throw new Error('Parallel limit must be 1, 2 or 3')
  return Number(value)
}

function rankIssues(issues) {
  return [...issues].sort((a, b) => {
    const rankDiff = priorityRank(a.fields.priority?.name) - priorityRank(b.fields.priority?.name)
    return rankDiff !== 0 ? rankDiff : keyNumber(a.key) - keyNumber(b.key)
  })
}

// A "Blocks"-type issue link on an issue X carries the *other* issue under
// outwardIssue when X is the blocked (inward) party, and under inwardIssue
// when X is the blocking (outward) party. Verified against the live CS-20 ->
// CS-21 relationship: CS-20's package declares "Blocks: CS-21", and fetching
// CS-21 returns that link with CS-20 under outwardIssue.
function unmetBlockers(issue) {
  const links = issue.fields?.issuelinks ?? []
  const unmet = []
  for (const link of links) {
    if (link.type?.name !== 'Blocks' || !link.outwardIssue) continue
    const status = link.outwardIssue.fields?.status?.name
    if (!status || status.toLowerCase() !== 'done') {
      unmet.push(`${link.outwardIssue.key} (${status ?? 'unknown status'})`)
    }
  }
  return unmet
}

export async function selectNextReadyIssue({
  jiraConfig,
  githubConfig,
  cwd = process.cwd(),
  maxParallelBuilds = DEFAULT_MAX_PARALLEL_BUILDS,
  claims = [],
} = {}) {
  maxParallelBuilds = resolveMaxParallelBuilds(maxParallelBuilds)
  const openPulls = await listOpenPullRequests(githubConfig)
  const branches = await listBranches(githubConfig)
  const branchNames = branches.map((branch) => branch.name)
  // Only the dedicated package namespace is exempt. A chore title is not
  // evidence that a branch cannot change product contracts.
  const legacy = [
    ...openPulls
      .filter((pr) => !pr.head?.ref?.startsWith('package/'))
      .map((pr) => pr.head?.ref ?? pr.title ?? 'unknown'),
    ...branchNames.filter((name) => !['main', 'v2'].includes(name) && !name.startsWith('package/')),
  ]
  const inFlight = [
    ...new Set([
      ...claims.map((claim) => claim.key),
      ...legacy.map((name) => {
        const key = name.match(JIRA_KEY_IN_TEXT)
        return key ? `CS-${key[1]}` : `unverified:${name}`
      }),
    ]),
  ]
  if (inFlight.length >= maxParallelBuilds) {
    return {
      selected: null,
      reason: 'busy',
      busyWith: inFlight[0],
      inFlight,
      maxParallelBuilds,
      evaluated: [],
    }
  }

  const issues = []
  for (let startAt = 0; ;) {
    const search = await jiraFetch(
      jiraConfig,
      `/rest/api/3/search?jql=${encodeURIComponent(JQL)}&fields=summary,priority,status,labels,issuelinks&startAt=${startAt}&maxResults=100`,
    )
    if (!Array.isArray(search.issues)) throw new Error('Incomplete Jira search')
    issues.push(...search.issues)
    startAt += search.issues.length
    if (search.total !== undefined) {
      if (!Number.isSafeInteger(search.total) || search.total < 0)
        throw new Error('Invalid Jira total')
      if (startAt >= search.total) break
      if (!search.issues.length) throw new Error('Incomplete Jira search page')
    } else if (search.issues.length < 100) break
  }
  const ranked = rankIssues(issues)

  const evaluated = []
  for (const issue of ranked) {
    const key = issue.key
    if (
      !/^CS-\d+$/.test(key) ||
      issue.fields?.status?.name !== 'Ready' ||
      !issue.fields?.labels?.includes('codex-ready') ||
      !Array.isArray(issue.fields?.issuelinks)
    ) {
      evaluated.push({
        key,
        eligible: false,
        reason: 'Jira readiness or dependency evidence missing',
      })
      continue
    }

    if (inFlight.includes(key)) {
      evaluated.push({
        key,
        eligible: false,
        reason: 'a build is already in flight for this issue',
      })
      continue
    }

    const blockers = unmetBlockers(issue)
    if (blockers.length > 0) {
      evaluated.push({ key, eligible: false, reason: `blocked by ${blockers.join(', ')}` })
      continue
    }

    // Branches under package/ carry engineering-package drafts, not
    // implementations, so they never claim a story for build purposes.
    const branchPattern = new RegExp(`\\bcs-${keyNumber(key)}\\b`, 'i')
    if (branchNames.some((name) => !name.startsWith('package/') && branchPattern.test(name))) {
      evaluated.push({ key, eligible: false, reason: 'a branch already exists for this issue' })
      continue
    }

    const readiness = assessPackageReadiness({ jiraKey: key, cwd })
    const readinessFailure = readiness.find((check) => !check.ok)
    if (readinessFailure) {
      evaluated.push({ key, eligible: false, reason: readinessFailure.message })
      continue
    }

    const safety = readSafety(cwd, key)
    if (safety) {
      // Declared package dependencies must be Done even for serial builds.
      let dependenciesDone = true
      for (const dep of safety.dependencies) {
        const dependency = await jiraFetch(jiraConfig, `/rest/api/3/issue/${dep}?fields=status`)
        if (dependency.fields?.status?.name?.toLowerCase() !== 'done') dependenciesDone = false
      }
      if (!dependenciesDone) {
        evaluated.push({ key, eligible: false, reason: 'package dependency is not Done' })
        continue
      }
    }
    let safe = true
    if (inFlight.length) {
      safe =
        inFlight.every((active) => claims.some((claim) => claim.key === active)) &&
        (await verifySafety({ jiraConfig, key, safety, activeKeys: inFlight }))
      for (const claim of claims) {
        const current = readSafety(cwd, claim.key)
        safe =
          safe &&
          JSON.stringify(current) === JSON.stringify(claim.safety) &&
          independent(safety, current) &&
          !safety.dependencies.includes(claim.key) &&
          !current.dependencies.includes(key) &&
          (await verifySafety({
            jiraConfig,
            key: claim.key,
            safety: current,
            activeKeys: [key, ...inFlight.filter((active) => active !== claim.key)],
          }))
      }
    }
    if (!safe) {
      evaluated.push({
        key,
        eligible: false,
        reason: 'parallel safety unverified or conflicting; wait for serial admission',
      })
      continue
    }

    evaluated.push({ key, eligible: true, reason: null })
    return {
      selected: key,
      safety,
      summary: issue.fields.summary,
      priority: issue.fields.priority?.name ?? null,
      inFlight,
      maxParallelBuilds,
      evaluated,
    }
  }

  return { selected: null, reason: 'none-eligible', evaluated }
}

export function formatSelectionReport(result) {
  const lines = result.evaluated.map(
    (entry) =>
      `${entry.eligible ? '✓' : '·'} ${entry.key}${entry.reason ? ` — ${entry.reason}` : ''}`,
  )
  if (result.selected) {
    return `Diagnostic candidate only (no build permission): ${result.selected} (${result.priority ?? 'no priority'}): ${result.summary}\n${lines.join('\n')}\n`
  }
  if (result.reason === 'busy') {
    return `No selection: ${result.inFlight.length} of ${result.maxParallelBuilds} parallel builds are in flight (${result.inFlight.join(', ')}).\n`
  }
  return `No eligible issue found.\n${lines.join('\n')}\n`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jiraConfig = readJiraConfig(process.env)
  const githubConfig = readGitHubConfig(process.env)

  if (!jiraConfig) {
    process.stdout.write(
      'Selection skipped: JIRA_BASE_URL, JIRA_EMAIL or JIRA_API_TOKEN is not configured.\n',
    )
    process.exit(0)
  }
  if (!githubConfig) {
    process.stdout.write(
      'Selection skipped: GITHUB_TOKEN or GITHUB_REPOSITORY is not configured.\n',
    )
    process.exit(0)
  }

  try {
    const result = await selectNextReadyIssue({
      jiraConfig,
      githubConfig,
      maxParallelBuilds: resolveMaxParallelBuilds(process.env.COOKSMITH_MAX_PARALLEL_BUILDS),
    })
    process.stdout.write(formatSelectionReport(result))
  } catch (error) {
    process.stderr.write(`Selection failed: ${error.message}\n`)
    process.exit(1)
  }
}
