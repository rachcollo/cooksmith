# CS-116 handover: Ingredient purchasing identity

- **Date:** 2026-11-17
- **Branch:** `feat/cs-116-ingredient-identity`
- **Target:** `main`
- **Baseline:** `37da4f748ef96c704ef4623c8a18aa656ec5f75f`
- **PR:** [#228](https://github.com/rachcollo/cooksmith/pull/228), published as draft.
- **Implementation commit:** `0e93849963cf918daa000ae241fb113273bc9ded`
- **Status:** Implemented; hosted/manual validation and coordinator clearance pending. Current exact-head CI results are recorded on the PR. Jira is In Review and `codex-ready` remains absent to prevent duplicate scheduled admission.

## Objective and product impact

Recognise equivalent ingredients across recipe purchasing, Shopping and Pantry without model calls. Regular plurals and common imported/Australian terms produce one purchase. Ordered phrase/whole-word category rules place chicken stock, eggplant, cream of tartar and black beans correctly. The existing Pantry guidance names related candidates and asks the shopper to check form and amount. This supports saving time, reducing mental load, food waste and grocery spend without more routine inputs.

## Changes

- Purchasing identity v2 uses inflection rules, noun exceptions and conservative synonyms. Meaningful fresh/powdered, canned/fresh and plain/EVOO distinctions remain.
- A reviewed fixture covers 228 synthetic ingredient labels. Category expectations and identity idempotence run in Vitest; SQL parity runs in pgTAP.
- Frozen v1 identity remains available only for released recipe structure validation, protecting saved Recipe Intelligence. New and refreshed purchase sources carry identity version 2.
- Existing manual category choices remain authoritative. Generated purchase groups use the current aisle rules.
- Named related Pantry hints retain the current keyboard-operable disclosure. Household-scoped matching excludes unavailable items and leaves multiple candidates unresolved.
- Identity-only refresh updates source metadata in place when source multisets and per-product/unit totals match. Original shopping and contribution IDs, per-row bought states and immutable receipts survive. Legacy backing rows can coexist beneath one displayed purchase.
- Full structural repairs involving receipt-bound sources fail closed with a conflict instead of replacing references. Fresh, safe identity-only retries remain idempotent; stale snapshots reject atomically.
- No unit conversion arithmetic/catalogue, auth, RLS policy, provider or dependency change. Pantry items are never auto-combined.

## Files and contracts

Domain changes are in `src/domain/shopping`, frozen identity imports in recipe structure validators, and named guidance in `ShoppingPage.tsx`. Tests cover unit, integration, browser and database boundaries. [ADR 020](../../architecture/decisions/020-purchase-identity-v2-stable-sources.md) explains stable backing rows and compatibility. [Fixture review](../../../tests/fixtures/ingredient-identity-v2.md) records category policy.

## Migration and release

`20261117094901_ingredient_identity_v2.sql` adds v2 functions/indexes and updates reconciliation, refresh and the Pantry alias guard. It does not bulk rewrite or delete household rows. The v1 stored generated identity and its version column retain their old meaning; the new purchasing key and source metadata use v2. Existing shared migrations remain immutable.

The PR does not deploy Production. Production deployment occurs only after merge and coordinator clearance, through the protected **Production database release** workflow using the exact approved `main` SHA. Dry-run and migration-history verification are mandatory. Apply the migration before application rollout. Do not run repair on real households as part of PR verification. Any released database fix uses a new forward migration. No Edge Function release is required.

## Local validation

Local automated evidence follows. Initial regression failures identified expected singular display changes, a literal sea-salt grouping key and a browser test that left the pointer hovering over a hint on reload. The grouping was fixed and browser test now moves the pointer away before verifying initial disclosure state. These were investigated rather than accepted as flaky reruns.

- `npm ci --cache /tmp/cs116-npm-cache`: passed; default home cache was read-only.
- `npm run preflight`: passed with local Supabase CLI cache write access.
- `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: passed. Build emits the existing large-chunk advisory.
- Final complete Vitest run: 109 files / 1,139 tests passed, including frozen-structure compatibility and ambiguous Pantry-alias assertions.
- Chromium desktop/mobile: initial run 52 passed, two new reload-test failures fixed, two pre-existing database opt-in tests skipped. The complete affected purchase suite subsequently passed 14/14, including axe, 320px width, repeat edits, hint dismissal/reopen and reload.
- WebKit binaries downloaded; system library installation could not run because the runner has no root authentication/sudo. Hosted Safari and physical-device evidence are not claimed.
- `npm run db:reset`, `npm run db:lint`, `npm run db:test`: passed, with no schema lint issues and 44 pgTAP files / 1,019 assertions. `npm run db:test:security`: 5 files / 112 assertions passed. Authenticated HTTP regressions: 12/12 passed. `npm run db:types` and `npm run db:types:check`: passed.
- The normal multilayer image exhausted this runner's VFS disk. A flattened copy of the same official image with its original runtime configuration and health check allowed isolated local validation. No repository runtime/configuration change. Database regression testing also confirmed that CS-101's later material-edit/source-kind overlap guard must be retained; the v2 implementation preserves it.
- Documentation command audit, secret/environment scan and production dependency audit passed. The existing reviewed dependency exception remains unchanged.

## Hosted and manual validation

No hosted preview, hosted provider, physical device or assistive-technology check has been performed. Before review, use synthetic staging data only: two recipes with mushroom/mushrooms should show one purchase and the summed compatible amount; canned/fresh tomatoes, garlic/powder and olive oil/EVOO should stay distinct. Check named related Pantry hints by keyboard, then reload. Validate explicit repair and a fresh retry with synthetic legacy contributions and immutable receipts. Test member versus unrelated-household access. Do not use real household data.

## Accessibility, security, privacy and cost

Existing semantic controls and tooltip description wiring are preserved. Chromium checks include automated axe and narrow-screen overflow assertions. RLS remains the household boundary; invoker functions have empty search paths and restricted execution. No real household data, secrets, environment files, model calls or paid services were used. Cost impact: A$0/month and A$0/year.

## Rollback and remaining coordination

Keep the PR draft until required CI and hosted validation are complete. Do not merge without coordinator clearance while CS-107 and package publication proceed. Revert compatible application changes if needed and forward-fix released database changes; never delete receipt evidence. No later milestone has been started.
