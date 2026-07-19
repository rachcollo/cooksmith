# Cooksmith v2 Codex build rules

These rules govern every Codex implementation, documentation and repository-governance task in Cooksmith v2. Read them before inspecting or changing the repository. More specific task instructions may narrow scope but must not weaken security, production protection or the GitHub-first workflow.

## 1. Authority and conflicts

Use this order when instructions conflict:

1. [Product Principles](../product/Cooksmith_Product_Principles.md)
2. [Product Specification](../product/Cooksmith_Product_Specification.md)
3. [Functional Specification and User Story Catalogue](../product/Cooksmith_Functional_Specification_and_User_Story_Catalogue.md)
4. [Technical Architecture Specification](Cooksmith_Technical_Architecture_Specification.md)
5. [Implementation Roadmap](Cooksmith_Implementation_Roadmap.md)
6. Accepted [architecture decisions](ARCHITECTURE_DECISIONS.md)
7. These build rules and the specialist engineering standards
8. The active approved task prompt

The Product Principles govern trade-offs. The standalone Implementation Roadmap governs milestone numbering, sequencing and scope. Stop and report a material conflict that cannot be resolved using this hierarchy.

## 2. Required reading

Before every task, read:

- repository `AGENTS.md` and `docs/README.md`;
- this file;
- [Development standards](DEVELOPMENT_STANDARDS.md);
- [Testing standards](TESTING_STANDARDS.md);
- [Release checklist](RELEASE_CHECKLIST.md);
- [Database standards](DATABASE_STANDARDS.md) for any database, Supabase, Auth, RLS or generated-type work;
- the active milestone dependencies, accepted reports and relevant ADRs;
- the [AI engineering operating system](../operations/AI_ENGINEERING_OPERATING_SYSTEM.md) for how Jira, GitHub, CI, Vercel and Supabase releases coordinate.

Inspect the repository before coding. Reuse current conventions where they satisfy the approved architecture. Do not copy prototype code merely because it exists.

## 3. Baseline and GitHub-first workflow

The user reviews in GitHub and must not be asked to perform Git or Terminal work except when every safe alternative is exhausted.

Before editing, Codex must:

1. begin from the latest remote `main` unless the approved task explicitly names another base;
2. verify the active branch and that the working tree is clean;
3. fetch, or otherwise prove, that local `main` matches the latest remote `main`;
4. create one scoped task branch from that verified baseline;
5. report the exact baseline commit SHA in the completion report and handover.

Do not build a milestone or engineering package on top of another feature branch unless the task explicitly instructs it. Renaming a local branch does not prove it is based on remote `main`. If no Git remote is configured, or remote `main` cannot be verified, stop before making claims about rebasing, pushing, remote updates or opening a pull request, and report the limitation precisely.

Codex must still implement and validate the approved local scope when safe, commit locally with the exact requested message, publish the branch and open a pull request targeting `main` only when credentials or the connected GitHub workflow are available, verify that the remote tree matches the validated local tree, monitor required GitHub Actions checks, and provide a verified patch or Git bundle when no publishing route exists.

Never force-push, rewrite shared history, expose credentials or stop solely because GitHub CLI, credentials, Docker, a browser or a physical device is unavailable. Never ask the user to authenticate a local terminal when the connected GitHub workflow can complete the handover.

## 4. Branch, commit and milestone discipline

- Work on one named branch from the latest accepted `main` commit during the temporary MVP workflow.
- Never work directly on `main`.
- Keep commits intentional and scoped. Use the requested completion message exactly.
- Do not include unrelated cleanup, speculative refactors or later-milestone foundations.
- Implement only the named package; do not introduce opportunistic product features, redesign unrelated architecture, change provider configuration unless explicitly in scope, or silently expand scope to adjacent issues.
- Execute milestones sequentially. Do not begin the next milestone until the current pull request is accepted and merged.
- Preserve immutable shared migrations, accepted ADRs and existing user changes.
- Target normal milestone pull requests to `main` while ADR 009 is active. Merging remains an explicit reviewed action and automatically deploys the private MVP.

## 5. Scope and architecture quality

