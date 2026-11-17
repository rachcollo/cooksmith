# Build admission and recovery

Every scheduled or manual builder must reserve work before branching or editing.
This protocol protects cooperative builders; it cannot prevent a person or old
scheduler from bypassing it. Pause old pickup runs and reconcile all existing
workers before activation. Do not activate while an untracked worker is running.

## Admission

Run `node scripts/engineering/admit-next-build.mjs` from an isolated clean checkout
of current remote `main`. It verifies HEAD against remote main and repository
identity. Supply the existing Jira credentials and a GitHub credential with
repository Contents write permission securely; do not paste secrets into prompts.
No provider, dependency, production permission or paid service is added.

`COOKSMITH_MAX_PARALLEL_BUILDS` defaults to 3; only 1, 2 or 3 are valid. Use one
runner configuration for all workers. Malformed values stop admission.

The command creates an immutable annotated tag object with a fresh owner UUID,
then atomically creates `refs/tags/cooksmith-builds/lock` pointing to that object.
Only a confirmed successful create and reread grants ownership. Existing refs,
permission failures, malformed responses and timeouts stop the operation. It never
uses a client-side expected SHA as a substitute for atomic creation.

While holding the lock it revalidates remote main before selection and again
before reservation, and rereads all durable claims and paginated PR/branch
inventories, checks Jira Ready plus codex-ready, blockers, package readiness and
parallel safety, then creates `refs/tags/cooksmith-builds/claims/CS-NNN`. The claim
contains version, story, unique owner, main baseline and safety snapshot. A
confirmed claim write precedes lock removal and the returned build permission.
Only the successful result containing both selected story and claim permits work.
A read-only selector result does not. One invocation admits at most one build.

Claims count before any branch or PR exists. Story references are deduplicated.
Only `package/*` branches/PRs are exempt; a chore title cannot hide product work.
Unknown legacy branches and PRs count conservatively and prevent concurrency.
Retained historical feature branches may therefore block pickup until reviewed.
Main and historical v2 are baseline branches and excluded.

## Evidence for concurrency

Absent metadata permits a serial build after ordinary readiness/dependency gates.
To permit concurrency, a reviewed main commit may add `engineering/build-safety.json`
with entries keyed by story. No stories are opted in by this change. Example shape:

```json
{
  "CS-123": {
    "epic": "CS-100",
    "scopes": ["pantry-availability"],
    "schemaChange": false,
    "dependencies": ["CS-99"]
  }
}
```

This is an explicit, reviewed assertion of complete scope and dependency inventory,
not metadata that the worker should guess. Use shared scope names for shared
files, domain contracts, lifecycle rules and integration surfaces. Review against
the package, Jira and the engineering index before merging. Never add metadata
merely to unblock a build or decide an unresolved product question.

Parallel builds require different Jira parent epic keys, disjoint scope names,
no schema change in either build, and no dependency between the active stories.
Declared dependencies must currently be Done even for serial admission. Jira
parent and links are rechecked for both stories; unknown links, incomplete status,
or non-Done linked issues prevent concurrency. A changed active safety snapshot
also prevents concurrency. Missing metadata serialises; malformed metadata fails
closed. Metadata is not permission to broaden scope: stop if implementation needs
additional shared files/contracts or schema work.

## Claim lifecycle

Retain the receipt in the build handover. Keep the claim throughout implementation,
review, merge and any required release verification. PR creation/closure, a session
exit, Jira status, missing branch, or age alone never retires it. There is deliberately
no automatic claim-release command or TTL. This trades unattended throughput for
safety when owner liveness cannot be proved.

An operator retires a claim only after confirming the owner and every resumed
session have stopped, the build is complete or explicitly abandoned, and no open
implementation/review/release work still occupies the slot. Record that evidence
and the exact claim ref, owner and SHA in the handover. Retire under the same
admission lock: create a new owner tag and fixed lock ref, reread the target claim,
verify its exact SHA/owner, delete only that claim ref, then verify ownership and
remove the operator's lock. Never delete or update an implementation branch as
part of claim retirement. Retained implementation branches still conservatively
block pickup until separately reviewed and cleaned up through the normal workflow.

GitHub REST deletion has no compare-and-delete parameter. Safety therefore depends
on exclusive lock ownership and no external mutation while an owner is live.
Never forcibly recover a live lock or reuse an old owner UUID. Workers never mutate
an existing claim; they only create new claims under the fixed lock.

## Interrupted or uncertain operations

Any exception after lock acquisition leaves the lock intact. If creation committed
but the response was lost, a retry fails closed at the existing lock. A confirmed
claim may remain even though no build permission reached the worker. Do not build
from an error response or retry the returned owner as a new session.

Pause all admission sources and stop/join every current worker, including the
possibly suspended owner, before recovery. Inspect the exact lock ref/tag and
claim refs/tags; reconcile receipts, branches, PRs and Jira. If owner termination
or write outcome cannot be proven, leave the lock and claims intact and escalate.
After recording evidence, remove only confirmed abandoned claims and the stale
lock by their verified SHA/owner. Then re-enable admission with fresh UUIDs.
Never use elapsed time alone as evidence that a worker has stopped.

## Activation and rollback

Activation is blocked until the runner has the required secure environment
credentials. Connector-only access is not a substitute for this command; do not
create or transmit new credentials as part of this repair.

After human review and merge, the scheduling owner must update the actual Routine
with `DELIVERY_ROUTINE_PROMPT.md`, ensure the credential supports tag-object and
ref create/read/delete, and ensure every manual/scheduled builder uses admission.
Test the API contract in a disposable repository before enabling unattended pickup;
local tests use a shared server fake and do not prove live GitHub permissions.
Existing tag protection must remain intact; if it prevents these operations, stop
and obtain an approved compatible configuration rather than weakening protection.

To disable pickup, pause the Routine and manual admissions. Preserve outstanding
claims; reverting code or setting the limit to 1 does not release existing builds.
Merge and production release remain separate human approval gates.
