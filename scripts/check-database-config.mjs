import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

const root = process.cwd()
const configPath = join(root, 'supabase', 'config.toml')
const migrationPath = join(root, 'supabase', 'migrations')
const packagePath = join(root, 'package.json')
const requiredFiles = [
  configPath,
  join(root, 'supabase', 'seed.sql'),
  join(root, 'supabase', 'tests', '0001_infrastructure_baseline.test.sql'),
  join(root, 'src', 'infrastructure', 'database', 'generated', 'database.types.ts'),
]

const problems = []

for (const path of requiredFiles) {
  try {
    readFileSync(path)
  } catch {
    problems.push(`Required database foundation file is missing: ${path.slice(root.length + 1)}`)
  }
}

const config = readFileSync(configPath, 'utf8')

if (!config.includes('project_id = "cooksmith-v2-local"')) {
  problems.push('Supabase project_id must remain cooksmith-v2-local.')
}

if (/project_ref|access_token|service_role|password\s*=/.test(config)) {
  problems.push('supabase/config.toml contains a remote reference or credential-like setting.')
}

const apiSchemas = config.match(/\[api\][\s\S]*?schemas\s*=\s*\[([^\]]*)\]/)?.[1] ?? ''
if (/['"]cooksmith['"]/.test(apiSchemas)) {
  problems.push('The private cooksmith schema must not be exposed through the Data API.')
}

const migrations = readdirSync(migrationPath).filter((file) => file.endsWith('.sql'))
const migrationName = /^\d{14}_[a-z0-9_]+\.sql$/

if (migrations.length === 0) problems.push('At least one v2 migration is required.')

for (const migration of migrations) {
  if (!migrationName.test(basename(migration))) {
    problems.push(`Migration name is not timestamped and descriptive: ${migration}`)
  }
}

const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
const databaseScripts = Object.entries(packageJson.scripts ?? {}).filter(([name]) =>
  name.startsWith('db:'),
)
const unsafeCommand = /(\s|^)(--linked|--project-id|db push|db pull)(\s|$)/

for (const [name, command] of databaseScripts) {
  if (unsafeCommand.test(command)) {
    problems.push(`Database script ${name} may target a hosted project.`)
  }
}

if (problems.length > 0) {
  process.stderr.write(`Cooksmith database configuration is invalid:\n- ${problems.join('\n- ')}\n`)
  process.exit(1)
}

process.stdout.write(
  `Cooksmith database configuration is valid (${migrations.length} migration${migrations.length === 1 ? '' : 's'}).\n`,
)
