// Jira exposes the linked issue at the endpoint named by its relation to the
// current issue: inwardIssue = "is blocked by"; outwardIssue = "blocks".
// Require the actual labels too: custom/reversed link types are not evidence
// that work is independent. CS-111 -> CS-122 and CS-79/101 -> CS-116 confirm
// this shape in the read-only Jira evidence supplied for this correction.
export function readBlockingLink(link) {
  if (
    link?.type?.name !== 'Blocks' ||
    link.type.inward !== 'is blocked by' ||
    link.type.outward !== 'blocks' ||
    Boolean(link.inwardIssue) === Boolean(link.outwardIssue)
  )
    return null
  const issue = link.inwardIssue ?? link.outwardIssue
  if (!/^CS-\d+$/.test(issue?.key)) return null
  return { issue, upstream: Boolean(link.inwardIssue) }
}
