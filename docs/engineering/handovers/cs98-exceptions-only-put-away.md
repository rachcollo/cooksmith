# CS-98 follow-up: Exceptions-only put-away

- **Date:** 2026-11-07
- **Branch:** `fix/cs-98-exceptions-only-put-away`
- **Target:** `main`
- **Baseline:** `294d24e50a31433f9a4a522fceeffadccc294921`, verified through the connected GitHub repository before editing and again before publication.
- **Commit / pull request:** Recorded in the draft PR's exact-head evidence; the validated local tree is compared with the published Git tree.
- **Status:** Implemented, validation pending.

## Objective

Make put-away a short batch action with only genuine exceptions visible. Separate explicit measurements and recipe commentary from the ingredient name through the existing shared ingredient pipeline, without inventing the actual quantity bought.

## Product impact

- **Principles:** 1, 2, 6, 7, 8 and 10: save time, reduce mental load, fewer taps, clear next action, calm screens and safe automatic handling.
- **Effort removed:** Known Pantry items no longer require repeated review. Users may optionally view all items, correct or exclude them.
- **Primary action:** Put away the ready batch; unresolved alternatives remain pending instead of blocking unrelated purchases.
- **Behaviour changed:** Yes. Shared parsing, pre-purchase projection, receipt extraction and put-away use the same source-aware semantics. Existing manual inline editing and accepted shopping period behaviour remain.

## Changes made

- Introduce deterministic structure rules v2 for compact measures, explicit metric equivalents, exact package totals, notes, optionality, purpose and supported preparation. Preserve the original source and unresolved alternatives.
- Keep existing v1 recipe intelligence valid only after exact reconstruction with the frozen v1 parser and unchanged source/reference validation. Do not re-enrich or rewrite stored recipes.
- Capture structured purchase amounts before marking bought; preserve user overrides, actual receipt quantities and current remainders. Unknown, approximate, unsupported, ranged or extra amounts remain untracked.
- Recover a missing quantity only from a single untouched captured purchase label's own explicit exact metric. Original recipe evidence can repair a matching derived name but cannot refill a receipt's quantity or override a renamed purchase.
- Default to an exceptions-only dialog with optional view-all and correction. Show alternatives, duplicate Pantry candidates and incompatible measurements. Coalesce corrections to the same exact destination once, preserve unknown stock, and sum decimal quantities at persisted precision.
- Retain server-authorised atomic application, stale-source rejection, optimistic Pantry versions, cancellation, partial application and unchanged retry tokens.

## Files and components affected

| Component                                    | Purpose                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Recipe ingredient structure and intelligence | Shared parsing and source-bound v1/v2 compatibility                                        |
| Shopping purchase grouping and types         | Structured pre-purchase measures and explicit override evidence                            |
| Shopping Supabase adapter                    | Safe optional name-evidence extraction, including manual/plan mixtures                     |
| Put-away domain and dialog                   | Exceptions-only review and exact stock-safe batching                                       |
| ShoppingPage                                 | Use the receipt amount boundary when marking bought                                        |
| Component styles                             | Narrow responsive summary, candidate and field layout                                      |
| Unit/integration/browser tests               | Screenshot-derived generic ingredient cases, receipt pipeline, adapter, UI and regressions |
| CS-98 package and proposed ADR 019           | Approved follow-up and compatibility/evidence decision                                     |

## Migrations, dependencies and setup

No new or modified migrations, Edge Functions, generated database types, dependencies, environment variables or paid services. Existing measured-stock RPC contracts remain unchanged. No production access, merge, deployment or data rewrite was performed.

Dependencies installed with the pinned npm toolchain and a writable temporary cache. The local Supabase CLI required a temporary writable HOME; this is runner configuration, not a repository change.

## Tests run

