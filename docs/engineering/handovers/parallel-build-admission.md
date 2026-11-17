# Parallel build admission handover

- **Date:** 2026-11-17
- **Branch:** `chore/parallel-build-pickup`
- **Target:** `main`
- **Pull request:** https://github.com/rachcollo/cooksmith/pull/226
- **Status:** Implemented, validation pending
- **Initial PR head:** `d3c194f095ccbe604014c99cdc37037cb9b00322`
- **Baseline:** Initially integrated `37da4f748ef96c704ef4623c8a18aa656ec5f75f`;
  final main integration and published SHA are recorded in the PR evidence.

## Objective and product impact

Allow concurrent engineering builds only when safe, including overlapping scheduled
sessions and work before PR creation. Protect trust and remove manual contention
checks without changing application, database or product behaviour.

## Changes and affected components

- `scripts/engineering/admit-next-build.mjs`: clean current-main admission entrypoint.
- `scripts/engineering/lib/build-claims.mjs`: atomic fixed-name lock and durable claims.
- `scripts/engineering/lib/build-safety.mjs`: reviewed scope, epic, schema and dependency gates.
- Selector and GitHub inventory helpers: count reservations and pre-PR branches,
  paginate inventory, validate limits 1–3, preserve Jira approval/readiness gates.
- Readiness validator: reject Planned directories and misleading status strings.
- Selector, admission and readiness regression suites and module declarations.
- Delivery prompt, builder guide, index, orchestrator and operating-system docs;
  [runbook](../../operations/BUILD_ADMISSION.md) and proposed ADR 020.

No migrations, Edge Functions, providers, dependencies or protections changed.

## Validation

`npm ci` and `npm run preflight` passed. The final code validation passed formatting, lint, strict types, 912 tests across
109 files and production build. A pagination fixture initially matched `page=1`
inside `per_page=100`, repeating the fake page until a worker exited; the fixture
now reads the exact URL query parameter and the complete rerun passed.
Post-main-integration validation and exact-head CI are recorded in the PR.
Documentation-command audit, secret scan and production dependency audit passed
(the latter retains the existing reviewed React Router RSC exception). No live reservation was created.
Tests exercise overlapping atomic admissions, pre-PR capacity, duplicate story,
uncertain create/unlock, interrupted selection, owner mismatch, malformed state,
no age expiry, moving-main rejection, pagination, scope/epic/schema/dependency
conflicts and Planned-package gates.

Local Playwright is unavailable: `npm run preflight:e2e` found no Chromium;
`npm run test:e2e:install` failed because the CDN archive was truncated/not a ZIP.
`npm run db:prerequisites:runtime` failed because no running Docker-compatible
runtime is available. CI retains the full browser/database gates. Hosted preview,
manual device/accessibility testing and live GitHub tag permission tests were not
performed; no changed application journey requires new hosted acceptance.

## Runtime activation is pending

The coordinating owner must update the actual scheduled Routine after review and
merge. No dedicated Codex Routine management tool was available in this environment.
The required environment names `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, `JIRA_BASE_URL`,
`JIRA_EMAIL` and `JIRA_API_TOKEN` were all absent (presence checked only; no values
read or transmitted). Connector access does not establish runner credential access.
Do not activate or bypass admission until secure runner integration is verified.

A read-only remote-head inventory found 189 surviving non-package branches other
than main/v2. The conservative selector treats these as unverified work, so current
pickup is blocked until one-time reconciliation. No branches were deleted or
assumed complete. The reviewing coordinator received the exact SHA/name inventory
as `pr226-unverified-branches.txt`. This is a known operational boundary, not a claim
that all 189 branches represent live workers.

No `engineering/build-safety.json` entries are introduced. Even after reconciliation,
pickup remains serial until reviewed complete metadata is added for independent
stories. Do not infer scope or resolve product questions to create that metadata.

## Security, privacy, accessibility and cost

Only cooperative admission metadata is written to GitHub; no secrets or household
data belong in claims. New runner requirement is Contents write for tag/ref APIs;
no credentials were created and no protections weakened. Application accessibility
is unchanged. Additional provider/dependency cost is A$0 monthly / A$0 annually;
existing CI/agent usage may increase within the approved cap.

## Recovery, rollback and next action

Pause all admission sources before recovery. Prove owners stopped, reconcile exact
ref SHA/owner and receipts, then retire only confirmed completed/abandoned claims.
Never expire a live claim or force-recover by age. Rollback pauses pickup and preserves
outstanding claims. Human merge and protected production release gates remain.

Next action is independent review, exact-head CI, then coordinated merge and explicit
runtime integration. No later milestone or unresolved product work is started.
