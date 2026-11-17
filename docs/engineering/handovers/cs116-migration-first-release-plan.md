# CS-116 migration-first release assessment

Status: **release held; draft planning and compatibility evidence only**. No deployment, Production data access, environment change or merge is authorised by this document.

## Exact candidates and result

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

| Work                                                            | Inspected head                             | Database overlap and release implication                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CS-107, [#227](https://github.com/rachcollo/cooksmith/pull/227) | `8d511f5bd0c8c46690dabf11d86668118178085e` | Recipe quick-add application/date logic; no migration or generated-type change. Still changes the app baseline if merged.                                                                                                                                                                |
| CS-112, [#232](https://github.com/rachcollo/cooksmith/pull/232) | `e0293573c32953891385123fee9830e06ed3a5fc` | `20261117105847_cs112_server_sent_invitations.sql` replaces invitation RPC contracts and adds delivery attempts. Shared generated-types file and ADR index; also changes Edge release workflow, Supabase config and Vercel config. Excluded here. Do not bundle its release with CS-116. |
| CS-113 partial branch                                           | `9e782f0191ba8c4ea1222ec6e87d7e56014b68bb` | `20261117105820_restrict_import_public_creation.sql` changes imported-recipe insert policy/default. No direct identity-function overlap, but imported recipes are consumed by Shopping. Its HTTP public-refresh fixture and database tests are under development. Excluded here.         |

Timestamp order of the current drafts is CS-116 `094901`, CS-113 `105820`, CS-112 `105847`. This is **not** approval to release any of them. The CS-116 timestamp precedes both others: releasing either newer migration first may make an unchanged CS-116 migration out of order. Keep the bypass flag false. Re-plan and regenerate an unreleased migration timestamp only after coordinator review; never rename a released/shared migration. Any combined tree needs fresh generated types from its complete local schema, not a last-writer-wins file merge. Both CS-112 and CS-116 currently propose ADR 021; coordinate numbering before combining them. No other builder's branch was edited.

## Draft-only alternative within existing protections

Do not open or merge a migration-only PR containing the full rejected slice. Keep #228 draft. This draft plan changes no runtime application, migrations, authentication, workflows, environment settings or dependencies.

A safe alternative needs an explicitly reviewed **expand / application / contract** design:

1. Prepare a separate draft expansion PR containing only unused v2 functions/indexes and versioned v2 API entry points. Preserve all existing RPC signatures, behaviour and Pantry trigger semantics for current clients. Do not merely move the current replacement `DO` blocks into a different PR. Reuse reviewed identity logic, but retain v1 paths until old-client support ends.
2. Prove current-main and the intended new application against the expanded schema with synthetic data. Cover plural/synonym Pantry aliases, receipt/override preservation, buy/put-away retries, meal Done/Undo and unrelated-household denial. The compatibility test above must pass without weakening its expectation. Review how new APIs enforce v2 identities while old clients remain supported.
3. Rework #228 to use the versioned v2 APIs and remove its duplicate expansion objects. Give any later activation/contract change a new migration. Re-review these changes; approval of `f00e131` does not automatically approve a new API design.
4. A later contract PR may retire v1 behaviour only after the approved old-client support window and compatibility evidence. It must not be bundled with the application switch.

This alternative is a proposal, not implemented versioned endpoints or an executable approved release. The unresolved decision is whether to authorise that compatibility expansion, or retain the combined PR under a separately approved coordinated application rollout hold. This task does not change Vercel settings to obtain such a hold.

## Ordered release steps once the alternative is implemented and approved

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

Cost: A$0 incurred. No resources or credentials created, no hosted data accessed and no security/deployment setting changed. Remaining gates are compatibility design approval/implementation, verified isolated staging, exact candidate ordering, backup/history preflight, explicit release approval and manual hosted/device evidence.
