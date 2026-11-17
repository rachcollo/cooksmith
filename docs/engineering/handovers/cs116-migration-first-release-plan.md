# CS-116 migration-first release assessment

Status: **release held; additive expansion implemented in draft, application adoption separately held**. No deployment, Production data access, environment change or merge is authorised by this document.

## Historical rejected candidate and control

- Accepted `main` application: `b68832ee2134d53f36c7c910980085eab9fb3086`.
- Reviewed combined implementation: [PR #228](https://github.com/rachcollo/cooksmith/pull/228), `f00e131aa1e134bde7cda11feb3878d439e10b5c`.
- Candidate database slice: exactly `20261117094901_ingredient_identity_v2.sql` from that reviewed head, its generated function type and database tests. No current-main application code changed in the experiment.
- **Rejected for release-first use:** the candidate changes existing reconciliation and Pantry write behaviour, so it is not an additive-only compatibility expansion despite adding new functions/indexes and retaining rows.

The local cross-version experiment used current-main Shopping domain logic and the actual Supabase repository against the candidate migration, with synthetic local data. Existing Pantry contained `compatibility mushrooms` (200 g). A legacy client submitted a 100 g recipe contribution with purchase name `compatibility mushrooms` and no v2 marker. The server returned `compatibility mushroom`. Current-main put-away matching found zero Pantry matches and submitted it as a new item; the new v2 alias guard rejected it. The existing UI surfaced **“That item is already on your shopping list.”** Put-away did not complete. No data was silently merged or lost, but this is a user-visible regression in the database-first compatibility window.

The test in `tests/integration/cs116-database-first-compatibility.test.ts` exercises that current application path. It is opt-in because it requires a real isolated local database. Default application tests do not create database clients or credentials. The explicit hostname assertion excludes hosted backends. Run it after a local reset:

```bash
npm run db:reset
COOKSMITH_RUN_DATABASE_COMPATIBILITY=1 npx vitest run tests/integration/cs116-database-first-compatibility.test.ts
```

The accepted-main database control passed (1/1), including successful put-away and Pantry quantity increasing from 200 g to 300 g. The full candidate slice failed (0/1) in the same current-main repository path as described above. The accepted-main database is the control. Applying the candidate migration locally must not be mistaken for approving it for Production. Compatibility evidence belongs to a pair of exact application and migration SHAs, not to the migration alone. The combined application's green CI does not prove compatibility with an older application.

## Existing workflow and actual protections

Inspected `.github/workflows/production-database-release.yml` on accepted main and GitHub environment metadata without retrieving secret values:

- Pushes to `main` touching `supabase/migrations/**` automatically create a database release run.
- Manual dispatch has **one** input: boolean `allow_out_of_order_migrations`, default false. There is no `release_sha`, project selector or dry-run-only input.
- The job requires `github.ref == refs/heads/main`, uses the `production-database` environment, and serialises under `cooksmith-production-database` with cancellation disabled.
- The environment has a required reviewer, `rachcollo`. `prevent_self_review` is false. No deployment branch policy is configured; the workflow's explicit main guard is the branch restriction. Do not describe stronger protections than these.
- Checkout uses the run's event SHA. The workflow checks protected secrets exist, installs pinned dependencies, checks database configuration, links the configured project, lists remote history, dry-runs, applies pending migrations, then lists history and dry-runs again.
- **One approval releases the whole job.** There is no second pause after dry-run. The workflow applies all pending migrations available at that run SHA, not a selected file. It does not verify backups, staging acceptance, application compatibility or CI itself.
- Main also auto-builds and aliases the Vercel application. The database approval gate does not delay the Vercel deployment.

No workflow dispatch, environment approval, Production connection, migration-history read or backup operation was performed during this assessment. Historical workflow success is not evidence of current remote schema state.

## Concurrent work and ordering

Read-only branch inspection found:

| Work                                                            | Inspected head                             | Database overlap and release implication                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CS-107, [#227](https://github.com/rachcollo/cooksmith/pull/227) | `8d511f5bd0c8c46690dabf11d86668118178085e` | Recipe quick-add application/date logic; no migration or generated-type change. Still changes the app baseline if merged.                                                                                                                                                                                                                      |
| CS-112, [#232](https://github.com/rachcollo/cooksmith/pull/232) | `9931a20d1f4eb88330bbb59a6c08514d0760745b` | `20261117105847_cs112_server_sent_invitations.sql` and `20261117113711_cs112_resend_pending_recovery.sql` replace invitation RPC contracts and adds delivery attempts. Shared generated-types file and ADR index; also changes Edge release workflow, Supabase config and Vercel config. Excluded here. Do not bundle its release with CS-116. |
| CS-113 partial branch                                           | `9e782f0191ba8c4ea1222ec6e87d7e56014b68bb` | `20261117105820_restrict_import_public_creation.sql` changes imported-recipe insert policy/default. No direct identity-function overlap, but imported recipes are consumed by Shopping. Its HTTP public-refresh fixture and database tests are under development. Excluded here.                                                               |

Snapshot checked 2026-11-17: timestamp order is CS-116 `094901`, CS-113 `105820`, CS-112 `105847` and `113711`. The latest visible successful protected database run is 2026-11-10 at `905be38f09f34c59cc34c93480c738a77ce2171d`; this is not proof of current remote history. This is **not** approval to release any of them. The CS-116 timestamp precedes both others: releasing either newer migration first may make an unchanged CS-116 migration out of order. Keep the bypass flag false. Re-plan and regenerate an unreleased migration timestamp only after coordinator review; never rename a released/shared migration. Any combined tree needs fresh generated types from its complete local schema, not a last-writer-wins file merge. CS-116 application redesign moves its ADR to 022, leaving CS-112 proposed ADR 021 unchanged. No other builder's branch was edited.

## Additive expansion now prepared

The new expansion is based on accepted main `b68832ee2134d53f36c7c910980085eab9fb3086`. It adds only SQL functions/indexes, generated types, database tests, the opt-in unchanged-app compatibility gate and this document. Runtime application sources, workflows, configuration, dependencies and shared v1 routines/triggers are unchanged. Draft expansion [#234](https://github.com/rachcollo/cooksmith/pull/234) is `1e63e592af50366c15fc6ec059823653c8eda02d`, migration blob `cecc851bd2f117bc9773a6c0c3c90efb89064039`. No merge SHA exists yet.

The migration captures all existing Cooksmith/private function definitions and ACLs and asserts they are unchanged before commit. Explicit `_v2` reconcile/refresh endpoints validate source evidence and preserve v1 physical product partitions; new per-source converted quantities decompose UI groups before calling original reconciliation. Identity-only refresh preserves receipt-bound IDs and rejects material repairs. New application repositories on #228 explicitly adopt the v2 endpoints.

Pantry v2 save/put-away boundaries check aliases without changing shared triggers. They acquire a table lock to coordinate with old direct DML. Old clients still retain their old alias semantics and can create aliases later; the new client must keep ambiguous matches explicit, never auto-combine. This is compatibility, not a claim of global v2 uniqueness across old writers. The table lock briefly serialises Pantry writes across households; review contention before release.

Local expanded-schema evidence: clean reset passed, schema lint found no errors, 44 pgTAP files / 1,041 assertions passed. Tests cover 233 identity fixtures, stable receipt/override IDs, stale retries, old/new source round trips, preserved old Pantry aliases and v2 household denial. The #233 unchanged accepted-main application gate passed (1/1); the separate new-app repository gate passed (1/1), including put-away retry. Final exact-head CI and additional HTTP/browser evidence are recorded on the draft PRs. Historical failure above remains evidence for why the original split was rejected.

No contract/retirement step is included. Preserve v1 support until a separately authorised support-window decision. Approval of `f00e131` does not approve this redesign automatically; independent exact-head review is required.

## Ordered release steps after independent review and coordinator approval

1. Coordinator freezes the candidate set and records full accepted-main, expansion, application and migration-content SHAs. Recheck all open migration branches and pending database runs. Exclude CS-112/CS-113 unless separately approved and tested. Verify runtime source/config/dependency diffs in the expansion PR are empty apart from erased generated types; a Vercel rebuild still occurs on merge and must not be called “no deployment”.
2. Establish an approved, already isolated staging backend and Preview-only public variables; positively verify its project differs from Production. Current Preview/Production share one Supabase URL record and one publishable-key record with no branch override; Supabase Preview is skipped. Therefore hosted checks remain blocked. Do not seed or test that shared backend. Provisioning/configuration is a separate approved task, with no new spending assumed.
3. Run local reset/lint/database/security/HTTP/types, current/new-client compatibility, application and browser gates. Apply the reviewed expansion to isolated staging through its approved process, using synthetic data only. Complete hosted interaction and accessibility/device gates; record exact source and migration versions.
4. Before any Production approval, the authorised operator confirms the target project in a secure context, backup/PITR availability and recoverability, restore responsibility, migration history, exact pending migration set, lock/maintenance implications and forward-fix plan. Obtain a separate authorised read-only history and dry-run preflight **before** approving the workflow; its built-in dry-run is followed immediately by apply and is not an approval checkpoint. Stop if history, target, backups or pending files cannot be verified. None of these Production checks has been performed here.
5. With approval, merge only the backward-compatible expansion PR. Record resulting main SHA **M**; this SHA does not exist yet and cannot be honestly prefilled. Main auto-deploys the unchanged application source. Check the auto-triggered database run has `head_sha == M`, the expected migration set and successful exact-tree checks; keep the environment job waiting until reviewer approval. Do not dispatch a second duplicate run.
6. If manual dispatch is necessary, dispatch the existing workflow on `main` with `allow_out_of_order_migrations=false`, then verify the captured run SHA equals M before approval. There is no arbitrary-SHA input: if main moved, stop and revalidate the new captured tree or use the still-pending exact push run. Do not weaken the main guard or environment protection.
7. Approve only that recorded environment job. Verify list/dry-run/apply/post-apply history and empty final pending set. An unexpected pending migration or ordering failure stops release; do not enable the bypass as a convenience. Record actual completion and approved synthetic smoke evidence.
8. Only after expansion verification, staging acceptance and coordinator clearance may the revised application PR merge. Record new main SHA **A**, exact CI and Vercel deployment metadata. The automatic app rollout then depends only on database objects already present. Check the approved post-release flows. Keep any contract migration separately gated.

## Rollback and forward-fix limits

If expansion fails before commit, stop and verify transaction/history state through the authorised release process. Existing app should continue using untouched v1 endpoints; do not assume success from a failed run. If expansion has committed, retain it and forward-fix with a new migration. Application rollback must target a reviewed old client that the expansion still supports. Do not delete source rows, receipts, migrations or history entries, disable RLS, restore unsafe privileges, auto-combine Pantry stock or reset a hosted database. Backup restoration is a separately approved incident operation, not an automatic rollback step.

Cost: A$0 incurred. No resources or credentials created, no hosted data accessed and no security/deployment setting changed. Remaining gates are independent review of the compatibility redesign, verified isolated staging, exact candidate ordering, backup/history preflight, explicit release approval and manual hosted/device evidence.
