# Build admission and recovery

Ordinary new builds and scheduled pickup must reserve work before branching or editing.
They remain frozen. The sole manual exception is the explicitly supervised
existing-PR repair policy below; it does not use or claim atomic admission.
The atomic protocol protects cooperative builders; it cannot prevent a person or
old scheduler from bypassing it. Before activating ordinary/atomic pickup, pause
old runs and reconcile all existing workers. The supervised exception below
explicitly accepts unresolved old-worker risk without activating pickup.

## Supervised serial existing-PR repair

This policy takes effect only after human acceptance and merge of its governance
PR. The owner authorised this narrower reversal on 19 November 2026, accepting
residual concurrent-worker risk. It supersedes the universal reservation and
exhaustive historical-owner termination prerequisites **only for explicitly
supervised repair of an already open implementation PR**. This governance task
authorises no feature edits itself. It is not permission for new stories,
package pickup, unattended work, parallel pickup, CS-113 publication or release.

For each repair the supervisor must record, before editing:

1. The owner's authorised bounded repair, one named supervisor and one selected
   worker/session. Name the existing PR, Jira key, branch and exact current head,
   independently verified current remote main, allowed files/behaviour and tests.
   Do not infer that all open PRs are selected or must ship for a release date.
2. A fresh complete branch/open-PR inventory and build lock/claim/receipt ref read.
   Preserve the evidence and every historical branch. Unknown historical owners
   are explicitly **unknown**, and their occupancy does not block this supervised
   exception. Existing lock or claim refs still block it pending separate operator
   reconciliation; never delete, overwrite, ignore or fabricate them. Retain all
   consumption receipts. Missing/incomplete API evidence stops the repair.
3. Current Jira/package scope and completeness, upstream blockers and declared
   dependencies. Unknown links, unmet dependencies or scope drift still stop work.
   Existing-repair Jira status must be In Progress, In Review or Testing; package
   completeness uses the existing recovery status allowance. Existing connected
   read access may supply this supervised evidence. The atomic admission commands
   retain their secure GitHub/Jira credential contract; do not impersonate their
   permission/claim receipts or extract connector credentials.
4. The unresolved owner/session inventory and the owner's acceptance of the
   resulting risk. State that no exhaustive cessation or exclusive writer fence
   is proved. Completed turns, CS-110's limited archive receipt, stable branch
   SHAs, rulesets and connector expected-SHA leases do not prove all workers stopped.

Read and record the operative governance (AGENTS, build rules, runbook and relevant
standards) from the exact verified current accepted main SHA before entering the
feature checkout. Apply that accepted policy to this explicitly supervised repair;
older governance files in the existing feature head do not reinstate superseded
reservation rules. Keep this policy provenance separate from the feature-code
baseline, and do not merge main solely to copy the policy.

Use an isolated clean checkout of the explicitly authorised existing PR head,
not an unrelated feature branch or main. Record current main separately; do not
rewrite the PR's historical baseline. Preserve existing commits and real work.
The default new-task workflow remains one scoped branch from verified main;
this exception repairs only the exact named existing branch. If main integration
is required, stop for a bounded integration decision, preserve history and rerun
checks; never force-push, reset shared history or create a replacement feature PR.

The supervisor coordinates **one selected repair at a time**, keeps all pickup
sources off and issues no overlapping repair instructions. Record its outcome and
end the current worker's edit instructions before selecting the next repair.
A resumed session requires fresh supervisor selection and head/main checks; this
is a cooperative operating rule, not a technical guarantee that old sessions
cannot resume. Recheck target head, main and claim/lock refs before edits and
publication. Unexpected movement, new refs, competing edits or uncertain writes
stop the repair for reconciliation; do not overwrite them or retry a denied action.
Use supported publication with exact-head checks and ordinary non-force history
preservation. Never describe a client-side lease as an exclusive writer lock.

This route creates **no live admission lock, claim or adoption receipt**. Its
handover is a supervised work record, not an atomic reservation. A stale or
unknown worker can still write between checks, and two cooperative supervisors
could select conflicting work. Accepting that residual risk changes repository
operating policy; it does not establish cessation or authorise provider bypasses.
The earlier automatic-review denial of archiving CS-111 remains binding: do not
retry that archive, delegate it or substitute another stopping action.

