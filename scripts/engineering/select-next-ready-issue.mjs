// Selects the highest-priority Jira issue eligible for an autonomous build,
// implementing the "Next-Task Selection Rule" in
// engineering/COOKSMITH_ENGINEERING_INDEX.md. Builds may run in parallel up
// to a fixed limit; each call still selects at most one new issue. Read-only:
// this script never changes Jira or GitHub state. The `codex-ready` label is the human
// approval gate — a product owner must apply it deliberately before an
// issue can ever be picked up here.

import { jiraFetch, readConfig as readJiraConfig } from './lib/jira.mjs'
import {
  listBranches,
  listOpenPullRequests,
  readConfig as readGitHubConfig,
} from './lib/github.mjs'
import { assessPackageReadiness } from './validate-package-readiness.mjs'
import { EXEMPT_PREFIX_PATTERN } from './validate-pr-governance.mjs'

const PRIORITY_RANK = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 }
const JIRA_KEY_IN_TEXT = /\bCS-(\d+)\b/i
// Parallel execution is authorised by the product owner up to this many
// builds in flight (open, non-exempt pull requests carrying a CS key).
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
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_MAX_PARALLEL_BUILDS
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
} = {}) {
  // Infrastructure PRs, including "chore(package):" engineering-package
  // drafts awaiting product-owner approval, are docs-only and do not count
  // as a build in flight even when their titles carry a Jira key.
  const openPulls = await listOpenPullRequests(githubConfig)
  const inFlight = [
    ...new Set(
      openPulls
        .filter(
          (pr) =>
            !EXEMPT_PREFIX_PATTERN.test(pr.title ?? '') && JIRA_KEY_IN_TEXT.test(pr.title ?? ''),
        )
        .map((pr) => `CS-${pr.title.match(JIRA_KEY_IN_TEXT)[1]}`),
    ),
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

  const branches = await listBranches(githubConfig)
  const branchNames = branches.map((branch) => branch.name)

  const search = await jiraFetch(
    jiraConfig,
    `/rest/api/3/search?jql=${encodeURIComponent(JQL)}&fields=summary,priority,status,labels,issuelinks`,
  )
  const ranked = rankIssues(search.issues ?? [])

  const evaluated = []
  for (const issue of ranked) {
    const key = issue.key

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

    evaluated.push({ key, eligible: true, reason: null })
    return {
      selected: key,
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
    return `Selected ${result.selected} (${result.priority ?? 'no priority'}): ${result.summary}\n${lines.join('\n')}\n`
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
