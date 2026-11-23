import { readFileSync } from 'node:fs'
import { readSafety } from './lib/build-safety.mjs'
import { execFileSync } from 'node:child_process'
import {
  readRecovery,
  inventorySnapshot,
  adoptRecovery,
  reviewedManifest,
} from './lib/build-recovery.mjs'
import { githubClaimStore } from './lib/build-claims.mjs'
import {
  listBranches,
  listOpenPullRequests,
  readConfig as githubConfigFrom,
} from './lib/github.mjs'
import { jiraFetch, readConfig as jiraConfigFrom } from './lib/jira.mjs'
import { readBlockingLink } from './lib/jira-dependencies.mjs'
import { assessPackageReadiness } from './validate-package-readiness.mjs'

try {
  const githubConfig = githubConfigFrom(process.env)
  const jiraConfig = jiraConfigFrom(process.env)
  if (!githubConfig || !jiraConfig) throw new Error('Secure GitHub/Jira runtime required')
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
  const baseline = process.argv[2]
  if (process.argv.length !== 5 || !/^[a-f0-9]{40}$/.test(baseline ?? ''))
    throw new Error(
      'Supply exact reviewed main SHA, external manifest path and reviewed SHA-256 digest',
    )
  if (
    git('status', '--porcelain') ||
    git('rev-parse', 'HEAD') !== baseline ||
    git('ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0] !== baseline
  )
    throw new Error('Clean exact remote main checkout required')
  if (
    `${githubConfig.owner}/${githubConfig.repo}` !== 'rachcollo/cooksmith' ||
    !['https://github.com/rachcollo/cooksmith', 'git@github.com:rachcollo/cooksmith'].includes(
      git('remote', 'get-url', 'origin').replace(/\.git$/, ''),
    )
  )
    throw new Error('Repository mismatch')
  readRecovery()
  const manifest = reviewedManifest(
    readFileSync(process.argv[3], 'utf8'),
    process.argv[4],
    baseline,
  )
  const result = await adoptRecovery({
    store: githubClaimStore(githubConfig),
    baseline,
    manifest,
    inventory: async () =>
      inventorySnapshot(await listBranches(githubConfig), await listOpenPullRequests(githubConfig)),
    checkDependencies: async (target) => {
      if (
        !assessPackageReadiness({ jiraKey: target.key, recovery: true }).every((check) => check.ok)
      )
        return false
      const issue = await jiraFetch(
        jiraConfig,
        `/rest/api/3/issue/${target.key}?fields=status,issuelinks`,
      )
      if (
        issue.key !== target.key ||
        !['In Progress', 'In Review', 'Testing'].includes(issue.fields?.status?.name) ||
        !Array.isArray(issue.fields?.issuelinks)
      )
        return false
      for (const link of issue.fields.issuelinks) {
        const dependency = readBlockingLink(link)
        if (
          !dependency ||
          (dependency.upstream && dependency.issue.fields?.status?.name !== 'Done')
        )
          return false
      }
      const safety = readSafety(process.cwd(), target.key)
      for (const key of new Set([...target.dependencies, ...(safety?.dependencies ?? [])])) {
        const dependency = await jiraFetch(jiraConfig, `/rest/api/3/issue/${key}?fields=status`)
        if (dependency.key !== key || dependency.fields?.status?.name !== 'Done') return false
      }
      return true
    },
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} catch (error) {
  process.stderr.write(`No build permission: ${error.message}\n`)
  process.exitCode = 1
}
