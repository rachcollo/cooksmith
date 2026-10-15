# CS-93 — Inspect and repair one selected recipe

Baseline: `main` at `4f2aaa225f3ea4fe4e812f3e709f0f276ac92db7`.
Branch: `fix/cs-93-targeted-recipe-repair`.
Jira: https://smillins.atlassian.net/browse/CS-93 (existing safe recovery scope).

## Approved outcome

An administrator selects one recipe in Admin → Recipes, sees current-rule coverage and a useful failure category, confirms one repair, then reviews the result and estimated A$ cost. Original recipe content remains unchanged. This removes manual production commands and prevents an intended one-recipe repair from draining unrelated work.

## Scope and safety

- Add an admin-only inspection and idempotent reservation/claim boundary for an exact source and version.
- Reserve a dedicated job, excluded from ordinary dispatch. One explicit attempt, no automatic retry or worker chaining.
- Retain server administrator checks, source eligibility, household isolation, provider limits, emergency stop, AI enablement and stale-version activation checks.
- Persist actor/request identity and retain job cost/outcome for review after navigation or a network timeout. Unknown cost is displayed as unknown.
- No original recipe edits, generic prompt editor, bulk pantry, feature enablement, evaluation acceptance, production repair or paid calls in this package.

## Validation and release

Real local pgTAP covers privilege abuse, exact source identity, unrelated-job preservation, idempotency, duplicate claims, operational gates and stale sources. UI/adapter/worker tests cover explicit selected dispatch and result review. Run the full static, database and browser gates; hosted authenticated repair remains separately approved manual validation.

This PR does not deploy Production. After merge, release only the exact approved main SHA through the protected Production database release workflow, including dry-run and migration-history verification. Deploy `enrich-recipe` and the UI from the same SHA. Released migrations are immutable; use forward fixes. Keep AI settings unchanged. Roll back UI/worker if required; reserved jobs have an infinite availability time so an older worker cannot consume them. No new dependencies or recurring service cost (A$0 monthly/annual); future explicit repairs use existing metered provider controls.
