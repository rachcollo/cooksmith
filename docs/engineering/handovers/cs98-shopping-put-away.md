# CS-98 handover: Put completed shopping away

- **Date:** 2026-10-06
- **Branch:** `feat/cs-98-shopping-put-away`
- **Target:** `main`, draft review only
- **Accepted main / branch base:** `b2fb576ebce250e325df297670d62df18c523339`
- **Commit and PR:** See the draft PR's exact head and CI evidence.
- **Status:** Implemented, manual validation pending

## Objective and product impact

Turn bought groceries into reviewed Pantry availability without duplicate entry or repeated stock application. Members can correct names, exclude items and cancel before committing. Matching Pantry records become available, including unavailable records. Existing quantities/units are preserved; new records have no invented quantity. This removes household administration while protecting trust in stock changes.

## Changes made

The previous flow ignored unavailable Pantry matches, incremented quantities, kept reviewed keys only in browser memory and deleted Shopping in separate requests. The replacement commits Pantry availability plus per-source receipts and a saved batch result in one transaction. Exact retries return the prior result; new operations cannot apply receipted purchases again, even after Pantry has subsequently been marked unavailable. Failures roll back the entire selection, while excluded groups remain eligible.

Shopping history, source contributions, bought state, quantities and manual overrides remain intact. CS-101 equivalent source provenance prevents a refreshed contribution representation from reopening the same purchase. Orphan overrides retain their applied history. A genuinely new planned meal or manual entry is eligible independently.

The review groups equivalent canonical names and uses current Pantry classification. It works by keyboard at 320px, clears old household drafts, ignores stale reads and suppresses duplicate submissions. An uncertain response keeps the original operation ID and review locked for a safe unchanged retry; closing/reopening reads authoritative eligibility.

## Files and components affected

| Location                                                                  | Purpose                                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/domain/shopping/putAway.ts`                                          | Typed review/result contract and canonical grouping                        |
| `src/application/shopping/shoppingRepository.ts`                          | Put-away application port                                                  |
| `src/infrastructure/shopping/supabaseShoppingRepository.ts`               | Typed review/apply RPC calls                                               |
| `src/routes/shopping/ShoppingPutAway.tsx`                                 | Grouped review, exclusions/corrections and retry UI                        |
| `src/routes/ShoppingPage.tsx`                                             | Replace the old non-atomic quantity/delete workflow                        |
| `src/domain/pantry/reconciliation.ts`                                     | Remove obsolete shopping increment proposals; retain cooked-meal behaviour |
| `supabase/tests/0044_shopping_put_away.test.sql`                          | 40 real database assertions                                                |
| `tests/integration/putAway.test.tsx`, `tests/e2e/put-away.spec.ts`        | Cancel, partial selection, retries, household switching and accessibility  |
| [ADR 017](../../architecture/decisions/017-shopping-put-away-receipts.md) | Proposed availability, source identity and transaction contract            |

## Migrations, dependencies and setup

**Migrations in this PR: yes.** Additive `20261006015319_shopping_put_away.sql` creates protected batch/receipt tables, an eligibility read and an atomic apply RPC. **Edge Functions changed in this PR: no.** No environment variables, dependencies or paid services were added. Apply the migration before its client. Use the protected Production database release workflow only after explicit release approval, against the approved main SHA with dry-run and migration-history verification. Released migrations remain immutable.

CS-79 and CS-101 are already in the accepted base. The branch is not stacked on an unmerged draft. CS-97/PR191 shares the Shopping interface and page: put-away deliberately reviews global bought purchases across all periods, as the UI explains, because CS-97 bought state is purchase-level. Keep review/release order PR189 → PR190 → PR191 → PR192 → CS-98, including migration timestamps.

Combined validation used a disposable worktree with the exact product changes from PR189 `e67d5711833a103c21b62dcb92306066bfac7cec`, PR190 `b1b0a3b56a5948ec892debaef466be91882137dd`, PR191 `36ce745cb3a0ae3940dc48d4f07be6b1eb9f670b`, and PR192 `d5a6a558237e0cc2103b02ad41f26f20cd2f8758`. No actual merges were performed. Integration conflicts were limited to two ADR registers and three Shopping files: retain both sets of imports/interface methods, retain CS-97 `loadPeriod`/`savePeriod`, and add CS-98 `listPutAway`/`putAway`. The resolved integration patch and evidence live under `/tmp/cooksmith-review/cs98-*` in the saved environment. Rerun exact-head CI after resolving these against future accepted main.

## Tests run

| Check                                                                     | Result                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`, formatting, lint, TypeScript, full tests and production build   | 589 tests / 78 files passed; final static suite recorded in `cs98-static.log`                                                                                                             |
| Full local Playwright                                                     | 30 passed, desktop/mobile Chromium, keyboard, 320px and axe                                                                                                                               |
| Synthetic migration replay / full pgTAP                                   | 561 assertions / 33 files passed, including 40 CS-98 checks                                                                                                                               |
| Authenticated local API                                                   | 13/13 passed: concurrent members, unavailable restoration, repeat after later consumption, partial failure rollback, correction, source isolation, retained receipts and apply/unbuy race |
| Database lint, security advisors, regenerated types                       | No schema/security issues; types match                                                                                                                                                    |
| Combined PR189–192 plus CS-98                                             | 611 app tests / 84 files, 638 SQL assertions / 36 files, 45 authenticated API checks and 38 browser checks                                                                                |
| Preflight, docs, database config, secrets and production dependency audit | Final logs linked from review evidence; existing reviewed React Router RSC exception only                                                                                                 |

