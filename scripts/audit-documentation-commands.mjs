import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')
const docs = [
  'README.md',
  'docs/engineering/CODEX_BUILD_RULES.md',
  'docs/engineering/TESTING_STANDARDS.md',
  'docs/engineering/RELEASE_CHECKLIST.md',
  'docs/engineering/v2/database-workflow.md',
  'docs/engineering/v2/environment-and-preview.md',
  '.github/pull_request_template.md',
]
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
