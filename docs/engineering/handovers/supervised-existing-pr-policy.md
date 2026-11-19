# Supervised existing-PR policy handover

- Date: 2026-11-19
- Branch: `chore/supervised-existing-pr-repair`
- Target: `main`
- Verified baseline: `a9ec57d844a934f6f8e7e43618dbc20e414cf8d7`
- Status: draft governance proposal; exact published SHA, review and CI in PR receipt.

## Outcome

The owner authorised reversal of the repository-imposed deadlock while accepting
unresolved old-worker concurrency risk. This scoped governance branch was created
from verified current main. No claim was invented. The change adds a supervised
manual existing-PR exception; it does not revert the executable freeze or automate
an alternative admission path. Active contributor, build, release, Routine and
index instructions link the same exception; ADR 022 records the policy change.
Historical evidence (retained unchanged): [original recovery](build-admission-recovery.md)
and [PR base correction](recovery-pr-base-evidence.md). Their then-current admission
requirements are superseded only for the supervised exception; their observations
and denial records remain historical facts, not current cessation certificates.

The runtime scripts, tests, freeze configuration, production workflows, dependencies
and application code are unchanged. Existing behavioral tests remain the evidence
that ordinary pickup still refuses admission. No synthetic fixture is a live receipt.
No branches/refs are deleted, rewritten or cleared. The observed five open feature
PR heads are unchanged; no cooksmith-builds refs were present at discovery.

## Risk and limits

There is no proof that all old sessions stopped. Serial selection and head checks
are cooperative supervision, not an exclusive writer fence. The default-branch
ruleset and connector expected-SHA leases cannot prevent all conflicting feature
writes. Existing claims/locks still stop this route pending separate reconciliation.
The earlier CS-111 archive denial remains binding; this policy authorises no retry
or substitute stopping action. No credentials or platform permissions change.

## Validation and review

Run repository preflight, dependency install, format/check, lint, typecheck, full
unit/integration tests, build, documented-command audit, secret/dependency checks
and exact-head CI. Record actual outcomes in the PR; local preflight/WebKit have
previously been limited by this managed filesystem and missing host libraries.
Independent review must assess operative coherence, automatic admission risk,
evidence retention, honesty of guarantees and publication/release protection.
No hosted product flow, live admission, archive or production action is tested here.

## 20 November beta critical path

1. Human review and merge of this policy PR. It enables only explicit supervisor
   selection of one bounded existing-PR repair, with its head/main/evidence record.
2. Finish all five unfinished PRs (#228, #231, #232, #233 and #234), selecting
   one explicit bounded existing-PR repair at a time with fresh evidence. Complete
   each repair's required tests, independent review and exact-head CI, respecting
   dependencies and separate hosted/release requirements. If #231 is selected,
   its nested onCancel repair needs a genuinely nested regression; full route
   adoption is not implied by that bounded repair.
3. After the existing-PR phase, address the reported planner allergy and freezer
   replacement issues as final MVP work. Each requires a defined bounded scope
   and appropriate authority; this existing-PR exception does not authorise new
   feature work or establish the details of either defect.
4. Then complete release checks: verify relevant hosted journeys, review threads,
   migrations/Edge Function impact and the exact release commit. Rach separately
   approves merge/release; use existing protected production workflows where
   needed and verify the actual deployment.

The date is a target, not a readiness claim. This task promises no beta launch or
feature repair. Runtime credentials/old-owner proofs are not required for the
supervised manual exception, but ordinary atomic admission still requires them.
If current evidence or required access for a selected repair is unavailable, stop.

## Safety and rollback

No product/accessibility behaviour, database, provider, cost tier or hosted settings
change. A$0 additional monthly/annual cost. No secrets, real household data or live
emails. Stop assigning supervised work to withdraw the exception; keep ordinary
pickup off and preserve branches, claims, receipts and review/release gates.