- State the approved outcome, Product Principles supported and user effort removed before implementation.
- Keep domain logic framework-independent and follow the dependency direction in [Development standards](DEVELOPMENT_STANDARDS.md).
- Prefer the smallest design that meets current approved behaviour.
- Do not add speculative abstractions, fake actions, placeholder services or unused dependencies.
- Record a durable, material architecture decision using [Architecture decisions](ARCHITECTURE_DECISIONS.md). An ADR documents approval; it does not grant product scope.
- Preserve backwards compatibility where the roadmap or currently accepted application requires it.

## 6. Local validation before publishing

Before committing, pushing, opening or updating a pull request, run `npm run preflight` to verify local tool, environment-name and Git readiness, then run the repository's required local validation. At minimum run:

```text
npm ci
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Run the formatter in write mode before `format:check`; do not rely on CI to discover fixable formatting issues. After any fix, rerun the complete affected validation, and rerun the full minimum suite before final handover unless a runtime is unavailable.

Where relevant, also run `npm run docs:commands:check`, database configuration checks, local Supabase reset, database lint, pgTAP and RLS suites, generated type freshness, Playwright, responsive checks, accessibility checks, Markdown link checks, whitespace checks, and secret or credential scans. Report unavailable runtimes exactly. Do not claim a check passed if it was not run.

Tests must assert user-visible and domain behaviour, avoid coupling to implementation timing where possible, use the real browser URL as the source of truth for `history.replaceState()` cleanup, distinguish in-memory router state from browser history state, avoid arbitrary sleeps, and use bounded deterministic retries only when justified. Investigate flaky tests instead of treating a rerun as sufficient evidence; document transient failures and the root cause when known.

Managed-runner warnings such as `npm warn Unknown env config "http-proxy"` are environment warnings, not repository failures, when they originate from managed runner environment variables. Report them, avoid unnecessary project changes, and investigate only when the warning originates from repository configuration.

## 7. Completion statuses

Use only the status set required by the task. Unless the task defines a narrower set:

- **Complete:** implementation and all available required validation passed.
- **Implemented, validation pending:** implementation and available checks passed, but a required environment-dependent check remains.
- **Implemented, manual validation pending:** automated checks passed, but an explicitly required device, browser or assistive-technology check remains.
- **Blocked:** safe implementation cannot continue because of a material scope, authority, baseline, production, cost or repository-access problem.

Missing GitHub CLI, publishing credentials, Docker, VoiceOver or a physical device is not by itself a blocker.

## 8. Security, privacy and production protection

- Never commit or expose secrets, tokens, private keys, service-role values, real household data or sensitive environment files.
- Use synthetic, deterministic fixtures and redact errors, logs, screenshots and reports.
- Validate untrusted input at the approved boundary. Do not bypass application or database validation.
- Keep permissions deterministic. Frontend state, email addresses and user-editable JWT metadata are not authorisation sources.
- RLS remains the final household boundary for exposed private tables. Follow [Database standards](DATABASE_STANDARDS.md).
- Do not access, link, migrate, reset, seed or reconfigure Production without an explicit production task, deployment plan and approval.
- Keep local, Preview and Production configuration separate. Never copy staging secrets into Production or expose server secrets to browser code.
- Scan staged content for credentials before every commit. Stop immediately if exposure is suspected and follow the approved incident response.

## 9. Costs and dependencies

- Do not add a paid provider, hosted service, tier change or recurring cost without the [cost approval checklist](checklists/cost-approval.md) and explicit approval.
- State monthly and annual cost impact, including `A$0`.
- Prefer existing approved dependencies. Any addition must solve a current approved need, be exact-versioned, regenerate the lockfile and pass the dependency review in [Development standards](DEVELOPMENT_STANDARDS.md).
- Do not activate a provider merely because it appears in the target architecture.

## 10. Pull requests, completion reports and handover

Codex must not claim that a branch was pushed, a remote was updated, a pull request was opened, a pull request is conflict-free, a pull request targets `main`, or checks are running or passed unless those facts are verified. A `make_pr` or equivalent metadata tool does not count as a real pull request unless it returns a public GitHub pull-request URL or PR number. If the environment lacks a Git remote, `gh` context, connector write access or network access, report the limitation precisely and do not imply the remote action occurred.

Every package pull request must target `main` unless explicitly instructed otherwise, use a branch created from the verified baseline, remain draft until required automated and hosted validation is complete, avoid unrelated files, include the exact scope, include actual validation results, identify unrun checks, and avoid merging automatically unless explicitly requested. The **PR governance** check enforces a `CS-###` Jira key in the PR title matching the branch name, a matching engineering package, and explicit migration/Edge Function declarations; do not open a pull request that would fail it. Use a `chore:`/`infra:` title prefix instead of a Jira key for non-product infrastructure and tooling PRs; the migration/Edge Function and base-branch checks still apply. Before handover, verify base branch, head branch, draft state, mergeability, changed files, CI status, Vercel status and PR URL when the remote is accessible.

