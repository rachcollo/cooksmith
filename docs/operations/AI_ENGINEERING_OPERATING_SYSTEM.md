# Cooksmith AI engineering operating system

This document describes how Jira, GitHub, the repository engineering packages, AI
implementation and review, quality checks, Vercel previews, Supabase releases and
human approval fit together as one coordinated system. It links to the detailed
implementation documents rather than repeating them, and it records what this
change added versus what already existed.

Use Australian/UK English throughout Cooksmith engineering and product
documentation. Do not use em dashes in this document or in product copy.

## Operating principles

1. Jira is the product and delivery source of truth.
2. GitHub is the engineering execution and evidence source of truth.
3. Engineering packages implement Jira scope; they do not replace it.
4. Humans approve product scope, merging and production database and Edge
   Function releases.
5. AI may implement, test, review, diagnose and recommend fixes, but never
   merges its own work or releases production data changes unattended.
6. Every completed story leaves traceable evidence linking Jira, GitHub, the
   preview and the production release.

## Source-of-truth model

| Information                         | Authoritative system            |
| ----------------------------------- | ------------------------------- |
| User story and product outcome      | Jira                            |
| Acceptance criteria                 | Jira                            |
| Priority, dependencies and blockers | Jira                            |
| Delivery status                     | Jira                            |
| Technical implementation design     | Repository engineering package  |
| Files and components affected       | Repository engineering package  |
| Database and Edge Function impact   | Repository engineering package  |
| Test and verification plan          | Repository engineering package  |
| Code and migrations                 | GitHub                          |
| Review evidence                     | GitHub pull request             |
| Preview deployment                  | Vercel, linked from GitHub      |
| Production release evidence         | GitHub Actions                  |
| Final delivery summary              | Jira, linked to GitHub evidence |

## The lifecycle

```text
Jira story reaches Ready
  -> engineering package validated (existing package system, see below)
  -> implementation branch created           [Jira: Ready -> In Progress, automated]
  -> AI implements the story                 (Codex Builder Guide / Delivery Orchestrator)
  -> automated tests and quality checks run  (Cooksmith quality workflow)
  -> pull request and preview created        [Jira: -> In Review, automated]
  -> PR governance validates Jira/package linkage (PR governance workflow, new)
  -> AI review and human testing             (hosted preview, AI implementation checklist)
  -> human approves merge                    [human approval gate]
  -> production application deploys          (Vercel, on merge to main)
  -> database release requires separate approval   [human approval gate, protected workflow]
  -> Edge Function release requires separate approval [human approval gate, protected workflow]
  -> deployment verified                     (Deployment verification workflow, new)
  -> Jira updated with evidence              [Jira: -> Done, automated once verified]
```

Merging is never treated as delivery. An issue only reaches Done once the
required application, database and Edge Function releases are verified in
production, per the Codex Builder Guide's Phase 8 and the Jira sync workflow's
`production-verified` evidence comment.

## What already existed

Most of this operating system was already implemented as documentation and
protected workflows before this change. This change did not replace any of it:

- Engineering standards and required reading: [`AGENTS.md`](../../AGENTS.md),
  [Codex build rules](../engineering/CODEX_BUILD_RULES.md), [Development
  standards](../engineering/DEVELOPMENT_STANDARDS.md), [Database
  standards](../engineering/DATABASE_STANDARDS.md), [Testing
  standards](../engineering/TESTING_STANDARDS.md), [Release
  checklist](../engineering/RELEASE_CHECKLIST.md).
- Delivery automation guidance: [Delivery
  Orchestrator](../../Cooksmith_Delivery_Orchestrator/orchestrator/DELIVERY_ORCHESTRATOR.md),
  [Codex Builder Guide](../../engineering/CODEX_BUILDER_GUIDE.md), [Engineering
  Index](../../engineering/COOKSMITH_ENGINEERING_INDEX.md).
- Engineering package system: [`engineering/`](../../engineering/) (lifecycle
  folders) and [`docs/engineering/packages/`](../engineering/packages/README.md)
  (see "Known drift" below).
- Consolidated CI: [`.github/workflows/v2-quality.yml`](../../.github/workflows/v2-quality.yml)
  runs format, lint, type-check, unit/integration tests, production build,
  Playwright smoke tests and full local database validation (reset, lint,
  pgTAP, security contracts, generated-type freshness) on every pull request.
- Protected, SHA-locked production releases: [`production-database-release.yml`](../../.github/workflows/production-database-release.yml)
  and [`production-edge-function-release.yml`](../../.github/workflows/production-edge-function-release.yml),
  documented in [Production database releases](../engineering/v2/production-database-releases.md).
