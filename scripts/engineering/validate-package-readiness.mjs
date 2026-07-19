import { readFileSync } from 'node:fs'

import { findPackageReferencing } from './lib/packages.mjs'

// Literal boilerplate left over from engineering/ENGINEERING_PACKAGE_TEMPLATE.md
// when a section was never actually filled in.
const PLACEHOLDER_STRINGS = [
  '[ID]',
  '[Title]',
  '[CS-###]',
  '[Epic / key]',
  '[type]/[jira-key]-[slug]',
  '[issue keys or None]',
  '[status]/[filename]',
  'Planned | Ready | Building | In Review | Testing | Done',
  'Testable result.',
  'Concrete, testable delivery item.',
  'Related capability intentionally deferred.',
  'Describe the user or operational outcome',
  'Describe observable behaviour.',
]
const PLACEHOLDER_TOKEN_PATTERN = /\b(TBD|TODO|FIXME)\b/i
const MIN_ACCEPTANCE_CRITERIA = 3
const CHECKBOX_LIST_ITEM = /^\s*[-*]\s*\[[ xX]\]\s*\S/
const PLAIN_LIST_ITEM = /^\s*[-*]\s+\S/
const HEADING_LINE = /^#{1,6}\s/
const LOOKAHEAD_LINES = 15

function extractStatus(content) {
  const match = content.match(/\*\*Status:?\*\*\s*:?\s*`?([^\n`]+?)`?\s*$/im)
  return match?.[1]?.trim() ?? null
}

// The package conventions in this repository are not consistent with each
// other, or even with their own template: engineering/ready packages put
// checkboxes directly under "### FR-N" headings with no "Acceptance
// criteria" label at all; docs/engineering/packages/ uses one plain bulleted
// "## Acceptance Criteria" section with no checkboxes. Read both signals and
// take whichever finds real content, so neither convention is penalised for
// not being the other.
function countCheckboxItems(content) {
  return content
    .split('\n')
    .filter((line) => CHECKBOX_LIST_ITEM.test(line) && !line.includes('Testable result.')).length
}

function countPlainListItemsNearHeading(content) {
  const lines = content.split('\n')
  let total = 0
  for (let i = 0; i < lines.length; i += 1) {
    if (!/acceptance criteria/i.test(lines[i])) continue
    for (let j = i + 1; j < Math.min(i + LOOKAHEAD_LINES, lines.length); j += 1) {
      const line = lines[j]
      if (HEADING_LINE.test(line)) break
      if (line.includes('Testable result.')) continue
      if (CHECKBOX_LIST_ITEM.test(line) || PLAIN_LIST_ITEM.test(line)) total += 1
    }
  }
  return total
}

function countAcceptanceCriteriaItems(content) {
  return Math.max(countCheckboxItems(content), countPlainListItemsNearHeading(content))
}

export function assessPackageReadiness({ jiraKey, cwd = process.cwd() } = {}) {
  const checks = []

  const packagePath = findPackageReferencing(jiraKey, cwd)
  checks.push(
    packagePath
      ? { ok: true, message: `Engineering package found for ${jiraKey}: ${packagePath}.` }
      : {
          ok: false,
          message: `No engineering package under engineering/ or docs/engineering/packages/ references ${jiraKey}.`,
        },
  )
  if (!packagePath) return checks

  const content = readFileSync(packagePath, 'utf8')

  const foundPlaceholders = PLACEHOLDER_STRINGS.filter((token) => content.includes(token))
  const hasTokenPlaceholder = PLACEHOLDER_TOKEN_PATTERN.test(content)
  checks.push(
    foundPlaceholders.length === 0 && !hasTokenPlaceholder
      ? { ok: true, message: 'No unresolved template placeholders found.' }
      : {
          ok: false,
          message: `Package still contains unresolved template placeholders: ${[
            ...foundPlaceholders,
            ...(hasTokenPlaceholder ? ['TBD/TODO/FIXME'] : []),
          ].join(', ')}.`,
        },
  )

  const status = extractStatus(content)
  checks.push(
    status && /ready/i.test(status)
      ? { ok: true, message: `Package status is "${status}".` }
      : {
          ok: false,
          message: status
            ? `Package status is "${status}", not a Ready state.`
            : 'Package has no readable **Status:** field.',
        },
  )

  const acceptanceCriteriaCount = countAcceptanceCriteriaItems(content)
  checks.push(
    acceptanceCriteriaCount >= MIN_ACCEPTANCE_CRITERIA
      ? {
          ok: true,
          message: `Package has ${acceptanceCriteriaCount} acceptance-criteria checkbox items.`,
        }
      : {
          ok: false,
          message: `Package has only ${acceptanceCriteriaCount} acceptance-criteria checkbox items; at least ${MIN_ACCEPTANCE_CRITERIA} are required.`,
        },
  )

  return checks
}

export function formatReadinessReport(checks) {
  const ok = checks.every((check) => check.ok)
  const lines = checks.map((check) => `${check.ok ? '✓' : '✗'} ${check.message}`)
  return {
    ok,
    text: `Cooksmith package readiness ${ok ? 'passed' : 'failed'}:\n${lines.join('\n')}\n`,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jiraKey = process.argv[2]
  if (!jiraKey) {
    process.stderr.write('Usage: validate-package-readiness.mjs <CS-###>\n')
    process.exit(1)
  }
  const result = formatReadinessReport(assessPackageReadiness({ jiraKey }))
  ;(result.ok ? process.stdout : process.stderr).write(result.text)
  process.exit(result.ok ? 0 : 1)
}
