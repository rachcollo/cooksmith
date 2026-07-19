import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const JIRA_KEY_PATTERN = /\bCS-(\d+)\b/i
// Infrastructure and tooling changes (this governance system itself, CI,
// scripts, repository docs) are not product scope and have no Jira story to
// reference. A "chore:" or "infra:" title prefix, with an optional scope like
// "chore(ci):", opts a PR out of the Jira/branch/package checks below, but not
// out of the migration/Edge Function declaration or base-branch checks.
const EXEMPT_PREFIX_PATTERN = /^(chore|infra)(\([^)]*\))?:\s/i
const PACKAGE_DIRECTORIES = ['engineering', 'docs/engineering/packages']
const MIGRATION_PATH_PATTERN = /^supabase\/migrations\/.*\.sql$/
const EDGE_FUNCTION_PATH_PATTERN = /^supabase\/functions\//
// Index, guide and template files describe the package system rather than being a
// package themselves, and often mention Jira keys only as examples.
const NON_PACKAGE_FILENAMES = new Set([
  'CODEX_BUILDER_GUIDE.md',
  'COOKSMITH_ENGINEERING_INDEX.md',
  'ENGINEERING_PACKAGE_TEMPLATE.md',
  'README.md',
])

function markdownFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return markdownFiles(path)
    return entry.isFile() && entry.name.endsWith('.md') && !NON_PACKAGE_FILENAMES.has(entry.name)
      ? [path]
      : []
  })
}

// Reads only the field/heading that identifies a package's own Jira issue, not
// every mention of a Jira key in the file (dependency and "blocks" references
// must not create a false match for another issue).
function ownJiraKey(content) {
  const metadataField = content.match(/^-\s*\*\*Jira issue:\*\*\s*`?(CS-\d+)`?/im)
  if (metadataField) return metadataField[1].toUpperCase()

  const heading = content.match(/^#\s.*\b(CS-\d+)\b/im)
  if (heading) return heading[1].toUpperCase()

  return null
}

function findPackageReferencing(jiraKey, cwd) {
  const candidates = PACKAGE_DIRECTORIES.flatMap((directory) => markdownFiles(join(cwd, directory)))
  return candidates.find((path) => ownJiraKey(readFileSync(path, 'utf8')) === jiraKey.toUpperCase())
}

function declaresYes(body, label) {
  const pattern = new RegExp(`${label}[^\\n]*?:\\s*\\**\\s*yes\\b`, 'i')
  return pattern.test(body ?? '')
}

export function collectGovernanceChecks({
  prTitle,
  prBody,
  branchName,
  baseBranch = 'main',
  changedFiles = [],
  cwd = process.cwd(),
} = {}) {
  const checks = []

  const exemptMatch = prTitle?.match(EXEMPT_PREFIX_PATTERN)
  if (exemptMatch) {
    checks.push({
      ok: true,
      message: `PR title uses the "${exemptMatch[0].trim()}" prefix; Jira and engineering-package linkage is not required for infrastructure changes.`,
    })
  } else {
    const titleMatch = prTitle?.match(JIRA_KEY_PATTERN)
    checks.push(
      titleMatch
        ? { ok: true, message: `PR title references Jira issue CS-${titleMatch[1]}.` }
        : {
            ok: false,
            message: `PR title must contain a Jira key matching CS-### (title: "${prTitle ?? ''}"), or use a "chore:"/"infra:" prefix for non-product changes.`,
          },
    )

    if (!titleMatch) {
      return checks
    }

    const jiraKey = `CS-${titleMatch[1]}`
    const branchMatch = branchName?.match(new RegExp(`\\bcs-${titleMatch[1]}\\b`, 'i'))
    checks.push(
      branchMatch
        ? { ok: true, message: `Branch "${branchName}" references ${jiraKey}.` }
        : {
            ok: false,
            message: `Branch "${branchName ?? ''}" must reference the same Jira key as the PR title (${jiraKey}).`,
          },
    )

    const packagePath = findPackageReferencing(jiraKey, cwd)
    checks.push(
      packagePath
        ? { ok: true, message: `Engineering package found for ${jiraKey}: ${packagePath}.` }
        : {
            ok: false,
            message: `No engineering package under engineering/ or docs/engineering/packages/ references ${jiraKey}.`,
          },
    )
  }

  const migrationFiles = changedFiles.filter((path) => MIGRATION_PATH_PATTERN.test(path))
  if (migrationFiles.length > 0) {
    checks.push(
      declaresYes(prBody, 'Migrations in this PR')
        ? { ok: true, message: `PR declares migrations for: ${migrationFiles.join(', ')}.` }
        : {
            ok: false,
            message: `Migration files changed (${migrationFiles.join(', ')}) but the PR description does not declare "Migrations in this PR: yes".`,
          },
    )
  }

  const edgeFunctionFiles = changedFiles.filter((path) => EDGE_FUNCTION_PATH_PATTERN.test(path))
  if (edgeFunctionFiles.length > 0) {
    checks.push(
      declaresYes(prBody, 'Edge Functions changed in this PR')
        ? {
            ok: true,
            message: `PR declares Edge Function changes for: ${edgeFunctionFiles.join(', ')}.`,
          }
        : {
            ok: false,
            message: `Edge Function files changed (${edgeFunctionFiles.join(', ')}) but the PR description does not declare "Edge Functions changed in this PR: yes".`,
          },
    )
  }

  checks.push(
    baseBranch === 'main'
      ? { ok: true, message: 'Pull request targets main.' }
      : { ok: false, message: `Pull request must target main; found "${baseBranch ?? ''}".` },
  )

  return checks
}

export function formatGovernanceReport(checks) {
  const ok = checks.every((check) => check.ok)
  const lines = checks.map((check) => `${check.ok ? '✓' : '✗'} ${check.message}`)
  return {
    ok,
    text: `Cooksmith PR governance ${ok ? 'passed' : 'failed'}:\n${lines.join('\n')}\n`,
  }
}

function loadGitHubEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath || !existsSync(eventPath)) return null
  return JSON.parse(readFileSync(eventPath, 'utf8'))
}

function changedFilesFromGit(baseSha, headSha, cwd) {
  if (!baseSha || !headSha) return []
  const result = spawnSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], {
    cwd,
    encoding: 'utf8',
  })
  if (result.status !== 0) return []
  return result.stdout.split('\n').filter(Boolean)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const event = loadGitHubEvent()
  const pullRequest = event?.pull_request
  const cwd = process.cwd()
  const changedFiles = changedFilesFromGit(pullRequest?.base?.sha, pullRequest?.head?.sha, cwd)
  const checks = collectGovernanceChecks({
    prTitle: pullRequest?.title ?? process.env.PR_TITLE,
    prBody: pullRequest?.body ?? process.env.PR_BODY,
    branchName: pullRequest?.head?.ref ?? process.env.PR_HEAD_REF,
    baseBranch: pullRequest?.base?.ref ?? process.env.PR_BASE_REF ?? 'main',
    changedFiles,
    cwd,
  })
  const result = formatGovernanceReport(checks)
  ;(result.ok ? process.stdout : process.stderr).write(result.text)
  process.exit(result.ok ? 0 : 1)
}
