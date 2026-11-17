import { execFileSync } from 'node:child_process'
import { admitBuild, githubClaimStore } from './lib/build-claims.mjs'
import { readConfig as readGitHubConfig } from './lib/github.mjs'
import { readConfig as readJiraConfig } from './lib/jira.mjs'
import { resolveMaxParallelBuilds, selectNextReadyIssue } from './select-next-ready-issue.mjs'

// Run in an isolated, clean checkout of the exact current remote main.
try {
  const githubConfig = readGitHubConfig(process.env)
  const jiraConfig = readJiraConfig(process.env)
  if (!githubConfig || !jiraConfig)
    throw new Error('GitHub/Jira credentials required; no admission')
  const maxParallelBuilds = resolveMaxParallelBuilds(process.env.COOKSMITH_MAX_PARALLEL_BUILDS)
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
  if (git('status', '--porcelain')) throw new Error('Admission requires a clean checkout')
  const baseline = git('rev-parse', 'HEAD')
  const remote = git('ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0]
  if (baseline !== remote) throw new Error('Checkout is not current remote main')
  // Prevent locking a different repository from the checkout being evaluated.
  const origin = git('remote', 'get-url', 'origin').replace(/\.git$/, '')
  if (
    ![
      `https://github.com/${githubConfig.owner}/${githubConfig.repo}`,
      `git@github.com:${githubConfig.owner}/${githubConfig.repo}`,
    ].includes(origin)
  )
    throw new Error('GitHub repository does not match origin')
  const result = await admitBuild({
    store: githubClaimStore(githubConfig),
    baseline,
    select: (claims) =>
      selectNextReadyIssue({ githubConfig, jiraConfig, claims, maxParallelBuilds }),
  })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} catch (error) {
  process.stderr.write(`No build permission: ${error.message}\n`)
  process.exitCode = 1
}
