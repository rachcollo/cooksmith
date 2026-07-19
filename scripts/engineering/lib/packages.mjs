import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const PACKAGE_DIRECTORIES = ['engineering', 'docs/engineering/packages']

// Index, guide and template files describe the package system rather than being a
// package themselves, and often mention Jira keys only as examples.
const NON_PACKAGE_FILENAMES = new Set([
  'CODEX_BUILDER_GUIDE.md',
  'COOKSMITH_ENGINEERING_INDEX.md',
  'ENGINEERING_PACKAGE_TEMPLATE.md',
  'README.md',
])

export function markdownFiles(directory) {
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
export function ownJiraKey(content) {
  const metadataField = content.match(/^-\s*\*\*Jira issue:\*\*\s*`?(CS-\d+)`?/im)
  if (metadataField) return metadataField[1].toUpperCase()

  const heading = content.match(/^#\s.*\b(CS-\d+)\b/im)
  if (heading) return heading[1].toUpperCase()

  return null
}

export function findPackageReferencing(jiraKey, cwd) {
  const candidates = PACKAGE_DIRECTORIES.flatMap((directory) => markdownFiles(join(cwd, directory)))
  return candidates.find((path) => ownJiraKey(readFileSync(path, 'utf8')) === jiraKey.toUpperCase())
}
