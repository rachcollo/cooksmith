import { parseArgs } from './lib/args.mjs'

// Generates a concise, machine-produced delivery evidence summary for pasting
// into Jira or a pull request, instead of copying full logs. See "Observability
// and audit evidence" in docs/operations/AI_ENGINEERING_OPERATING_SYSTEM.md.

export function createDeliverySummary({
  jiraKey,
  prUrl,
  mergeCommit,
  releaseCommit,
  appStatus,
  dbStatus,
  edgeStatus,
  verificationUrl,
} = {}) {
  const lines = [
    `# Delivery summary — ${jiraKey ?? 'unknown issue'}`,
    '',
    `- Pull request: ${prUrl ?? 'not recorded'}`,
    `- Merge commit: ${mergeCommit ?? 'not recorded'}`,
    `- Release commit: ${releaseCommit ?? 'not recorded'}`,
    `- Application deployment: ${appStatus ?? 'not reported'}`,
    `- Database migration: ${dbStatus ?? 'not reported'}`,
    `- Edge Functions: ${edgeStatus ?? 'not reported'}`,
    `- Production verification: ${verificationUrl ?? 'not reported'}`,
  ]
  return `${lines.join('\n')}\n`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2))
  process.stdout.write(createDeliverySummary(args))
}
