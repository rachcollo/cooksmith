# CS-101 handover: refresh unchanged public recipes safely

- Date: 2026-10-06
- Branch: `fix/cs-101-normal-refresh-failure`, targeting `main`
- Baseline: `c7b045ccb6ef076869b7ac3ff25fc77a0aed6e88` (PR194 accepted)
- Status: implemented and locally validated; draft review and hosted/manual acceptance pending
- Jira: [CS-101](https://smillins.atlassian.net/browse/CS-101)

## Problem and evidence

The owner edited an ingredient in Shopping, not its recipe. The following Refresh recipe amounts action failed. Read-only production logs show HTTP 409 with `Recipe changed.` at 02:59:34.528 and 03:00:11.494 UTC on 2026-10-06. The PT409 migration from PR194 is applied; that fix stopped deliberate conflicts being retried indefinitely but did not fix this false conflict.

The released security-invoker refresh selects imported recipes `FOR SHARE`. PostgreSQL applies UPDATE RLS to locking SELECTs, whereas public recipes deliberately have SELECT visibility but no UPDATE visibility. An unchanged public recipe therefore returns no locked row and trips the version guard. Local authenticated reproduction reads one public row normally and zero rows with `FOR SHARE`; the real Shopping repository fails in 49 ms, and its raw HTTP call returns PT409 `Recipe changed.` while the recipe timestamp is identical before/after. This is not a timestamp conversion or evidence that the owner changed a recipe. SQL-only tests and the previous household-recipe HTTP test omitted this public-source path.

## Correction and safety boundary

The additive migration `20261006030557_shopping_refresh_public_recipe_lock.sql` replaces only the imported-recipe locking statement with a narrowly scoped private helper. It checks the caller, active household membership, exact planned recipe linkage, archival and public/own-private visibility. It returns the locked row's version and holds the share lock until transaction completion. The public refresh remains security invoker; all meal/version/contribution guards, shopping locks and reconciliation semantics remain. No existing policy or public recipe UPDATE/DELETE permission changes. No recipe rows are changed by refresh. See the [policy documentation](../v2/authorisation-and-row-level-security.md#cs-101-public-recipe-refresh-lock).

This removes a failed household action while preserving trust in shared source recipes and the household's purchase choices. No frontend, dependencies, Edge Functions, provider configuration or recurring fees change. Cost impact: A$0 monthly and annually.

## Validation

- New real-repository HTTP regression runs as a normal household member against a public import: edit a planned tomato purchase to a deliberate name/quantity override, mark another ingredient bought, add a manual purchase, refresh, compare preserved values and unchanged source, retry without duplication, and reject a genuinely stale version. Negative checks deny public UPDATE/DELETE and other-owner private UPDATE; own-private customisation succeeds.
- New pgTAP abuse cases retain public write restrictions and test helper scope/visibility. All normal HTTP regressions have four-second request bounds and reject hosted endpoint configuration.
- Supplemental two-session local PostgreSQL evidence proves the helper blocks concurrent unpublishing until the refresh transaction ends. In the reverse ordering, a refresh waits for a recipe write then rejects its newly changed version with PT409 without changing contributions.
- The exact Shopping-edit/public-recipe regression fails against the released locking statement and passes after this correction (`public-refresh-exact-before.log`). Local evidence lives under `/tmp/cooksmith-review/public-refresh-*`; the initial direct RPC reproduction is `refresh-public-before.log`.

| Check                                                                                      | Standalone current-main correction | Combined pending beta tree                                                                 |
| ------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run validate:static` (format/lint/types/Vitest/build)                                 | Pass; 586 tests / 77 files         | Pass; 620 tests / 85 files                                                                 |
| Full local migration replay and pgTAP                                                      | Pass; 535 assertions / 33 files    | Pass; 652 assertions / 37 files                                                            |
| Authenticated HTTP tests, sequential execution                                             | 3 passed                           | 4 passed, including freezer conflicts                                                      |
| Playwright desktop/mobile Chromium                                                         | 28 passed                          | 42 passed, including CS-95                                                                 |
| Database lint / security advisors                                                          | Pass / no issues                   | No errors / no advisor issues; two existing private put-away array-initialisation warnings |
| Fresh generated exposed-schema types                                                       | Exact match                        | Exact match                                                                                |
| Preflight, docs commands, database config, production dependency audit, staged secret scan | Pass                               | Prior feature evidence retained; correction checked in combined full suite                 |

The combined worktree contains PR189–193 at their previously verified heads, accepted PR194, paused CS-95 and this correction. Only the appended authorisation-document section needed manual integration; implementation/tests applied without conflict. Extended lint of both schemas found existing `put_shopping_away` text-to-array initialiser warnings from PR193; its database suite passes and no fix is mixed into this correction. The standard exposed-schema lint is clean. Existing build chunk-size warnings remain. Exact-head GitHub Actions results and draft URL are reported in the PR; hosted preview acceptance is pending.

- No production refresh RPC, production mutation, paid evaluation or hosted user acceptance was performed. Read-only incident log/configuration inspection was authorised. Browser fixture checks are not authenticated hosted proof.

## Release and acceptance

**Migrations in this PR: yes. Edge Functions changed in this PR: no.** This draft does not deploy Production. A later owner-approved merge/release must use the protected Production database release workflow for the exact approved main SHA, with backup/forward-fix plan, migration-history verification and dry run. Released migrations are immutable. Other pending feature migrations have older timestamps than the already released PR194 migration; inspect the complete pending history and approved release plan rather than renaming files or assuming a newer timestamp includes them.

After approved release, verify a synthetic household on the hosted app: select a public recipe, add its ingredients to Shopping, edit a purchase, mark another bought, refresh recipe amounts, confirm the edit/bought/manual state survives and no error appears, then repeat. Public recipe content must remain unchanged. Rare stale-snapshot behaviour is covered by controlled automated timing, not an ordinary two-tab item-edit exercise. Hosted authenticated acceptance, Safari/Firefox, physical devices and assistive technology remain unverified here. Wider beta gates remain separate.

Rollback uses a new forward migration while preserving source permissions and snapshot protection; do not restore retryable 40001 errors or grant public writes. No merge, deployment, production data change or Jira Done transition is authorised by this handover. CS-95 remains paused and preserved while this release blocker is reviewed.