Executor database evidence used isolated synthetic PostgreSQL 17/Auth/PostgREST. Standard full Supabase reset, security contracts and generated-type checks must also pass in exact-head GitHub CI. Evidence: `/tmp/cooksmith-review/cs98-{static,browser,db,api,db-lint,advisors}.log`; combined evidence uses `cs98-combined-*`. API source is saved beside those logs. CI and remote head must be linked in the draft PR before acceptance.

## Findings resolved during verification

SQL assertions alone initially missed a stale-review HTTP failure: deliberate SQLSTATE `40001` made the local PostgREST request hang/retry rather than returning a review conflict. The new boundary now uses `PT409`; real API rejection and rollback checks pass. A stale test selector assumed explicit `role=dialog`; the component uses native dialog semantics, and the corrected axe check passes. React ref-render lint findings were fixed with explicit retry-lock state. Definite server rejections now show safe corrective guidance and unlock the review; uncertain responses retain the stable operation and lock. An additional app/API regression verifies this distinction.

A separate bounded check confirmed that PR192 stale freezer edits time out after three seconds on isolated local PostgREST v14.5 (`cs98-existing-stale-http.log`). This needs a fix and passing HTTP regression before beta acceptance. The existing CS-101 source-refresh boundary also deliberately raises `40001` and still needs a bounded HTTP check. This branch does not change those other boundaries.

## Hosted Preview and manual verification

Pending approved isolated hosted resources, use two synthetic members and an unrelated household:

1. Mark an item unavailable in Pantry, buy its Shopping equivalent, review and apply. One Pantry entry becomes available; quantities and purchase history remain.
2. Review two canonical equivalents, correct another name and exclude a group. Cancel first and confirm no changes, then apply and confirm only selected groups are receipted.
3. Apply simultaneously in two browsers. Exactly one applies each source. After marking Pantry unavailable again, retry the original request and reopen after refresh; it must not restore that old purchase.
4. Change bought state or edit/remove a source during review. Reopen after the conflict; no partial selection should have been committed.
5. Switch CS-97 periods before/after applying. Global bought sources are applied once; the period is a reversible view, not another purchase.
6. Verify manual overrides, household switching, keyboard focus, Safari/Firefox, physical iOS/Android and screen readers.

Hosted authenticated flows, physical devices and assistive technology remain unverified. A successful Vercel build, public smoke or automated Jira transition is not this evidence.

## Accessibility, security, privacy and cost

Native dialogs, labelled controls, keyboard operation, 320px reflow and automated serious/critical axe checks are covered. RLS permits only active-member receipt reads; direct client receipt mutations and anonymous RPCs are denied. The private privileged apply function derives identity, checks scoped sources and never trusts client household state. No production data/configuration, real household data, credentials or paid evaluations were used. Incremental recurring estimate A$0/month and A$0/year within existing allocation. Repository secret and dependency checks are required before publication.

## Known limitations, rollback and next milestone

Pantry remains availability-based. Existing quantities are not updated. Put-away does not clear bought history or undo another member's later stock changes. Corrections to the same already-applied purchase do not reopen it; a genuinely new plan/manual purchase has a new identity. Refresh is interaction-driven rather than realtime.

Rollback by hiding put-away and retaining receipts for a forward fix. Do not restore the legacy quantity-increment/delete flow or delete receipt history. Return this draft and its dependency/integration evidence for review before starting any further MVP item.
