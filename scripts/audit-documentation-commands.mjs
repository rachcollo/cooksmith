import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')
function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return markdownFiles(path)
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : []
  })
}

const docs = ['README.md', '.github/pull_request_template.md', ...markdownFiles('docs')].sort()
let failed = false
for (const file of docs) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/npm run ([\w:-]+)/g)) {
    if (!pkg.scripts[match[1]]) {
      console.error(`${file}: npm run ${match[1]} is not defined`)
      failed = true
    }
  }
}
if (failed) process.exit(1)
console.log(`Documentation command audit passed for ${docs.length} files.`)
