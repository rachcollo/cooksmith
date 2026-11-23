# Build admission recovery handover

- **Date:** 2026-11-17
- **Branch:** `chore/build-admission-recovery`
- **Target:** `main`
- **Verified baseline:** `c04bf896aa90805c4ea70a6d8420b5c8b47b430c`
- **Status:** Implemented, validation pending. Draft review only; no adoption or release.
- **Commit / pull request:** See the publishing receipt and exact-head checks in the PR.

## Objective and authority

Implement the owner's one-off “Yes action and then fix” governance bootstrap.
Normal admission cannot select an already existing repair. This exception permits
this scoped governance preparation, not future bypasses or feature work. No claim
was fabricated. The Product Principle supported is dependable delivery protecting
household trust; user effort removed is repeated manual recovery from an admission
deadlock. Product behaviour is unchanged.

## Changes

Freeze configuration and admission/selector guards; an explicit existing-repair CLI;
exact external manifest validation; existing atomic mutex and immutable claims;
per-manifest consumption receipts; package lifecycle allowance with completeness
checks retained; recovery tests, ADR 021 and runbook. No application, migration,
Edge Function, dependency, release workflow or hosted configuration changes.

## Rechecked remote evidence before implementation

- 237 branches: 40 baseline/package exemptions and 197 non-exempt branches,
  deduplicating to 113 identities (58 story keys, 55 unknown branch identities).
- No `refs/tags/cooksmith-builds/*` refs; no `engineering/build-safety.json`.
- #227 merged at 2026-11-17T21:50:50Z into the baseline above; GitHub's Vercel
  status is success. No independent production application inspection performed.
- Five open non-draft PRs, all targeting main, with heads:
  - #228: `2acd74287c44c09159872196d9682bed5ab6944c`.
  - #231: `b13e54b025ad0db7f2add534486a842731bab109`.
  - #232: `9931a20d1f4eb88330bbb59a6c08514d0760745b`.
  - #233: `815bcc1a7d41201056aa90967e96b97e4d535b49`.
  - #234: `1e63e592af50366c15fc6ec059823653c8eda02d`.
- #231 still has unresolved nested onCancel P2 review. #234's issue comment
  6948309605 still records the P1 lock-order and P2 validation-before-lock hold;
  absence of inline threads is not clearance. No review clearance inferred for any PR.
- CS-113 retained branch is `9e782f0191ba8c4ea1222ec6e87d7e56014b68bb`, with no open
  PR in the complete inventory. Its denied publication was not retried.

These facts are a discovery snapshot, not an adoption manifest. Owner liveness and
stop/join evidence remain unverified. No branch was classified as safely stopped.
Publishing this governance branch itself changes inventory, so a fresh exact
inventory is mandatory after mechanism acceptance.

## Validation and independent review

| Local check                                                                   | Result                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm ci --cache /tmp/cooksmith-npm-cache`                                     | Passed, 431 packages; initial default cache was unwritable                            |
| `npm run preflight`                                                           | Blocked by read-only Supabase CLI configuration directory, detailed below             |
| `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck` | Passed                                                                                |
| `npm run test`                                                                | 112 files, 972 tests passed                                                           |
| `npm run build`                                                               | Passed; existing large-chunk advisory                                                 |
| `npm run docs:commands:check`                                                 | Passed, 211 documentation files                                                       |
| `npm run engineering:validate-pr`                                             | Passed for scoped chore title, branch and main base                                   |
| `npm run engineering:check-secrets`, `npm run security:audit-production`      | Passed; existing reviewed router advisory exception retained                          |
| `npm run test:e2e`                                                            | 58 Chromium/mobile passes, 2 existing opt-in skips; 12 WebKit checks could not launch |
| WebKit installation in `/tmp`                                                 | Downloaded; required system libraries unavailable, so no WebKit pass claimed          |
| Independent read-only review                                                  | No remaining blocking findings; 4 focused suites, 93 tests passed                     |

The first complete test attempt exposed nine selector tests relying on the real
checkout. They now use isolated fixtures, with a separate regression proving the
repository freeze stops selection before network access. The subsequent complete
suite passed. GitHub Actions exact-head evidence remains in the PR publishing
receipt; no remote CI result is claimed by this pre-publication handover.

No hosted preview interaction, physical-device validation, disposable-repository
API contract or owner-termination check was performed. Database validation is not
applicable to this governance-only diff; remote required CI remains mandatory.

Independent read-only review found and prompted fixes for circular in-repository
inventory, incomplete PR ownership coverage, missing safety dependencies and a CLI
import. Re-review found no blocking code finding; focused recovery/admission/package
tests passed. The reviewer did not certify live GitHub permissions, owner liveness
or hosted validation.

## Secure runtime and operational limits

The current shell has no GitHub/Jira admission environment configuration. Read-only
GitHub CLI access exists, but is not substituted for the admission credential
contract. No credentials were created, copied, printed or transmitted. Local
preflight's pinned Supabase CLI attempts to create `/home/agent/.supabase` and fails
because that filesystem is read-only. Production database/provider validation is
not applicable to this governance-only diff; no hosted database was accessed.

The operator must verify actual external approval and stop/join evidence. Presence
of an HTTPS link does not prove either. Test tag/ref permissions in a disposable
repository before running a separately accepted adoption. Retain tag protection.
Keep the scheduler disabled, all old workers stopped, and all branches intact.
No live lock, claim or adoption receipt was written in this task.

## Accessibility, security, privacy and cost

No UI or household-data behaviour changes. Synthetic tests only. Existing quality,
release, dependency, tag and production gates remain. A$0 additional monthly and
annual provider/dependency cost. No real emails, paid providers, secrets or real
household data used. Staged files receive the repository secret check before commit.

## Rollback and next step

Keep new admission frozen and retain all lock, claim and consumption refs on any
uncertainty. Returning to ordinary or parallel builds requires separate reviewed
safety verification. No expiry or automatic cleanup exists.

After this mechanism is accepted, positively reconcile all owners and sources,
review an exact external inventory plus digest/baseline for CS-111 PR #231, and
execute one adoption in the secure runtime. Only its successful receipt permits
that bounded existing repair. Application fixes, merges, hosted release validation,
scheduler restart and parallel activation are deferred.
