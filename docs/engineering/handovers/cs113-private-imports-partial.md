# CS-113 partial implementation and legacy decision hold

- Date: 2026-11-17
- Branch: `feat/cs-113-private-imports-moderated-bank`
- Target: `main`
- Baseline: `b68832ee2134d53f36c7c910980085eab9fb3086` (approved package PR #230)
- Status: **Partial implementation. Do not merge or release. Legacy treatment is unapproved.**
- Package: `engineering/ready/cs113-private-imports-moderated-bank.md`

## Objective and independently safe changes

Protect household trust by removing accidental public publication. The import review now
always requests `private`, has no publication choice, and accurately describes the current
uploader-only visibility. Source URL, author and publisher continue through the unchanged
repository save path. No household-sharing claim is made.

The additive `20261117105820_restrict_import_public_creation.sql` changes the default to
private and restricts public insertion to an application administrator creating their own
row. The existing owner check remains mandatory, including for administrators. Existing
SELECT and UPDATE policies, data and references are untouched. Non-admin public updates
and private-to-public escalation remain denied by the existing UPDATE policy.

This slice works with the existing schema. Its UI also works before the migration. Once the
migration is applied, older clients explicitly requesting public creation will receive a
permission error; coordinate application/database release and account for cached clients.
The approved final household-wide product outcome is not complete and this is not a release
candidate. The existing repository method still accepts visibility for compatibility; RLS
is the server-side restriction, not the UI.

## Unapproved fallback proposal: decision required

**Proposal only. Not implemented, not approved, and not permission to migrate data.**

- Add a validated immutable importing-household scope for new imports, separate from uploader identity.
- Preserve legacy private rows with unresolved household provenance and uploader-only access.
- Require a separately reviewed explicit mapping before granting household reads to any legacy private row.
- Preserve existing public visibility, attribution and planned-meal/favourite references.

Legacy imports record an uploader but no importing household. A single current active
membership is not historical provenance: a user can leave one household and join another.
Planned-meal references are not sufficient proof of the original importing household.
No hosted data was inspected to determine whether such cases exist.

The following work depends on the decision: nullable/unresolved scope semantics and migration,
legacy/new read-policy distinction, immutable scope enforcement and backfill rules, how
unresolved imports participate in favourites and planned meals, uploader edit/archive flows,
shopping refresh after editing, generated types for the new scope, and complete adversarial
and end-to-end tests. No global household or guessed mapping is acceptable.

Admin publication and the read-only public-recipe review mechanism remain unimplemented in
this partial slice. A future review report must distinguish a creator's current admin role
from evidence of their role at creation time; the latter cannot be inferred from current
role membership alone. Do not export Production data into this repository.

## Validation

Local dependency install, format/write and check, lint, strict types and production build passed.
The full Vitest suite passed: 109 files / 930 tests with `npm test -- --maxWorkers=2`.
The initial unconstrained run was interrupted after unrelated pantry/planner timeouts during
concurrent browser execution and Docker extraction; resource contention is suspected, not
a proven product cause. No tests or timeouts were weakened.

Full preflight (including Docker and Chromium) passed with `SUPABASE_HOME=/tmp/cs113-supabase`; the runner home is read-only.
`npm ci --cache /tmp/cs113-npm-cache` passed after the default cache failed on that same
read-only home. Documented-command audit, database config and production dependency audit
passed (the existing reviewed React Router exception remains unchanged).

Local WebKit could be downloaded but cannot launch: missing `libgtk-4.so.1`,
`libgraphene-1.0.so.0`, `libharfbuzz-icu.so.0`, `libmanette-0.2.so.0`, `libhyphen.so.0`,
`libwoff2dec.so.1.0.2` and `libGLESv2.so.2`. The first combined browser run was interrupted
after WebKit launch failures. The complete desktop/mobile Chromium run then passed:
54 tests, with two existing opt-in local-database journeys skipped. The new import tests
passed on both projects, including keyboard saving, attribution, no public control and axe.

Added tests cover
private save/no publication control/attribution, database default, ordinary public-insert denial,
forged uploader identity, private escalation, current private read boundaries, public access,
admin owned-public insertion and unchanged anonymous denial. These tests do not claim to
prove the blocked household-sharing implementation.

Local PostgreSQL reset/lint/pgTAP/security/types remain unavailable. Both full and smaller
Supabase startup attempts failed while registering the PostgreSQL image with `no space left
on device` under Docker's VFS storage driver; the first attempt also hit an ECR rate limit.
Startup retries were stopped. `db:reset`, `db:lint`, `db:test`, `db:test:security`, `db:types`
and `db:types:check` were attempted and each exited 1 because Supabase is not running.
Authenticated HTTP checks were also attempted and cannot run without the local stack.
Generated types were not hand-edited. No successful RLS execution is claimed.

One HTTP regression previously created its public fixture as an ordinary user. It now uses
the explicitly local Supabase SQL command (`db query --local`) for synthetic setup only.
All behaviour assertions still use authenticated clients and real policies; this does not mock RLS.

## Publication and approval block

The branch was published; local and remote tree equality was verified. Opening the draft PR
was denied twice by automatic approval review, which stated that explicit permission to publish
through a GitHub PR was missing. The second attempt followed verification of user-authored
history requesting builds, publication and PR governance. No workaround was attempted and no
PR exists. Required quality/PR-governance CI has not run. Only branch-created Jira sync passed.
The first published head received a successful Vercel status; this is deployment metadata,
not hosted interaction validation. Final commit/status evidence belongs in the completion report.

A verified patch, Git bundle and prepared draft PR description are retained outside the
repository in `/workspace/cs113-artifacts`. The patch is checked against the approved baseline.

## Hosted preview and manual verification

Hosted interactions have not been run. Use only an approved isolated synthetic staging
backend: import a synthetic recipe, check the review has no visibility option, save and
verify private visibility and all attribution; verify an existing synthetic public recipe
remains accessible. Verify keyboard saving and narrow mobile layout. Direct API denial tests
must use real PostgreSQL policies. Do not use a preview wired to Production for these checks.
Physical devices and assistive technology remain unverified.

## Release, safeguards and rollback

- Migration: yes. Edge Function changes: no. Dependencies: none.
- No data rewrites, deletion, unpublishing, new read grants or household inference.
- No scheduler, `codex-ready`, provider, hosted configuration or Production actions.
- A$0/month and A$0/year recurring cost.
- Protected Production database release is separate: only an approved exact merged `main`
  SHA may later be released, with mandatory dry-run and migration-history checks.
- Merging main triggers application deployment; the protected database workflow does not
  gate that deployment. Resolve release sequencing explicitly before any future merge.
- Revert application changes if needed; released migrations remain immutable and require
  an approved forward fix. Do not restore ordinary-user public insertion as an automatic rollback.
- Continue CS-113 only after its decision hold is resolved; no other package is started.
