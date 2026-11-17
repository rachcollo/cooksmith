# CS-116 handover: Ingredient purchasing identity

- **Date:** 2026-11-17
- **Branch:** `feat/cs-116-ingredient-identity`
- **Target:** `main`
- **Baseline:** `37da4f748ef96c704ef4623c8a18aa656ec5f75f`
- **PR:** [#228](https://github.com/rachcollo/cooksmith/pull/228), published as draft.
- **Implementation commit:** `0e93849963cf918daa000ae241fb113273bc9ded`
- **Status:** Additive v2 redesign under validation; release held. Earlier evidence below belongs to the superseded combined migration and is not exact-head evidence. Current exact-head CI results are recorded on the PR. Jira is In Review and `codex-ready` remains absent to prevent duplicate scheduled admission.

## Objective and product impact

Recognise equivalent ingredients across recipe purchasing, Shopping and Pantry without model calls. Regular plurals and common imported/Australian terms produce one purchase. Ordered phrase/whole-word category rules place chicken stock, eggplant, cream of tartar and black beans correctly. The existing Pantry guidance names related candidates and asks the shopper to check form and amount. This supports saving time, reducing mental load, food waste and grocery spend without more routine inputs.

## Changes

- Purchasing identity v2 uses inflection rules, noun exceptions and conservative synonyms. Meaningful fresh/powdered, canned/fresh and plain/EVOO distinctions remain.
- A reviewed fixture covers 233 synthetic ingredient labels. Category expectations and identity idempotence run in Vitest; SQL parity runs in pgTAP.
- Frozen v1 identity remains available for released recipe structure validation and stable physical purchase partitions, protecting saved Recipe Intelligence. New and refreshed purchase sources carry identity version 2.
- Existing manual category choices remain authoritative. Generated purchase groups use the current aisle rules.
- Named related Pantry hints retain the current keyboard-operable disclosure. Household-scoped matching excludes unavailable items and leaves multiple candidates unresolved.
- Identity-only refresh updates source metadata in place when source multisets and per-product/unit totals match. Original shopping and contribution IDs, per-row bought states and immutable receipts survive. Legacy backing rows can coexist beneath one displayed purchase.
- Full structural repairs involving receipt-bound sources fail closed with a conflict instead of replacing references. Fresh, safe identity-only retries remain idempotent; stale snapshots reject atomically.
- No unit conversion arithmetic/catalogue, auth, RLS policy, provider or dependency change. Pantry items are never auto-combined.

## Files and contracts

Domain changes are in `src/domain/shopping`, frozen identity imports in recipe structure validators, and named guidance in `ShoppingPage.tsx`. Tests cover unit, integration, browser and database boundaries. [ADR 022](../../architecture/decisions/022-purchase-identity-v2-stable-sources.md) explains stable backing rows and compatibility. [Fixture review](../../../tests/fixtures/ingredient-identity-v2.md) records category policy.

## Migration and release

`20261117094901_ingredient_identity_v2.sql` is now an additive expansion. All v1 function definitions/signatures/ACLs and shared Pantry trigger semantics remain unchanged; the migration checks the existing function catalogue before committing. New app repositories explicitly call versioned reconciliation, refresh, Pantry-save and put-away endpoints. Stable v1 physical partitions support old/new clients concurrently; v2 grouping stays in the new client. No bulk data rewrite, automatic Pantry combination or unit-conversion change occurs.

**Release remains held.** Vercel Git integration automatically aliases main to Production; a protected database approval does not hold application adoption. Expansion-only draft [#234](https://github.com/rachcollo/cooksmith/pull/234), head `1e63e592af50366c15fc6ec059823653c8eda02d`, is required before #228 adoption. Migration blob: `cecc851bd2f117bc9773a6c0c3c90efb89064039`. [#233](https://github.com/rachcollo/cooksmith/pull/233) retains the unchanged-main compatibility gate and ordered release plan. The existing protected workflow is retained unchanged and applies all pending migrations at its event SHA after one environment approval. It has only the boolean out-of-order input, not an arbitrary SHA or dry-run-only mode. Keep that input false.

Accepted-main snapshot: `b68832ee2134d53f36c7c910980085eab9fb3086`, 17 November 2026. Exclude CS-112 #232 head `9931a20d1f4eb88330bbb59a6c08514d0760745b` and migrations `20261117105847` / `20261117113711`, which intentionally change old inviter behaviour; exclude CS-113 partial `20261117105820`. CS-107 #227 head `8d511f5bd0c8c46690dabf11d86668118178085e` has no database migration. Regenerate types from only the accepted schema plus this expansion. Remote migration history, backups and restore readiness remain unverified; no production access or ordering bypass was attempted.

The #233 accepted-main compatibility gate passed against the additive local schema. V2 local application buy/put-away/retry also passed. Final exact-head evidence and expansion/application boundaries will be recorded on the draft PRs; these checks are not hosted validation.

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

## Follow-up independent review (17 November)

Reviewed the full implementation diff against the authoritative Jira acceptance criteria, including frozen structure compatibility, rule precedence, meaningful forms, source preservation, SQL grants/RLS and receipt references.

- Confirmed and fixed renamed manual overrides failing the identity-only check: compare the unambiguous original source product, preserving the household display name, quantity and aisle. The regression failed before the fix: explicit refresh returned PT409 and normal reconciliation reduced two original contribution IDs to one.
- Added TypeScript/SQL exceptions and paired fixtures for mango/mangoes, quiche/quiches and mousse/mousses. The fixture now contains 233 labels; quiche and mousse remain Other because no more specific aisle policy is established.
- Hosted interaction is **blocked**: non-decrypted Vercel environment metadata contains a single `VITE_SUPABASE_URL` record and a single `VITE_SUPABASE_PUBLISHABLE_KEY` record, each targeting both Production and Preview, with no branch-specific alternatives. There are no custom Vercel staging environments, and Supabase Preview is skipped. This does not establish the distinct synthetic staging backend required by [environment guidance](../v2/environment-and-preview.md) and [staging setup](../v2/staging-supabase-setup.md). No hosted household reads, writes or test seeding were attempted; no credentials were decrypted or introduced. Deployment READY is not interaction evidence.
- Follow-up local reruns: 109 application test files / 1,147 tests; fresh database reset/lint and 44 pgTAP files / 1,030 assertions; 112 dedicated security assertions; 12 authenticated HTTP regressions; generated-type freshness; affected Chromium desktop/mobile browser suite 14/14. All passed. The exact new head and CI results are recorded in the PR evidence. Earlier validation counts above refer to the initial implementation head.

## Accessibility, security, privacy and cost

Existing semantic controls and tooltip description wiring are preserved. Chromium checks include automated axe and narrow-screen overflow assertions. RLS remains the household boundary; invoker functions have empty search paths and restricted execution. No real household data, secrets, environment files, model calls or paid services were used. Cost impact: A$0/month and A$0/year.

## Rollback and remaining coordination

Keep the PR draft until required CI and hosted validation are complete. Do not merge without coordinator clearance while CS-107 and package publication proceed. Revert compatible application changes if needed and forward-fix released database changes; never delete receipt evidence. No later milestone has been started.
