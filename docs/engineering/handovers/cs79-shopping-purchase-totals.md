# CS-79: One useful shopping purchase per product

## Scope and outcome

Follow-up to merged PR #185, starting from main `facd3e5613f41c81dfc6e7915a370244a4ccbf54`, on `fix/cs-79-shopping-purchase-totals`. The owner reported duplicate sea salt/flakes and extra virgin olive oil and asked to remove the recipe dropdown. One visible purchase now aggregates compatible amounts and shows a concise mixed amount when conversion is not justified. Original contribution provenance remains internal. Old text/derived rows, Unicode/mixed fractions, prep wording and trailing `to taste` are handled in the purchasing projection. Recipes and Get Ahead source data are not rewritten.

Root causes verified locally: unit-specific storage was rendered as separate purchases; trailing usage phrases changed product identity; old recipe parsing could retain the full quantity-bearing line or misread mixed fractions; recipe edits did not refresh existing planned shopping contributions. The supplied screenshots could not be downloaded as image bytes. Reproduction uses user text and extracted screenshot text, not visual inspection of those attachments.

Metric teaspoons use 5 mL. Tablespoons and cups remain explicit because source convention is unknown. Weight/volume totals never use assumed densities. Fine/coarse sea salt, flakes, olive oil grades and packaged forms remain distinct. Unspecified sea salt may use specifically requested flakes only without conflicting fine/coarse forms. The interface retains one row and one set of actions; partially bought products show the outstanding amount.

## Persistence, security and release

One new forward migration: `20261004115348_shopping_purchase_groups.sql`. Released migrations and v1 SQL normalisers are unchanged. No Edge Function or dependency changes. No paid evaluation/provider call, new service or recurring cost: A$0/month and A$0/year.

New invoker RPCs atomically complete, edit and remove all supplied household members; inactive/other households and mixed valid/invalid IDs are rejected. Contribution links survive explicit family adjustments. Old source-linked manual edits are protected as overrides. Equivalent regeneration retains bought state; increased requirements become outstanding. Saving a recipe refreshes linked planned contributions, with a clear partial-success message if the refresh fails.

The migration is required before the new application calls these RPCs. No production mutation, migration, merge or deployment was performed for this follow-up. After separate approval, require green exact-SHA CI, backup and dry run, then the protected **Production database release** workflow against the approved main SHA, migration-history verification, and authenticated household acceptance. Public deployment smoke is insufficient. Released migrations need forward fixes; only revert the app to a schema-compatible consumer.

## Local evidence

Checks use synthetic data only. The local stack is isolated PostgreSQL 17, real GoTrue auth schema and PostgREST v14.5, with locally signed synthetic JWTs. It is not a hosted user login. Full Supabase image expansion exceeded workspace capacity earlier; pinned CLI lint/type generation targeted the isolated loopback database. CI must run the standard full Supabase reset/lint/pgTAP/security/type gate.

- Full static validation passed: formatting, lint, types, 478 app tests in 74 files and production build.
- Database suite: 463 assertions in 28 files; includes 18 new grouped-purchase assertions for atomicity, overrides, security and completion semantics.
- Upgrade fixture: six assertions over the pre-follow-up schema and old unit records, IDs, bought state, manual overrides and provenance. Fixture retained in `tests/database-upgrades/`.
- Real repository/REST baseline regression: 10 checks passed; two CS-98 checks failed as described below. These are expected findings, not a clean full journey pass.
- Real repository/REST follow-up: six checks passed for legacy ingredient refresh, equivalent bought state, changed amount, explicit adjustment persistence, cross-household grouped edit denial and group deletion/provenance cleanup. No provider calls.
- Desktop/mobile synthetic authenticated Shopping browser fixture plus public-route checks: 22 passed; 320px check included. Screenshots visually inspected locally. Browser fixtures use synthetic repository data; API persistence is tested separately.
- CLI schema lint: no errors. Types generated from schema, not manually edited. Preflight, 57-migration config check, documentation audit, secret scan and production dependency audit pass (existing reviewed React Router advisory exception).

Intermediate checks caught a test mock type error, forbidden inline type import and duplicate Shopping main landmarks; these were fixed. The first upgrade fixture invocation failed on pgTAP query syntax, then was corrected and rerun. Production build retains the existing large-bundle warning.

## Remaining boundaries

Hosted authenticated acceptance is blocked on a designated disposable account/household and usable session; preview protection is not proof of application behaviour. No real household shopping data was read. Actual attachment images remain unavailable, so do not claim the full screenshot reproduction is verified.

CS-98 remains separate: putting away unavailable `kumquat nectar` attempts a duplicate insert, and retrying a receipt increments stock from 1 to 3 to 5. Metric g/kg put-away currently requests review/skips rather than converting. Those defects are not fixed or hidden by shopping grouping. Review authenticated put-away before broad beta use. Regional tablespoon/cup conventions, fuzzy identity expansion and general density conversion remain out of scope.