- PR template: [`.github/pull_request_template.md`](../../.github/pull_request_template.md).

## What this change added

The gap in the existing system was automation of coordination, not the
underlying standards. This change added:

1. **PR governance workflow**
   ([`.github/workflows/pr-governance.yml`](../../.github/workflows/pr-governance.yml),
   [`scripts/engineering/validate-pr-governance.mjs`](../../scripts/engineering/validate-pr-governance.mjs)).
   On every pull request targeting `main`, mechanically checks that the PR
   title contains a `CS-###` key, the branch references the same key, an
   engineering package exists that identifies itself as belonging to that
   key, migrations are declared when migration files changed, Edge Function
   changes are declared when function files changed, and the PR targets
   `main`. A PR title prefixed `chore:` or `infra:` (optionally scoped, for
   example `chore(ci):`) exempts a non-product infrastructure or tooling
   change from the Jira/branch/package checks; the migration, Edge Function
   and base-branch checks still apply. This PR is itself an example: its
   title is `chore: add AI engineering operating system automation`.
2. **Jira sync workflow**
   ([`.github/workflows/jira-sync.yml`](../../.github/workflows/jira-sync.yml),
   [`scripts/engineering/jira-sync.mjs`](../../scripts/engineering/jira-sync.mjs)).
   Best-effort, non-blocking Jira REST API calls that add evidence comments
   and move an issue forward (never backward) through Backlog -> Ready -> In
   Progress -> In Review -> Testing -> Done on branch creation, PR opened, PR
   merged, required-check failure and verified production release. Requires
   `JIRA_BASE_URL`, `JIRA_EMAIL` and `JIRA_API_TOKEN`; skips cleanly and never
   fails a build when they are absent.
3. **Deployment verification workflow**
   ([`.github/workflows/deployment-verification.yml`](../../.github/workflows/deployment-verification.yml),
   [`scripts/engineering/verify-deployment.mjs`](../../scripts/engineering/verify-deployment.mjs)).
   A manually triggered, public, unauthenticated smoke check against the
   production URL's `health.json` and application shell, run after a human or
   AI operator confirms the Vercel (and, where relevant, database and Edge
   Function) release completed. On success it can move the named Jira issue to
   Done with linked evidence.
4. **Delivery summary generator**
   ([`scripts/engineering/create-delivery-summary.mjs`](../../scripts/engineering/create-delivery-summary.mjs)),
   producing the same concise evidence block used by the deployment
   verification workflow, so a human can paste consistent evidence into Jira
   or a PR without copying full logs.
5. **Security job in the quality workflow**: a new `security` job in
   `v2-quality.yml` runs
   [`scripts/engineering/check-secrets-and-env-files.mjs`](../../scripts/engineering/check-secrets-and-env-files.mjs)
   (forbidden tracked `.env*` files, AWS key IDs, PEM private key blocks,
   Supabase service-role key assignments) and `npm run security:audit-production`.
6. **This document and the [operator guide](OPERATOR_GUIDE.md)**, and an
   explicit `Edge Functions changed in this PR` line added to the pull
   request template alongside the existing `Migrations in this PR` line.
7. **Automated pickup decision layer** (below). Two deterministic, tested
   scripts that decide _whether_ a story is safe to start building
   autonomously. They do not themselves start a build; that step still
   requires the scheduled trigger described below to be switched on.

None of this changes product functionality, application behaviour, or the
standards already documented above.

## Automated pickup

The target shape for delivery is: a product owner defines a story, an
engineering package is written to the standard format, the story is marked
Ready, and it is picked up for implementation automatically in priority
order, without anyone saying "Build CS-XX". This is a direct extension of the
"Next-Task Selection Rule" already documented in the [Engineering
Index](../../engineering/COOKSMITH_ENGINEERING_INDEX.md), which required a
human to apply it by judgement each time. It is now mechanically enforced.

### Automated package drafting and the `package-requested` label

The product owner writes the story in Jira and applies the
`package-requested` label. On its next firing, the delivery Routine drafts
the engineering package to the standard template, opens a docs-only pull
request titled `chore(package): CS-NN — engineering package` on a
`package/cs-nn-slug` branch, and links it from the Jira story. The draft
must pass the package readiness validator before the PR is opened.

The product owner's merge of that PR is the scope approval. On merge, the
Jira sync workflow's `package-merged` handler moves the story to Ready, adds
the `codex-ready` label and removes `package-requested`, so the story flows
straight into build pickup with no further manual step. Package PRs and
`package/` branches are excluded from the build selector's busy and
already-claimed checks, and from the In Progress/In Review status sync,
because they are proposals, not implementations.

