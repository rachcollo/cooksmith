# Recovery PR base evidence correction

- Date: 2026-11-18
- Branch: `chore/recovery-pr-base-evidence`
- Target: `main`
- Verified baseline: `aeb55a2026e4bb40badc5bed601eb00b4eecea74`
- Status: draft review; validation results and exact published SHA in PR receipt.

## Outcome and authority

This is the owner's explicitly scoped continuation of the recovery governance
correction. It permits preparation of this governance PR without fabricating an
admission claim. Normal new admission stays frozen and no live adoption is run.
The original bootstrap is not treated as a general exemption for future work.

GitHub reports older base SHAs for existing PRs even though their base branch is
main: #231–#234 reported b68832ee2134d53f36c7c910980085eab9fb3086 and #228 reported
c04bf896aa90805c4ea70a6d8420b5c8b47b430c during preparation. Requiring those fields
to equal current main prevented a faithful recovery inventory.

The validator now preserves and compares exact observed PR base SHAs independently
of repeated authoritative main-ref checks. It explicitly requires both head and
base repositories to be rachcollo/cooksmith and base branch main. The external
manifest schema therefore requires `baseRepository`; prepare fresh evidence and
review its exact digest, never silently upgrade a previously approved artifact.
Unknown/missing repository evidence fails closed. No feature branch needs to be
updated to manufacture a matching base SHA.

Tests cover an unchanged older PR base, changed PR base SHA/branch/repository,
wrong or missing base repository, and actual main movement with older PR evidence.
Existing owner, dependency, claim, atomic-lock and freeze checks remain in force.
Only the recovery library, its tests/declarations, runbook and this handover change.
No application, migration, Edge Function, dependency, quality/release workflow,
hosted setting or provider changes. A$0 additional monthly and annual cost.

## Operator preparation: supported controls and limits

The selected managed environment's current status reports matching observed/spec
revision 1, with no configured runtime variables, secret bindings or outbound
identity aliases. Presence-only shell checks found GH_TOKEN but none of
GITHUB_TOKEN, GITHUB_REPOSITORY, JIRA_BASE_URL, JIRA_EMAIL or JIRA_API_TOKEN.
GitHub read access is not proof of the required credential contract or tag writes.
No values were displayed, copied between stores or newly created.

The Cloud Environment runtime guidance supports proposing settings through
`cloud_environment.request_changes` when offered, or owner edits to the running
environment's desktop settings when offered. This task has status/diagnostic tools,
but no request_changes or credential-binding write tool. An authorised operator
can select an existing approved environment with the required bindings, or use its
settings to bind existing vault references under the five required names; the
nonsecret GITHUB_REPOSITORY must be rachcollo/cooksmith. Preserve all unrelated
settings and permissions. Do not paste values in chat, extract connector credentials,
or create credentials to fill the gap. After a saved change, recheck matching
observed revision and presence in a fresh process. Test the existing credential's
atomic tag/ref create/read/delete contract in an approved disposable repository;
never use live Cooksmith claims for a permission probe or weaken tag protection.
Source configuration promotion, when offered, affects future tasks and requires
separate review; it is not needed to prove this task's runtime readiness.

The coordinator corrected the earlier report about cloud task lifecycle APIs:
its full `thread_management.set_archived` description explicitly states that
archiving stops active work and may release the environment; restoring does not
start a turn. This is a supported potential stop operation for eligible visible
cloud tasks, not merely hiding a conversation. This worker does not expose that
tool, and neither this task nor the coordinator has supplied successful archive
receipts yet. Earlier claims that archive cannot stop work are superseded by this
provider-specific description.

An operator with that tool can enumerate exact owner task/turn IDs and child/session
coverage, archive eligible old tasks under the authorised freeze, preserve successful
operation receipts, and independently verify archived/read state with no active work.
An error has uncertain outcome: inspect archived state rather than blind retry.
Do not contact/revive the previously denied feature workers. A successful archive
plus verified stopped state can substantiate termination for the covered task;
it is not automatically evidence for unlisted children, other providers, external
processes or all retained branch owners. Account for those explicitly and ensure
no automatic source or restoration starts new work during recovery. Completed
turns alone remain insufficient. If coverage or cessation is uncertain, retain
unknown status, preserve refs and stop before admission. No such stop operation
was executed in this task.

## Verification, safety and next step

Full local checks and independent read-only review are recorded in the PR receipt.
Local preflight may remain limited by the pinned CLI attempting to create its
configuration under read-only /home/agent; remote CI evidence is separate. Browser
and database CI remain required. No hosted interaction, production access or
live API-contract success is claimed by local synthetic tests.

This correction supports dependable delivery and household trust without changing
product behaviour or accessibility. No real household data, emails, credentials
or paid services are used. Staged secret scanning precedes publication. Rollback
means keeping admission frozen and preserving all claims/receipts, not ref cleanup.

After review and acceptance, the next step is a freshly captured inventory with
positive stopped-session coverage, an existing verified secure runtime, and
independent approval of the exact manifest digest/main/scope. Only then can a
separately authorised CS-111 adoption precede the bounded nested-cancel repair.
No merge, release, adoption or scheduler restart occurs here.
