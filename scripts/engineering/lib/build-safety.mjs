import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { jiraFetch } from './jira.mjs'

export function readSafety(cwd, key) {
  const path = join(cwd, 'engineering/build-safety.json')
  if (!existsSync(path)) return null
  const registry = JSON.parse(readFileSync(path, 'utf8'))
  if (!registry || typeof registry !== 'object' || Array.isArray(registry))
    throw new Error('Malformed safety registry')
  const entry = registry[key]
  if (entry === undefined) return null
  if (
    !entry ||
    !/^CS-\d+$/.test(entry.epic) ||
    typeof entry.schemaChange !== 'boolean' ||
    !Array.isArray(entry.scopes) ||
    !entry.scopes.length ||
    entry.scopes.some((scope) => typeof scope !== 'string' || !/^[a-z][a-z0-9-]*$/.test(scope)) ||
    !Array.isArray(entry.dependencies) ||
    entry.dependencies.some((dep) => !/^CS-\d+$/.test(dep) || dep === key) ||
    Object.keys(entry).sort().join(',') !== 'dependencies,epic,schemaChange,scopes'
  )
    throw new Error(`Malformed safety metadata for ${key}`)
  return entry
}

export async function verifySafety({ jiraConfig, key, safety }) {
  if (!safety) return false
  const issue = await jiraFetch(jiraConfig, `/rest/api/3/issue/${key}?fields=parent,issuelinks`)
  if (
    issue.fields?.parent?.key !== safety.epic ||
    issue.fields?.parent?.fields?.issuetype?.name?.toLowerCase() !== 'epic' ||
    !Array.isArray(issue.fields?.issuelinks)
  )
    return false
  // Unknown link types/directions are not evidence of independence.
  for (const link of issue.fields.issuelinks) {
    if (link.type?.name !== 'Blocks') return false
    const other = link.inwardIssue ?? link.outwardIssue
    if (!other?.key || other.fields?.status?.name?.toLowerCase() !== 'done') return false
  }
  for (const dependency of safety.dependencies) {
    const issue = await jiraFetch(jiraConfig, `/rest/api/3/issue/${dependency}?fields=status`)
    if (issue.fields?.status?.name?.toLowerCase() !== 'done') return false
  }
  return true
}

export function independent(a, b) {
  return Boolean(
    a &&
    b &&
    !a.schemaChange &&
    !b.schemaChange &&
    a.epic !== b.epic &&
    !a.scopes.some((scope) => b.scopes.includes(scope)),
  )
}
