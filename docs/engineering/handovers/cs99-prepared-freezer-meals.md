# CS-99 handover: Prepared freezer meals

- **Date:** 2026-10-06
- **Branch:** `feat/cs-99-prepared-freezer-meals`
- **Target:** `main`, draft review only
- **Accepted main:** `b2fb576ebce250e325df297670d62df18c523339`
- **Explicit stack dependency:** CS-96 / [PR189](https://github.com/rachcollo/cooksmith/pull/189), head `e67d5711833a103c21b62dcb92306066bfac7cec`
- **Commit:** See the draft PR head; CS-99-only review range starts at the stack dependency above.
- **Status:** Implemented, manual validation pending

## Objective and product impact

Track already-cooked freezer meals separately from ingredient Pantry. Members can add, edit, archive and restore stock, reserve it from Planner search, explicitly mark portions used and undo consumption. This removes remembering freezer contents and prevents buying ingredients for food already prepared. Whole portions or containers are chosen consistently by the household; no expiry prediction is implied.

## Changes made

- Physical stock, reservations and immutable operation receipts share an authenticated transactional boundary. Concurrent reservations cannot exceed stock; retries return the original outcome. Stale inventory edits are rejected.
- Planner distinguishes freezer provenance. Moving retains the reservation; deleting releases reserved portions without silently returning consumed food. Automatic generation keeps freezer dinners.
- Replacing an existing ordinary dinner atomically removes its generated shopping contributions, retaining explicit manual purchases. Both application and database reject ingredient generation for freezer plans, even when inventory links a recipe.
- Archived or unavailable recipe links cannot block use of already-prepared food. Existing unavailable references can be retained during inventory edits.
- Household switching clears forms and ignores stale stock responses. Stock and reservation counts are fetched in one snapshot. Refresh and unchanged-request retries provide recovery.
- Removed duplicate main landmarks on Planner/Pantry found by the full freezer browser journey.

## Files and components affected

| Location                                                                                        | Purpose                                                                           |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/domain/freezer`, `src/application/freezer`, `src/infrastructure/freezer`                   | Validated stock model and database boundary                                       |
| `src/app/freezer`, `src/routes/freezer/FreezerPanel.tsx`                                        | Repository provider and inventory UI                                              |
| `src/routes/PlanPage.tsx`, `src/routes/meal-plans/MealSearchField.tsx`                          | Search, reservation and explicit use/undo                                         |
| `src/domain/meal-plans/weekGeneration.ts`, `src/domain/shopping/planGeneration.ts`              | Preserve reserved dinners; exclude ingredients                                    |
| `supabase/tests/0043_prepared_freezer_meals.test.sql`                                           | 50 freezer assertions including replacement and negative authorisation cases      |
| `tests/unit/freezer.test.ts`, `tests/integration/freezer.test.tsx`, `tests/e2e/freezer.spec.ts` | Domain, uncertain response, switching, keyboard/reflow/axe and lifecycle coverage |
| [ADR 016](../../architecture/decisions/016-prepared-freezer-reservations.md)                    | Proposed cross-domain transaction and rollback contract                           |

## Migrations and setup

**Migrations in this PR: yes.** Additive `20261006012145_prepared_freezer_meals.sql`: three tables, SELECT-only member policies, scoped mutation RPC, provenance guards and nullable Planner column. **Edge Functions changed in this PR: no.** No new environment variables or dependencies.

Migration must precede the new client. CS-96/PR189 is a required code dependency. The updated review/release sequence below supersedes the earlier four-PR queue. No remote migration, deployment or production configuration was performed. The standard local Supabase runtime in CI remains the release check; executor evidence below used an isolated synthetic PostgreSQL 17/Auth/PostgREST stack because of saved-environment runtime constraints.

## Tests run

| Check                                                           | Result                                                                                                                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`; `npm run validate:static`                             | Passed: formatting, lint, TypeScript, 594 tests / 80 files, production build                                                                                                   |
| Full local Playwright                                           | Passed: 32 checks; Chromium desktop and mobile, including 320px, keyboard and axe                                                                                              |
| Local migration replay, full pgTAP                              | Passed: 571 assertions / 33 files; 50 freezer-specific                                                                                                                         |
| Supabase database lint and security advisors                    | Passed: no schema errors or reported security issues                                                                                                                           |
| Generated types regenerated from local database                 | Exact match after repository formatting                                                                                                                                        |
| Authenticated local API                                         | 14/14: response retry, two-member final-portion race, distinct provenance, move, exclusion, consume/undo, old-receipt replay, deletion, isolation and consume/delete race      |
| Preflight, documentation commands, database config, secret scan | Passed                                                                                                                                                                         |
| Production dependency audit                                     | Passed with existing reviewed React Router RSC exception; no dependency changes                                                                                                |
| Combined PR189+190+191+CS-99                                    | Passed: 608 tests / 83 files, 36 browser checks, 598 SQL assertions / 35 files, API 28/28, generated types match. Only conflict: merge the exact table-name test expectations. |

Evidence files in the saved environment: `/tmp/cooksmith-review/cs99-{static,browser,db,api,lint,advisors,preflight,docs,secrets,audit,config}.log`; combined checks use `cs99-combined-*`. API source is `cs99-api.mjs` and `cs99-combined-*-api.mjs` beside those logs. These logs contain synthetic fixtures only. A clean CI run at the exact draft head must be linked in the PR before acceptance.

## Preview or verification instructions

Pending an approved isolated hosted database and authenticated Preview:

1. Use two synthetic member accounts in one household plus an unrelated household. Create two portions and optionally link a recipe; verify the other household cannot discover or mutate it.
2. Reserve the final portion simultaneously in two browsers. Exactly one should succeed; refresh the loser and confirm available/reserved/physical counts.
3. Replace an existing recipe dinner with freezer stock. Generated-only purchases disappear; manual edits and unrelated purchases remain. Shopping-period selection must not restore freezer ingredients.
4. Move the dinner, mark used, undo, retry after a connection interruption and delete. Confirm deletion of reserved stock releases it, while deletion after use does not return eaten food.
5. Archive/restore stock and archive/unpublish the optional recipe. Prepared stock remains usable; archived stock is absent from new choices.
6. Switch households with an open draft, refresh/reload, and check narrow-screen keyboard and screen-reader operation. Test Safari and Firefox as well as Chromium.

A public login-page smoke or automatic Jira deployment transition does not prove these authenticated behaviours. Do not mark Done based on it.

## Accessibility, security, privacy and cost

Labels, combobox keyboard navigation, modal focus, responsive reflow and serious/critical axe checks passed locally. Physical iOS/Android, VoiceOver and authenticated hosted cross-browser checks remain pending. Server-side membership checks, composite household foreign keys, SELECT-only stock grants and negative tests protect tenancy. No paid evaluations, provider changes, real household data or credentials were used. Incremental recurring cost: A$0/month and A$0/year within existing allocations. Staged sources passed the repository secret check.

## Known limitations and deferred work

Stock updates refresh on interaction or explicit Refresh; there is no realtime subscription. Portion/container meaning is user-defined. Changing an existing freezer dinner to a different food requires removing it first; an ordinary dinner can be replaced directly with freezer stock. Removing a consumed dinner removes its undo UI after an explicit warning. Weight, automatic expiry, barcode scanning and a full stock ledger are outside scope. The existing build-size warning remains. CS-98 is implemented in draft [PR193](https://github.com/rachcollo/cooksmith/pull/193); review readiness does not mean beta acceptance.

## Rollback approach

Keep additive tables, provenance and receipts. Disable new freezer creation/reservation controls and forward-fix. Do not downgrade to a client that mistakes existing freezer dinners for manual entries and can silently alter provenance. No destructive down migration is proposed.

## Recommended next milestone

Resolve the stale-update correction and review the combined drafts before further MVP features. Hosted authenticated, physical-device and assistive-technology acceptance remains pending.

## Follow-up: stale HTTP conflict blocker

PostgREST 14.5 treats deliberate SQLSTATE `40001` as a retryable serialization failure. The original freezer stale-edit RPC timed out after the local harness aborted at 3,005 ms. The same defect affects all three released CS-101 refresh guards. This is a transport/runtime defect, not permission to overwrite concurrent edits. [Supabase documents the cause and PT409 correction](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

Forward migration `20261006023152_freezer_stale_edit_http_conflict.sql` changes only the stale revision exception to `PT409` (HTTP 409), retaining function attributes, grants, locking, compare-and-swap, receipts and transaction boundaries. The original shared migration is immutable. The repository maps PT409 to close/refresh/review guidance. New `scripts/http/freezer-conflict.test.mjs` runs against seeded local Supabase in database CI: another member edits first, the stale request promptly returns 409, stock is byte-for-byte unchanged, no success receipt is written, and reviewing the current revision permits a fresh edit. The component regression verifies that recovery path through the real adapter's error mapping.

Verified locally after correction: **595 Vitest checks / 80 files; 32 browser checks; 571 SQL assertions / 33 files; 14 existing authenticated API checks; one additional real HTTP regression**. Database lint/security advisors pass and freshly generated types match. Static, preflight, docs, secrets, dependency audit and database-config checks pass. API runtime is isolated PostgREST 14.5 with synthetic fixtures. Final exact-head CI is linked from PR192; a pending or failed gate must not be described as passed.

The combined PR189–193 tree plus the separate CS-101 correction replays **638 SQL assertions / 36 files**, passes **45 existing API checks** and **both HTTP conflict regressions**. Full combined static passes **612 tests / 84 files** and **38 browser checks**; generated types match. The CS-101 lifecycle harness passes a further **18/18** on a clean combined database. Exact heads are recorded in the correction PR evidence. Local evidence: `/tmp/cooksmith-review/conflict-cs99-*` and `conflict-combined-*`.

### Explicit review and release order

Review the standalone CS-101 correction first because it fixes released code; review feature code in order **PR189 → PR190 → PR191 → PR192 → PR193**, with PR192 explicitly dependent on PR189. Approval to review is not approval to merge or deploy. If the full set is approved later, merge the selected code before **one separately approved protected database release**. Replay pending migrations in timestamp order: favourites → Shopping period → freezer tables → put-away → freezer HTTP correction → Shopping HTTP correction; then release compatible client code. Later correction timestamps must not cause earlier pending feature migrations to be skipped. Verify remote migration history and dry-run output before that release; do not edit timestamps or released migrations to force ordering. A separate early release of the Shopping correction requires a new explicit history/order plan for the older pending migrations.

Existing looping requests are not stopped by replacing the function. Any hosted incident response must separately identify affected backends and obtain approval; no production session was inspected or terminated here. Only the synthetic local PostgREST container was restarted while reproducing the bug.

## Integration after PR196

Integrated accepted main `754579745957f70edfa88b30cc3396f605b518bc`. Preserve PR196 Pantry/Home/Shopping changes and WebKit CI. Resolve shared local HTTP client to accepted main's raw-client plus schema-scoped wrapper, retaining localhost-only endpoints; run all Shopping and freezer HTTP tests serially. PR189 remains a dependency. Exact-head integration checks are reported in PR192. Migrations `20261006012145` and `20261006023152` predate released PR195: use the separately approved protected Production database release on approved main with `allow_out_of_order_migrations: true` (`--include-all`) only after reviewing remote history and the complete pending set/dry-run. No Edge release or production actions performed.