All required tests, independent review, exact-head CI, applicable hosted validation,
resolved review threads, human PR merge and separate protected production release
remain required. AIEOS_Rules protects the default branch, not exclusive feature
branch ownership. Do not alter rulesets, credentials, providers or live data.
Keep new admission frozen in `engineering/build-recovery.json`; the scheduler and
parallel pickup remain off. No executable bypass flag or new scheduler is added.

The [atomic recovery route below](#reviewed-legacy-recovery-freeze-17-november-2026)
remains available only when its stronger evidence and runtime requirements are met.
Its historical owner-termination requirements do not apply to this supervised
exception. Prior handovers remain dated evidence, not current operating authority.
To stop this exception, stop assigning supervised work, preserve all evidence/refs
and keep pickup disabled; no expiry or automatic cleanup is introduced.

## Ordinary atomic admission (currently frozen)

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
Only `package/*` branches/PRs are exempt; this is a strict documentation-only
namespace reserved for engineering-package proposals. Never put implementation,
workflow or executable changes there. The exemption assumes this namespace contract;
review package PR file lists and stop on a violation. A chore title alone cannot
hide product work.
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
parent and links are rechecked for both stories. Unknown link types/directions,
incomplete upstream status or non-Done upstream blockers prevent concurrency.
For the verified Jira `Blocks` type, `inward: "is blocked by"` with `inwardIssue`
identifies an upstream blocker; `outward: "blocks"` with `outwardIssue` identifies
a downstream dependant. Both labels must match and exactly one endpoint must
exist. Missing, custom or reversed labels fail closed in selection and parallel
checks. Read-only evidence: CS-111 has outwardIssue CS-122; CS-122 has inwardIssue
CS-111. CS-116 has inwardIssue CS-79 and CS-101. No Jira links are rewritten.

A dependency link to a concurrently active story prevents concurrency in either
direction, even if its Jira status says Done. An unfinished downstream dependant
that is not active does not prevent unrelated work. A changed active safety snapshot
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

Atomic admission activation is blocked until the runner has the required secure environment
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

## Reviewed legacy recovery freeze (17 November 2026)

This is the retained atomic recovery route and its historical rationale. Its
requirements govern that command, not the supervised exception above.

The owner explicitly authorised one scoped governance bootstrap despite the
admission deadlock: “Yes action and then fix”. This authorises preparation and
review of this recovery mechanism on a chore branch from verified main, without
inventing a normal claim. It does not authorise feature repairs before adoption,
merges, releases, scheduler activation, platform-permission bypasses or future
bootstrap exceptions. The scheduler remains off. Existing release, review, tag
protection, package and dependency gates remain in force.

`engineering/build-recovery.json` freezes normal/manual/scheduled new admission.
The executable admission command stops even if that file is missing or malformed.
The diagnostic selector also stops when it sees the freeze. Returning to normal
or parallel operation requires a separate reviewed code change and positive
owner/safety verification; changing an environment limit cannot lift this freeze.
Old checkouts do not acquire new behaviour automatically: the operator must stop
all old workers and admission sources before any recovery execution.

### Prepare an exact external manifest, without adopting anything

After this mechanism is reviewed and accepted, an operator must positively stop
and join all existing owners, resumed sessions and admission sources. Suspended,
unknown, uncontactable or merely old sessions are not terminated. Keep provider
stop/join receipts and all relevant session IDs. Review every branch, every open
PR and every existing lock/claim, including historical/package/v2 branches and
branches with no PR. Preserve every branch and its work. Do not infer review
clearance from Jira status, a closed PR or an old worker report.

Capture the complete paginated branch and open-PR inventory after those stops,
using the schema consumed by `inventorySnapshot` and `validateRecovery` in
[`build-recovery.mjs`](../../scripts/engineering/lib/build-recovery.mjs). Store the
manifest outside the checkout as an immutable review artifact, not on a new
repository branch. A manifest containing its own publishing branch's final SHA
would be circular. Obtain explicit independent approval of the exact artifact,
canonical JSON digest, current main SHA, repair scope and termination evidence.
The approval record must name all four; an arbitrary URL is not approval. The
command validates evidence presence and exact state, but cannot authenticate a
human decision or prove that an external worker was actually joined. The operator
must verify the linked records and maintain the exclusive freeze throughout.

Manifest fields (no live inventory or termination assertion is supplied here):

- `version: 1`, `mode: "frozen"`, `baseline`: exact accepted remote main SHA.
- `adoption.approval`: immutable review-request/evidence URL. The independent
  approval of the digest is recorded separately so it does not change the artifact.
- `adoption.sourcesStopped`: evidence URL confirming every admission source is off.
- `adoption.owners`: nonempty records with `id`, `state: "terminated"`, nonempty
  `sessions` IDs, and `evidence` URL proving stop/join, including resumed sessions.
- `adoption.branches`: every remote branch except main, each with `name`, exact
  `sha`, `owner` matching a terminated owner, `evidence` and `classification` of
  `historical`, `frozen` or `target`. Exactly one is `target`. Historical means
  preserved and stopped, never ignored: any movement still blocks adoption.
- `adoption.pulls`: every open PR, with `number`, `branch`, `sha`, `repository`,
  `base`, `baseRepository`, `baseSha`, `draft`. Every PR must map to its exact local
  branch and target `main` in `rachcollo/cooksmith`. Its head repository must also
  be `rachcollo/cooksmith`. Preserve the exact reported PR `baseSha`, even when it
  predates current main; never replace it with the invocation baseline. Current
  remote main is pinned and revalidated separately. Any change to the reported
  PR base SHA, branch or repository still invalidates the inventory. Foreign or missing head
  branches block recovery until explicitly reconciled through separate review.
- `adoption.target`: `key`, `branch`, `sha`, `pr`, complete `dependencies` key list
  and `scope` URL identifying the approved existing package and bounded repair.

Compute the reviewed digest as SHA-256 of `JSON.stringify(JSON.parse(file))`.
Changing any manifest field, even a historical classification, requires a new
review. A new/missing/moving branch, changed PR draft/head/base, or moved main
requires stopping and refreshing review, never silently editing the artifact.
Package completeness still applies; only package lifecycle status may additionally
be Building, In Progress, In Review or Testing for an existing repair. Jira must
be In Progress, In Review or Testing. Ready/codex-ready selection remains the gate
for ordinary new work, which is frozen. Unknown Jira links fail closed; every
upstream and declared dependency (including build-safety metadata) must be Done.
No metadata is added merely to manufacture eligibility.

### Execute one adopted repair only after separate acceptance

In an isolated clean checkout of that exact current remote main, with the existing
secure GitHub and Jira credentials and independently verified review record, run:

```sh
node scripts/engineering/adopt-existing-build.mjs EXACT_MAIN_SHA /secure/path/reviewed-manifest.json REVIEWED_CANONICAL_JSON_SHA256
```

This command is not run by this governance change. Connector-only substitution,
new credentials and weakening tag protection remain prohibited. First validate
API permissions in a disposable repository using the existing API-contract plan.

The command atomically creates the same fixed admission lock with a fresh owner,
refuses any existing claim, verifies main, inventory, dependencies and lock
ownership, creates an immutable `cooksmith-builds/recovery/<manifest-digest>`
consumption receipt, repeats verification, creates the ordinary per-story claim
with exact adoption metadata, verifies again, and removes only its owned lock.
Only successful returned permission authorises the one exact existing branch
repair. Record the receipt, claim, owner and baseline; recheck target/main immediately
before editing. Stop if scope, ownership or any frozen work changes. The new owner
must remain the sole writer until explicitly stopped and reconciled.

Any failure preserves committed receipts and claims, and preserves the lock unless
an unlock actually completed. A lost response never authorises work. Do not retry
a possibly successful operation to recover permission; reconcile first. Stale
locks/claims are not automatically retired. The existing stopped-owner recovery
procedure still governs them. Never delete consumption receipts: they prevent
reuse of a reviewed manifest even after its claim is retired. Another repair needs
fresh evidence, fresh review and a different manifest, after the previous owner and
all implementation/review/release occupancy have been reconciled. There is no TTL.

For atomic CS-111 adoption, positive owner termination and an exact approved
external manifest for PR #231 remain required. Supervised manual repair instead
follows the exception above once that policy is accepted and the repair selected.
Its React onCancel repair remains outside this governance change. No other feature
branch, including CS-113, is published, edited or adopted here.
