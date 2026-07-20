# Operator guide

A plain-language guide for running Cooksmith delivery day to day. It assumes
no engineering background. For the full technical picture, see the [AI
engineering operating system](AI_ENGINEERING_OPERATING_SYSTEM.md).

## Start a story

1. In Jira, move the story to **Ready** once it has a clear outcome,
   acceptance criteria, known dependencies and a linked engineering package.
2. Confirm the engineering package link is present and matches the story
   (check the package's own Jira key, not just a mention of it).
3. Ask the coding agent: "Build CS-XX" (using the real Jira key).

The agent will create a branch, move Jira to **In Progress** automatically
once the branch exists, implement only the approved package, run the
required checks, and open a pull request. It will stop before merging.

### Automated flow (once the scheduled Routine is live)

Once the scheduled Routine described in the [AI engineering operating
system](AI_ENGINEERING_OPERATING_SYSTEM.md#automated-pickup) is live, you do
not write engineering packages or say "Build CS-XX" at all. Your whole part
of starting a story becomes:

1. Write the story in Jira: outcome, acceptance criteria, dependencies.
2. Add the `package-requested` label.
3. Within a couple of hours, a small pull request appears titled
   `chore(package): CS-XX — engineering package`, and a link is posted on
   the Jira story. Read it: does the proposed scope match what you meant?
   Are the acceptance criteria right? This two-minute read is your scope
   approval, so take it seriously; it is much cheaper to fix scope here than
   in a finished build.
4. Merge the package PR. The story moves to **Ready** and gets the
   `codex-ready` label automatically. You do nothing else.
5. The next scheduled run picks it up and builds it, in priority order, as
   long as nothing else is mid-build and its dependencies are Done.

You can still do any step manually: write the package yourself, add
`codex-ready` by hand, or say "Build CS-XX" to start a build immediately.
The automation only fills in whichever steps you have not done.

To pause drafting for a story, remove the `package-requested` label. To
pause building for a story, remove the `codex-ready` label; a build already
under way is not affected. To pause everything, disable the scheduled
Routine. The Routine's exact prompt lives in
[DELIVERY_ROUTINE_PROMPT.md](DELIVERY_ROUTINE_PROMPT.md); keep the Routine
and that file in sync.

## Review a build

1. Open the pull request in GitHub. Check that the required checks are
   green: **Cooksmith quality** and **PR governance**.
2. If PR governance fails, read its message. It tells you exactly what is
   missing (for example a Jira key in the title, or an undeclared
   migration). Ask the agent to fix it; do not override it manually.
3. Open the Vercel preview link posted on the pull request.
4. Run the human test instructions from the pull request description.
5. Check the "Findings" or review comments from the AI reviewer. Any
   **Blocker** or **High** finding must be resolved before the story is
   ready for testing.
6. When you are satisfied, approve and merge the pull request.

Merging deploys the application automatically through Vercel. It does not,
by itself, release a database migration or an Edge Function, and it does not
mark Jira Done.

## Release a database migration

Only do this after the pull request that contains the migration has merged
to `main`, and only for a commit you have reviewed.

1. In GitHub, open the merged pull request and copy the **full 40-character
   SHA** of the merge commit (shown on the PR's "Merged" line, or in the
   commit history of `main`).
2. Go to **Actions -> Production database release -> Run workflow**.
3. Select `main`.
4. Paste the exact SHA into `release_commit`.
5. Type `DEPLOY_PRODUCTION_DATABASE` into `confirmation`, exactly as shown.
6. Run the workflow, then approve the `production-database` environment
   deployment when GitHub prompts you.
7. Read the dry-run output before the migrations apply. It lists exactly
   which migrations will run. If anything looks unexpected, cancel and ask
   the engineering agent to investigate instead of proceeding.
8. After it finishes, the workflow re-checks that migration history is
   current. If that final check fails, stop and escalate; do not re-run.

## Release Edge Functions

Only do this after the matching database migration (if any) has already been
released.

1. Confirm the exact `main` commit SHA you are releasing is the same one you
   used for the database release, unless they are genuinely unrelated
   changes.
2. Go to **Actions -> Production Edge Function release -> Run workflow**.
3. Select `main`, paste the SHA, and type
   `DEPLOY_PRODUCTION_EDGE_FUNCTION` into `confirmation`.
4. Approve the protected environment deployment when prompted.
5. Confirm the workflow reports the function deployed and JWT verification
   still enabled.

The approved SHA for a database release does not authorise a different
commit for an Edge Function release, or vice versa. Each workflow checks its
own exact commit.

## Verify production and close out Jira

After the application, and any required database or Edge Function releases,
have completed:

1. Go to **Actions -> Deployment verification -> Run workflow**.
2. Enter the production URL, the Jira key, the release commit SHA, and a
   short plain-language database and Edge Function status (for example "no
   migration" or "applied"). For the URL, use the production base address
   `https://app.smillins.com.au` (scheme and host, no path or query string),
   and not a per-deployment preview URL. The workflow trims a pasted browser
   URL to its origin, but a preview URL behind Vercel Deployment Protection
   will still fail because it serves a login page instead of the app. See
   [Production domain setup](PRODUCTION_DOMAIN_SETUP.md) for how that domain
   is configured.
3. Run it. On success, it posts delivery evidence to Jira and moves the
   issue towards Done automatically.
4. Do a final human smoke test of the real feature in production yourself
   before treating the story as fully delivered. The automated check only
   confirms the site is up and serving the right build; it does not test the
   feature itself.

## Handle failures

| Situation                                                                        | What to do                                                                                                                                                                                                |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A required quality check failed                                                  | Open the failed check's log in GitHub Actions. Ask the agent to fix the specific failure; do not merge with a red check.                                                                                  |
| Generated database types are stale                                               | The agent needs to run `npm run db:types` locally with Supabase running and commit the result. This is not something to fix by hand in GitHub.                                                            |
| A migration dry-run failed                                                       | Stop. Do not proceed to apply. Ask the agent to investigate the mismatch between the migration and the hosted database before trying again.                                                               |
| The Vercel preview failed to build                                               | Check the Vercel deployment log linked from the pull request. This usually mirrors a `npm run build` failure; ask the agent to fix it and push again.                                                     |
| An Edge Function deployment failed                                               | Check the workflow log for the exact step that failed. Do not retry blindly; confirm the function source is correct first.                                                                                |
| The pull request merged but a database or Edge Function release is still pending | This is expected and safe. The story is not Done yet. Follow the release steps above when you are ready, then run deployment verification.                                                                |
| Something looks wrong in production after a release                              | Do not attempt to fix it by editing the database directly. Follow the incident and rollback approach in the pull request (every migration PR documents one) or ask the agent for a forward-fix migration. |
| A Jira comment or status update did not appear                                   | This does not mean the build failed. Jira sync is best-effort and never blocks a merge. Check the `Jira sync` workflow run in GitHub Actions for the actual error, and update Jira by hand if needed.     |

## One-time setup checklists

### Branch protection checklist (one time)

Apply these settings to `main` in **Settings -> Branches** (classic protection
rules) or **Settings -> Rules -> Rulesets** (newer GitHub UI). This session
could not read or change these settings; a repository administrator must apply
them manually.

- Require a pull request before merging; disallow direct pushes to `main`.
- Target branch: choose **Default branch** (or add `main` by name). `main` is
  this repository's default branch, so "Default branch" already covers it.
- Require these status checks to pass before merging. The check-name search
  only matches individual **job** names, not workflow names, and only lists a
  job once it has run at least once. Search for and add each of these ten:
  - `Validate Jira and engineering-package linkage` (the PR governance job)
  - `Environment preflight`
  - `Database validation`
  - `Format and docs`
  - `Lint`
  - `Type-check`
  - `Unit and integration tests`
  - `Production build`
  - `Playwright smoke tests`
  - `Secrets, environment files and dependency audit`
    Do not add the Jira sync or Deployment verification jobs; neither is meant
    to block merging.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Dismiss stale pull request approvals when new commits are pushed.
- Do not allow force pushes.
- Restrict who can delete the branch (or disallow deletion entirely).
- Do not allow administrators to bypass these rules, if your GitHub plan
  supports that option.

### Jira automation setup (one time)

To turn on the automated Jira status and evidence comments:

1. In Jira, create (or choose) a service account with permission to comment
   on and transition issues in the `CS` project.
2. Create an API token for that account at
   `https://id.atlassian.com/manage-profile/security/api-tokens`.
3. In GitHub, go to **Settings -> Secrets and variables -> Actions** and add:
   - `JIRA_BASE_URL`: your Jira site URL, for example
     `https://smillins.atlassian.net`.
   - `JIRA_EMAIL`: the service account's email address.
   - `JIRA_API_TOKEN`: the token from step 2.

Until these are set, everything else in this system keeps working exactly as
before; Jira status updates simply do not happen automatically, and you can
continue updating Jira by hand.

### Confirm GitHub secret scanning is enabled (one time)

In **Settings -> Code security**, confirm secret scanning and push protection
are turned on for this repository. The repository-level check added by this
change is a narrow complement to this feature, not a replacement for it.
