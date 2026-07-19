import { parseArgs } from './lib/args.mjs'
import { jiraFetch, readConfig } from './lib/jira.mjs'

// Safe, best-effort Jira status and evidence sync for GitHub events.
//
// Requires JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN. When any are missing this
// script prints a notice and exits 0 so Jira availability never blocks CI or a
// merge. Never logs secret values. Only ever transitions a Jira issue forward
// through the fixed workflow rank below, and only when the target transition is
// currently offered by Jira, so a re-run or out-of-order event cannot regress
// status.

const STATUS_RANK = {
  backlog: 0,
  ready: 1,
  'in progress': 2,
  'in review': 3,
  testing: 4,
  done: 5,
}

function runsToAdf(lines) {
  return {
    type: 'doc',
    version: 1,
    content: lines.map((runs) => ({
      type: 'paragraph',
      content: runs.map((run) =>
        run.href
          ? { type: 'text', text: run.text, marks: [{ type: 'link', attrs: { href: run.href } }] }
          : { type: 'text', text: run.text },
      ),
    })),
  }
}

async function addComment(config, issueKey, lines) {
  await jiraFetch(config, `/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    body: JSON.stringify({ body: runsToAdf(lines) }),
  })
}

async function currentStatusRank(config, issueKey) {
  const issue = await jiraFetch(config, `/rest/api/3/issue/${issueKey}?fields=status`)
  const name = issue.fields.status.name.toLowerCase()
  return { name, rank: STATUS_RANK[name] ?? -1 }
}

async function transitionForward(config, issueKey, targetStatusName) {
  const targetRank = STATUS_RANK[targetStatusName.toLowerCase()]
  const current = await currentStatusRank(config, issueKey)
  if (current.rank >= targetRank) {
    return { moved: false, reason: `already at or past "${current.name}"` }
  }

  const { transitions } = await jiraFetch(config, `/rest/api/3/issue/${issueKey}/transitions`)
  const match = transitions.find((t) => t.name.toLowerCase() === targetStatusName.toLowerCase())
  if (!match) {
    return { moved: false, reason: `no transition to "${targetStatusName}" is currently offered` }
  }

  await jiraFetch(config, `/rest/api/3/issue/${issueKey}/transitions`, {
    method: 'POST',
    body: JSON.stringify({ transition: { id: match.id } }),
  })
  return { moved: true }
}

const HANDLERS = {
  async 'branch-created'(config, args) {
    const result = await transitionForward(config, args.key, 'In Progress')
    await addComment(config, args.key, [
      [
        { text: `Branch ${args.branch} created` },
        args.actor ? { text: ` by ${args.actor}` } : { text: '' },
        { text: `. Commit: ${args.sha ?? 'unknown'}.` },
      ],
      [
        {
          text: result.moved
            ? 'Status moved to In Progress.'
            : `Status not changed automatically (${result.reason}).`,
        },
      ],
    ])
  },

  async 'pr-opened'(config, args) {
    const result = await transitionForward(config, args.key, 'In Review')
    await addComment(config, args.key, [
      [{ text: 'Pull request opened: ' }, { text: args.prUrl, href: args.prUrl }],
      [
        {
          text: result.moved
            ? 'Status moved to In Review. Required checks and preview validation are in progress.'
            : `Status not changed automatically (${result.reason}).`,
        },
      ],
    ])
  },

  async 'pr-merged'(config, args) {
    await addComment(config, args.key, [
      [{ text: 'Pull request merged: ' }, { text: args.prUrl, href: args.prUrl }],
      [{ text: `Merge commit: ${args.mergeCommit ?? 'unknown'}.` }],
      [
        {
          text: 'Merging is not delivery. This issue stays out of Done until required application, database and Edge Function releases are verified in production.',
        },
      ],
    ])
  },

  async 'ci-failure'(config, args) {
    await addComment(config, args.key, [
      [
        { text: `${args.workflowName ?? 'A required check'} failed: ` },
        { text: args.runUrl, href: args.runUrl },
      ],
      [{ text: 'No Jira status was changed by this event.' }],
    ])
  },

  async 'production-verified'(config, args) {
    const result = await transitionForward(config, args.key, 'Done')
    await addComment(config, args.key, [
      [{ text: 'Production delivery evidence' }],
      [{ text: `Release commit: ${args.releaseCommit ?? 'unknown'}` }],
      [{ text: `Application: ${args.appStatus ?? 'not reported'}` }],
      [{ text: `Database migration: ${args.dbStatus ?? 'not reported'}` }],
      [{ text: `Edge Functions: ${args.edgeStatus ?? 'not reported'}` }],
      [
        {
          text: `Verification: ${args.verificationUrl ?? args.verificationSummary ?? 'not reported'}`,
          href: args.verificationUrl,
        },
      ],
      [
        {
          text: result.moved
            ? 'Status moved to Done.'
            : `Status not changed automatically (${result.reason}). Move to Done manually once evidence is confirmed.`,
        },
      ],
    ])
  },
}

export { HANDLERS, STATUS_RANK, transitionForward, readConfig }

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, ...rest] = process.argv.slice(2)
  const config = readConfig(process.env)

  if (!config) {
    process.stdout.write(
      'Jira sync skipped: JIRA_BASE_URL, JIRA_EMAIL or JIRA_API_TOKEN is not configured.\n',
    )
    process.exit(0)
  }

  const handler = HANDLERS[command]
  if (!handler) {
    process.stderr.write(`Unknown jira-sync command: ${command}\n`)
    process.exit(1)
  }

  const args = parseArgs(rest)
  if (!args.key) {
    process.stdout.write('Jira sync skipped: no Jira key was resolved for this event.\n')
    process.exit(0)
  }

  try {
    await handler(config, args)
    process.stdout.write(`Jira sync (${command}) completed for ${args.key}.\n`)
  } catch (error) {
    process.stderr.write(`Jira sync (${command}) failed for ${args.key}: ${error.message}\n`)
    process.exit(1)
  }
}