### The `codex-ready` label is the build gate

Marking a story **Ready** in Jira is not by itself enough to trigger a build.
The `codex-ready` label must also be present. It is applied automatically
when a package PR is merged (that merge being the human approval), or
manually by a product owner who wrote the package themselves. Removing the
label at any time stops that story being picked up; it does not affect a
build already under way.

### Package readiness validator

[`scripts/engineering/validate-package-readiness.mjs`](../../scripts/engineering/validate-package-readiness.mjs)
checks that a linked engineering package is actually filled in, not just
present: no leftover template placeholders (`[Title]`, `[CS-###]`, `TBD`,
`TODO`, an untouched `Status: Planned | Ready | ...` line, and so on), a
`Status` field that reads as Ready, and a real set of acceptance-criteria
items (it reads both package conventions in this repository, checkbox-style
and plain-bulleted). A `Ready` + `codex-ready` story whose package fails this
check is never picked up, and is reported as skipped with the specific reason.

### Selection script

[`scripts/engineering/select-next-ready-issue.mjs`](../../scripts/engineering/select-next-ready-issue.mjs)
is the decision function, run by whatever starts a build. It:

1. Checks GitHub for any already-open pull request referencing a `CS-###`
   key. If one exists, it reports **busy** and stops immediately, enforcing
   the Engineering Index's "maximum one active issue" rule without querying
   Jira at all.
2. Queries Jira for `project = CS AND status = "Ready" AND labels =
"codex-ready"`.
3. Ranks candidates by priority (Highest to Lowest), then by lower Jira key
   for ties, matching the documented rule exactly.
4. For each candidate in that order: confirms every issue it "is blocked by"
   is Done (reading Jira's issue-link data directly, no extra calls), confirms
   no branch already exists for that key, and runs the readiness validator
   above. The first candidate that clears all three is selected.
5. Returns the selection, or a full list of every candidate considered and
   exactly why each was skipped, for an honest audit trail.

This script is read-only: it never changes Jira or GitHub state itself.

### What still starts the actual build

Selecting a story is not the same as implementing it. An engineering package
being "ready to build" still requires an actual agentic coding session to
follow the [Codex Builder Guide](../../engineering/CODEX_BUILDER_GUIDE.md):
branch, implement, validate, open a PR, stop before merge. That requires a
scheduled trigger that fires into a fresh session periodically, runs the
selector, and if it returns a selection, proceeds exactly as if a human had
said "Build CS-XX". Everything downstream is unchanged: the same PR
governance, the same required checks, the same human merge approval, the
same protected production releases.

The scheduled Routine's authoritative prompt, covering both package
drafting and build pickup, is version-controlled in
[DELIVERY_ROUTINE_PROMPT.md](DELIVERY_ROUTINE_PROMPT.md). When that file
changes, the Routine's configured prompt must be updated to match. Until the
Routine is created and enabled, none of this fires on its own: every build
still starts because a human said "Build CS-XX", exactly as before.

## Known drift found during discovery

Two parallel engineering package conventions exist in the repository:

- `engineering/{planned,ready,building,review,completed}/*.md`, described by
  the Engineering Index and Codex Builder Guide, and used by the most recent
  milestones (for example CS-18, CS-20, CS-21).
- `docs/engineering/packages/*.md`, described by `docs/README.md`'s authority
  index, used by CS-27 through CS-30.

Both conventions are honoured by the new PR governance check so neither
in-flight package is broken by this change. Consolidating to one location is
a real improvement but is out of scope here: it would touch packages that are
mid-flight (for example the open CS-21 PR references
`engineering/review/cs21-shopping-list-foundation.md`), and the brief for this
change explicitly avoids broad refactors and unrequested cleanup. Recommend
that the team pick one location (the lifecycle-folder `engineering/`
convention is the more actively used and better matches the Delivery
Orchestrator model) and migrate deliberately in its own reviewed PR.

## Human approval gates

Required for:

- changing product acceptance criteria;
- starting work with an unresolved product decision;
- merging a pull request;
- production database migrations (protected `production-database`
  environment, required reviewer, exact 40-character SHA, confirmation phrase
  `DEPLOY_PRODUCTION_DATABASE`);
- production Edge Function deployments (same protected environment,
  confirmation phrase `DEPLOY_PRODUCTION_EDGE_FUNCTION`);
- destructive or irreversible data operations;
- security-sensitive authentication changes;
- adding a paid provider or increasing baseline cost by more than A$20/month
  (see [cost approval checklist](../engineering/checklists/cost-approval.md));
- changing provider tiers;
- weakening branch protection or quality gates;
- running the deployment verification workflow (a human or AI operator
  chooses when to run it, after confirming the release actually happened).

AI recommendation, automated validation, human approval and completed action
are always distinguishable in this system: automated workflows validate and
record evidence; only a human-triggered merge, protected-environment approval
or workflow dispatch performs an irreversible or production-affecting action.

## Security controls

- Least-privilege workflow permissions: every new workflow declares
  `permissions: contents: read` and requests nothing broader.
- No secrets are ever printed; the Jira sync and production release workflows
  read credentials only from GitHub Actions secrets.
- Production release workflows run only on `workflow_dispatch` against
  `main`, never on `pull_request`, so forked or untrusted PR code can never
  trigger a production action or see production credentials.
- The new `security` quality job blocks tracked `.env*` files (other than
  `.env.example`) and flags high-confidence secret patterns on every PR; this
  complements, and does not replace, GitHub's native secret scanning (a
  repository-settings feature; see the operator guide for how to confirm it
  is enabled).
