# CS-79: One useful shopping purchase per product

## Outcome and scope

Draft PR #186 extends merged #185 from main `facd3e5613f41c81dfc6e7915a370244a4ccbf54`, branch `fix/cs-79-shopping-purchase-totals`. The owner requested one useful purchase amount, no recipe dropdown, and then explicitly expanded the pre-MVP scope to reliable ingredient-specific mass/volume conversion. Original recipe/contribution provenance stays internal. No merge, deployment, production mutation or paid evaluation is authorised by this handover.

Root causes reproduced: per-unit storage became multiple visible purchases; usage phrases changed identity; old text parsing misread mixed fractions; recipe edits did not refresh planned shopping contributions. Shopping now uses a purchasing projection for legacy data, one group of actions and exact or approximate totals where supported. Unsupported components stay concise in one row. Fine/coarse/flaked salt, oil grades, dietary variants and material forms are not merged by conversion data. Original recipe cooking text and Get Ahead semantics remain intact.

## Expanded measurement policy for product review

The existing enrichment schema records quantities, dimensions and confidence but no validated density or measurement convention. Reuse recipe rows/source URLs and shopping contribution JSON; no second enrichment system, provider call or catalogue service is added.

- Explicit recipe/manual profiles show their sizes: AU 5/20/250 mL, metric 5/15/250 mL, rounded US cooking 5/15/240 mL for teaspoon/tablespoon/cup. The US profile is not the exact historical/customary cup. Unknown sources stay unknown, including teaspoons. Only Taste and Donna Hay source hosts have a verified automatic rule; country suffix and household locale are not evidence.
- Six versioned catalogue entries cover plain flour, self-raising flour, ordinary butter, caster sugar, white sugar and olive oil grades. Exact product/form matching is required; salted/unsalted butter and oil grades stay separate products. Sources and derivations are in `src/domain/measurements/purchaseMeasures.ts` and ADR 014. Salt flakes/fine/coarse salt, unspecified flour, brown-sugar packing, melted/whipped butter, sprays, infused oils and other forms have no borrowed density.
- Cross-dimension amounts say `about`. Estimates round upward only for final display: whole g/mL at 10 or more, otherwise one decimal; exact totals display two decimals. Legacy fractions are parsed before aggregation. The existing database amount precision remains two decimals. Estimate editors use the displayed rounded amount, not a long floating-point decimal.
- Manual items remain separate by default, matching the updated Jira criterion. “Include in this product’s planned total” explicitly opts in from the editor. Existing protected plan overrides retain their grouping. Group editing keeps all contribution links and an authoritative family adjustment.
- Every planned occurrence contributes once. Ingredient/convention changes refresh amounts; equivalent retries preserve bought state and identity, changed requirements become outstanding, and deliberate family overrides survive. The current planner has no servings multiplier; recipe servings are descriptive, not automatic ingredient scaling.

**Product decisions remain:** accept the bounded catalogue, its approximate source interpretations and rounding, the manual opt-in experience and unsupported fallback before MVP. In particular, reliable generic sea-salt-flake mass/volume conversion is not implemented. Two clarification prompts were left available; implementation follows the existing manual opt-in criterion and conservative catalogue coverage, not an assumed approval of unsupported densities.

## Database and release

Two additive migrations in this draft: `20261004115348_shopping_purchase_groups.sql` and `20261004205943_recipe_purchase_measures.sql`. Released migrations/v1 functions are unchanged. New v3 helpers preserve unspecified spoons/cups; v2 bodies are retained. Existing IDs/amounts survive measurement migration; legacy conventions default unknown. Settings reuse existing recipe ownership/household RLS. Atomic invoker RPCs validate all IDs and membership, preserving provenance. No new exposed table, definer API, Edge Function, dependency or service. Cost A$0/month, A$0/year.

Apply both migrations before the new app selects these columns/calls RPCs. Separate release approval must require exact-SHA CI, backup/dry run, protected **Production database release** workflow, migration-history verification and authenticated acceptance. Public deployment smoke is not functional proof. Forward-fix released migrations; an older app may not honour the newer conversion policy, so rollback needs explicit compatibility review.

## Evidence

The previous draft head `4f0de5d` passed 478 app tests, 463 database assertions, 112 security-subset assertions, six upgrade assertions, six API checks and 22 browser checks. Those counts do not by themselves validate this expanded scope. Expanded local results: 507 app tests in 75 files, 476 database assertions in 29 files (112 security subset), six upgrade assertions, 10 actual repository/API checks, and 24 browser checks passed. All static and schema/type checks passed; six affected browser checks were repeated after the final hint layout. New-head CI evidence is recorded in the PR body after completion.

New coverage includes declared regional sizes; ml/tsp/tbsp/cup/g/kg aggregation; decimals and legacy fractions; sourced approximations; unsupported forms/ranges; manual opt-in; recipe-setting persistence; repeated generation and overrides; and household denial. SQL tests execute real PostgreSQL policies. API tests use the actual repositories with real local PostgREST and locally signed synthetic JWTs; they are not hosted login evidence. Upgrade fixtures are retained under `tests/database-upgrades/`.

Local infrastructure is isolated PostgreSQL 17, real GoTrue schema and PostgREST v14.5. Pinned CLI lint/type generation target loopback only. Full Supabase image expansion was capacity-limited locally; the unchanged CI gate runs full reset/lint/pgTAP/security/types. Chromium checks cover synthetic authenticated purchases, manual measure editing, 320px layout and axe plus public routes. Generated screenshots are visually inspected. Initial browser attempts found a stopped dev server, then a real narrow-screen editor overlap; the server was restarted and the editor layout fixed. An old test asserting DOM child counts was replaced by its existing user-facing control assertions after moving the pantry hint inside the item copy.

## Remaining boundaries

Hosted authenticated acceptance needs a designated disposable account/household and usable session. The earlier preview `/welcome` redirected to Vercel SSO. No real household data was read. Supplied screenshots could not be obtained as image bytes; reproduction uses user text and extracted screenshot text, not visual inspection of those attachments.

CS-98 is separate and still fails: restoring unavailable stock attempts a duplicate insert; replaying a receipt increments stock 1→3→5. Metric put-away may require review rather than converting. No put-away fix is claimed. Existing bundle-size warning and reviewed dependency-advisory exception remain. No arbitrary-unit, arbitrary-ingredient or complete-beta acceptance claim is made.