Every task must finish with an evidence-based completion report containing:

1. status;
2. baseline branch and commit;
3. scoped implementation summary;
4. files, migrations and dependencies changed;
5. automated local validation commands and actual results;
6. GitHub Actions validation;
7. Vercel preview validation, hosted provider validation and manual validation, each separated from local automation;
8. unavailable checks, known limitations and assumptions;
9. accessibility, security, privacy, production and cost confirmation;
10. branch, local commit hash, publishing status, remote commit and pull request link;
11. readiness for the next milestone without beginning it.

Do not use broad claims such as “all validation passed” if Playwright, hosted auth, database checks or manual validation were unavailable. Include actual commands and outcomes. Create or update the repository handover using the [handover template](templates/milestone-handover.md). Documentation must match the implementation and verified remote CI result.

## 11. Hosted preview and authentication validation

Every user-facing milestone or engineering package must include a hosted preview validation section stating the exact flows to test, synthetic accounts or data to use, expected outcomes, what remains unverified, and whether the preview was actually tested. Do not claim hosted validation was completed unless it was performed.

Any change affecting login, signup, magic links, PKCE, password reset, logout, session restoration, auth route guards, onboarding gates or invitation authentication callbacks requires hosted validation against a real Vercel preview and the configured Supabase project. Unit and integration tests alone are not sufficient evidence for hosted authentication behaviour. Where applicable, hosted validation must verify email/password login, magic-link login, logout, password reset, onboarding, invitation acceptance, protected route access, refresh persistence, callback URL cleanup, no redirect loop, and no browser refresh required after a successful callback.

Magic-link preview validation must use this sequence:

1. Open the exact Vercel preview URL.
2. Complete Vercel preview authentication first if Deployment Protection is enabled.
3. Add the exact preview callback URL to Supabase redirect URLs when required.
4. Log out of any existing Cooksmith session.
5. Request a brand-new magic link from the preview.
6. Keep the same browser context open.
7. Open the link in the same browser context.
8. Do not reuse a previous magic link.
9. Confirm the callback remains on the intended preview hostname.
10. Confirm the PKCE code is removed.
11. Confirm the authenticated app opens without browser refresh.

A different browser, private session or profile may not contain the PKCE verifier. Vercel Deployment Protection can interrupt callback testing if authentication is completed only after clicking the magic link. Testing from an already-authenticated or partially persisted session can produce misleading results.

Authentication UX must stay low-friction and product-aligned: successful authentication should continue directly into Cooksmith, unnecessary success confirmation clicks must not be added, intermediate success screens should exist only where user action is genuinely required, failure recovery screens remain appropriate, and first-time onboarding may still interrupt the flow when required. Successful magic-link sign-in should eventually proceed directly into the app; do not implement that UX change outside an approved task.

## 12. Database migration release discipline

Any package containing a Supabase migration must state that the pull request does not deploy Production, Production deployment occurs only after merge, the protected **Production database release** workflow must be used, the exact approved `main` SHA must be released, dry-run and migration-history verification are mandatory, released migrations are immutable, and fixes use new forward migrations. Normal CI must not connect to or deploy hosted Production.

## 13. Stop conditions

Stop, preserve completed safe work and request direction when:

- the accepted baseline cannot be identified or the repository is not writable;
- authoritative documents materially conflict;
- the requested action would broaden approved scope or begin a later milestone;
- a required action could affect Production, real users or real data without explicit approval;
- a destructive migration lacks backup confirmation and separate approval;
- a provider or cost change lacks approval;
- a credential or privacy exposure is suspected;
- existing accepted functionality cannot be preserved safely;
- required recipient, external authority or irreversible action is ambiguous.

Do not use a stop condition to avoid safe inspection, local implementation, non-Docker validation, local commit or an available GitHub handover.