| Command or check                                                                | Result                              | Notes                                                                                              |
| ------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm ci --cache <writable-cache>`                                               | Passed                              | Default runner cache was not writable; no dependency changes                                       |
| `npm run preflight`                                                             | Passed                              | Node 24.22.1, npm 11.9.0, Supabase CLI 2.109.1, scoped branch                                      |
| `npm run format` and `npm run validate:static`                                  | Passed before final evidence update | Final exact-tree result is recorded in the draft PR                                                |
| `npm run docs:commands:check`                                                   | Passed                              | Documented npm commands                                                                            |
| `npm run db:config:check`                                                       | Passed                              | 74 existing migrations                                                                             |
| `npm run engineering:check-secrets`                                             | Passed                              | Staged content is rechecked before commit                                                          |
| `npm run security:audit-production`                                             | Passed                              | Existing documented React Router non-RSC exception retained                                        |
| `npm run db:prerequisites:runtime`                                              | Unavailable                         | No running Docker-compatible runtime                                                               |
| Focused local Playwright put-away desktop/mobile                                | Could not launch                    | System Chromium aborts at socket creation with `Operation not permitted`; no browser test body ran |
| Database reset/lint/pgTAP/security/generated types and authenticated HTTP suite | Not run locally                     | Require the unavailable Docker/Supabase runtime                                                    |
| Hosted Preview, real-device and assistive-technology checks                     | Not run                             | Required before merge; no production substitutes used                                              |

During development two existing shopping integration tests caught a manual inline-edit regression. Preserving explicitly entered manual names/units fixed it; the complete local test suite then passed. Independent review also found mixed-envelope evidence loss and decimal-sum precision issues; both received regression tests. Existing build chunk-size and managed npm proxy warnings are not new failures.

## Preview or verification instructions

Use only a verified Preview with synthetic household data. Do not use the production app or real household records to satisfy this checklist.

1. Add existing Pantry entries for eggs, tomato paste, cumin and black pepper. Mark corresponding shopping purchases bought. Open put-away: show a ready count and one batch action, with no individual ready rows or required fields.
2. Buy a synthetic `600 g of lamb mince or beef mince equivalent` line. Confirm the shopping amount separates correctly, the receipt preserves the bought amount, and optional view-all shows lamb mince and 600 g.
3. Include `25g / 1 1/2 tbsp unsalted butter, melted and cooled`, parmesan plus extra, optional sesame seeds and explicit equivalent/package examples. Confirm metric equivalents are not added twice; unknown extras remain untracked.
4. Add currants-or-raisins, duplicate Pantry candidates and a mass-versus-count conflict. Only these exceptions should be visible. Resolve one, leave another, and apply the ready batch. Left-out sources remain available for later.
5. Open view-all, correct two rows to one destination, and apply. Verify one exact stock delta, including decimal quantities and unknown-source preservation.
6. Cancel without writes; reopen; repeat submit; simulate a stale source, concurrent Pantry update and an uncertain response. Verify atomic rejection or idempotent retry, with no duplicate stock.
7. Check 320px layout, desktop, keyboard focus/dismissal, accessible names and axe; run Chromium and WebKit suites. Confirm manual shopping inline edits still work.
8. Separately review compatibility with the CS-97 next-week shopping draft. Both PRs target accepted main independently; do not merge either implicitly.

## Accessibility, security, privacy and cost

- Existing dialog focus management and keyboard dismissal are retained. Visible field/button wording is included in accessible names. Component behaviour is tested; visual/axe and assistive-technology verification remain pending because the browser cannot launch here.
- Household authorisation, RLS, RPC contracts and immutable receipt tokens are unchanged. Optional source metadata is validated; v1 compatibility does not waive source equality.
- Only generic synthetic fixture data is committed. No screenshots, credentials, real household identifiers or sensitive environment files are included.
- Cost impact: A$0 per month and A$0 per year.

## Known limitations and deferred work

Original punctuation cannot always be recovered from old flattened labels. Unsupported aliases, genuine substitutes and conflicting measures remain uncertain rather than guessed. No bulk pantry repair, recipe migration, new food catalogue, paid AI or automatic purchase-quantity inference is added. Browser/database/Preview validation must pass before this draft becomes merge-ready.

## Rollback approach

Revert this scoped application change before merge if validation exposes a regression. Preserve all purchase/application receipts. No schema rollback is needed. Recheck source-bound intelligence if parser compatibility changes.

## Next step

Finish the exact-head CI, Preview and device review for this draft. No later roadmap milestone is started and neither merge nor deployment is authorised by this handover.