- `npm run security:audit-production` blocks merging when a high-severity production dependency
  vulnerability exists. Its checked-in review permits only GHSA-qwww-vcr4-c8h2 because Cooksmith is
  a browser-only SPA and does not enable React Router RSC mode or server actions; every other high or
  critical finding remains blocking.
- Jira sync only ever moves an issue forward through the fixed status order
  and only when Jira currently offers that transition, so a duplicate or
  out-of-order webhook cannot regress delivery status.

## Required GitHub secrets and environments

Named here without revealing any value. Configure these as repository or
environment secrets; see the operator guide for exact steps.

| Name                    | Scope                             | Purpose                                                                                  | Status                      |
| ----------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------- |
| `SUPABASE_ACCESS_TOKEN` | `production-database` environment | Already required by the existing production database and Edge Function release workflows | Existing                    |
| `SUPABASE_PROJECT_REF`  | `production-database` environment | Already required                                                                         | Existing                    |
| `SUPABASE_DB_PASSWORD`  | `production-database` environment | Already required by the database release workflow only                                   | Existing                    |
| `JIRA_BASE_URL`         | Repository secret                 | Jira Cloud site URL, for example `https://smillins.atlassian.net`                        | New, required for Jira sync |
| `JIRA_EMAIL`            | Repository secret                 | Email address of the Jira automation user                                                | New, required for Jira sync |
| `JIRA_API_TOKEN`        | Repository secret                 | Jira Cloud API token for that user                                                       | New, required for Jira sync |

If the three `JIRA_*` secrets are not configured, the Jira sync workflow
skips cleanly and every other workflow in this system continues to work
exactly as before. Jira availability is never required for a build to be
valid.

## Branch protection

This session could not read or change GitHub branch protection settings (no
API access to repository administration was available). Recommended settings
for `main`, to be applied manually by a repository administrator, are
documented in the [operator guide](OPERATOR_GUIDE.md#branch-protection-checklist-one-time).

## Observability and audit evidence

For every story, the following stay linked so anyone can answer "why was
this marked Done":

- Jira issue: request, acceptance criteria, status history, evidence comments
  added automatically by the Jira sync workflow.
- Engineering package: implementation contract and scope boundary.
- Pull request: diff, CI results, PR governance result, review comments,
  merge commit.
- Vercel preview: URL posted automatically by Vercel's GitHub integration.
- GitHub Actions run: quality checks, protected release approvals and logs.
- Deployment verification run: public smoke-check result and delivery
  summary, linked from the Jira Done evidence comment.

## Known limitations

- `create` and `workflow_run` triggered workflows (branch-created and
  CI-failure Jira sync) only become active once this change is merged to
  `main`, because GitHub Actions resolves those trigger types from the
  default branch's workflow file. Branch-created and CI-failure sync will not
  fire for pull requests opened before that merge.
- Jira's workflow for project `CS` has no distinct `Blocked` status (only
  Backlog, Ready, In Progress, In Review, Testing, Done). Use Jira's built-in
  flag (impediment) indicator or a `blocked` label plus a comment instead of
  a new workflow status; adding a status requires a Jira administration
  change this session did not make.
- The lightweight secret scan is a complement to, not a replacement for,
  GitHub's native secret scanning and push protection, which must be
  confirmed enabled in repository settings.
- Deployment verification checks only public, unauthenticated smoke signals.
  It is not a substitute for the hosted preview and manual verification steps
  already required by the Codex Builder Guide and Release Checklist.
