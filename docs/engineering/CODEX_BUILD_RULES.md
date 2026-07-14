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
- the active milestone dependencies, accepted reports and relevant ADRs.

Inspect the repository before coding. Reuse current conventions where they satisfy the approved architecture. Do not copy prototype code merely because it exists.

## 3. GitHub-first workflow

The user reviews in GitHub and must not be asked to perform Git or Terminal work except when every safe alternative is exhausted.

Codex must:

1. fetch and verify the latest accepted `v2` baseline;
2. create the task branch itself;
3. keep `main` unchanged;
4. implement and validate the full approved scope even when publishing is unavailable;
5. commit locally with the exact requested message;
6. publish the branch and open a pull request targeting `v2` when credentials or the connected GitHub workflow are available;
7. verify the remote tree matches the validated local tree;
8. monitor required GitHub Actions checks and fix in-scope failures;
9. provide a verified patch or Git bundle when no publishing route exists.

Never force-push, rewrite shared history, expose credentials or stop solely because GitHub CLI, credentials, Docker, a browser or a physical device is unavailable. Never ask the user to authenticate a local terminal when the connected GitHub workflow can complete the handover.

## 4. Branch, commit and milestone discipline

- Work on one named branch from the latest accepted `v2` commit.
- Never work directly on `main` or `v2`.
- Keep commits intentional and scoped. Use the requested completion message exactly.
- Do not include unrelated cleanup, speculative refactors or later-milestone foundations.
- Execute milestones sequentially. Do not begin the next milestone until the current pull request is accepted and merged.
- Preserve immutable shared migrations, accepted ADRs and existing user changes.
- Target normal milestone pull requests to `v2`. A change to `main` requires separate explicit release approval.

## 5. Scope and architecture quality

- State the approved outcome, Product Principles supported and user effort removed before implementation.
- Keep domain logic framework-independent and follow the dependency direction in [Development standards](DEVELOPMENT_STANDARDS.md).
- Prefer the smallest design that meets current approved behaviour.
- Do not add speculative abstractions, fake actions, placeholder services or unused dependencies.
- Record a durable, material architecture decision using [Architecture decisions](ARCHITECTURE_DECISIONS.md). An ADR documents approval; it does not grant product scope.
- Preserve backwards compatibility where the roadmap or currently accepted application requires it.

## 6. Validation and testing

Run every applicable repository-standard check, normally:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Run browser, accessibility, database, RLS, responsive, preview-safety and other specialised suites whenever the task affects them. Tests must verify meaningful behaviour rather than snapshots alone. Fix in-scope failures and add regression coverage for defects.

When a runtime is unavailable, run every remaining check, preserve the CI gate and report exactly what remains. Do not claim a manual, assistive-technology, device, provider or database check that was not performed.

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

## 10. Completion report and handover

Every task must finish with an evidence-based completion report containing:

1. status;
2. baseline branch and commit;
3. scoped implementation summary;
4. files, migrations and dependencies changed;
5. validation commands and actual results;
6. accessibility, security, privacy, production and cost confirmation;
7. known limitations and explicitly deferred work;
8. branch and local commit hash;
9. publishing status, remote commit and pull request link;
10. readiness for the next milestone without beginning it.

Create or update the repository handover using the [handover template](templates/milestone-handover.md). Documentation must match the implementation and remote CI result.

## 11. Stop conditions

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
