# ADR 020: Upgrade purchase identity without replacing source records

- **Status:** Proposed
- **Date:** 2026-11-17
- **Scope:** CS-116

## Context

Regular plurals and imported recipe synonyms currently produce different purchasing identities. Shopping already groups multiple physical source records into one user-facing purchase. Purchased stock records retain item IDs and contribution source keys; replacing those records merely to improve an identity can orphan purchase evidence.

## Decision

Use deterministic purchasing identity v2 with inflection rules, explicit noun exceptions and conservative synonyms. Retain v1 SQL storage keys and existing physical rows. Add a v2 expression lookup index for household-scoped reconciliation. New incoming requirements look up an existing equivalent row before inserting one; legacy backing rows continue to render as one purchase.

When refreshed source multisets and per-product/unit totals are unchanged apart from purchase identity metadata, update the source JSON in place through existing reconciliation. Preserve every row ID, contribution ID, quantity and receipt. Record identity version 2 on new/refreshed source metadata. The existing bounded structure refresh retains its recipe-version and contribution compare-and-swap guards. Material source/amount changes continue through the established structure repair path.

Keep frozen v1 identity in the persisted recipe structure validators, including both released structure-rules versions. Purchasing applies v2 after extracting the recipe product. This prevents an unrelated identity improvement from invalidating stored Recipe Intelligence. No new structure schema, enrichment generation or model call is needed.

Category rules match whole words and phrases with explicit ordered precedence. Manual category choices remain authoritative; generated purchases use current category rules. Related Pantry candidates are named in existing guidance, without selecting or combining stock.

## Alternatives

- Rebuild and physically merge all legacy rows: rejected because it can invalidate receipt source keys and existing purchase IDs.
- Rewrite the released v1 SQL function: rejected because stored generated identities and frozen recipe structures depend on its meaning.
- Introduce a model or editable catalogue: unnecessary for the approved deterministic scope.

## Consequences

Legacy backing records can remain separate even though the shopper sees one correct purchase. This is deliberate provenance preservation. `ingredient_identity_version` on the legacy storage row remains 1; source JSON and the application purchase key identify the v2 purchasing projection. No unit conversion catalogue or arithmetic changes.

## Security impact

Existing RLS and membership rules remain authoritative. Reconciliation takes the existing household advisory lock; the identity helper also checks membership and acquires that lock. New functions are invoker functions with empty search paths and restricted execution. Pantry aliases are rejected on new writes; existing Pantry rows are never combined. Synthetic tests cover household denial, stale retries and receipt preservation.

## Cost impact

A$0/month and A$0/year. No dependency or provider added.

## Migration impact

Apply `20261117094901_ingredient_identity_v2.sql` before releasing the application. It creates functions/indexes and updates routine definitions; it performs no bulk data rewrite or row deletion. Released migration files remain immutable. The PR does not deploy Production. A coordinated protected Production database release after merge must use the exact approved main SHA, dry-run and migration-history verification.

## Product Principles supported

Save time, reduce mental load, reduce food waste and grocery spend, and keep screens calm. Identity improvements require no extra routine user input.

## Rollback or reconsideration trigger

Stop rollout if SQL/TypeScript parity, stable source references, household isolation or receipt retry tests fail. Revert compatible application changes and forward-fix the database. Do not delete receipts or rewrite the v1 storage identity to force convergence.
