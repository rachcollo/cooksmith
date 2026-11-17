# ADR 022: Upgrade purchase identity without replacing source records

- **Status:** Proposed
- **Date:** 2026-11-17
- **Scope:** CS-116

## Context

Regular plurals and imported recipe synonyms currently produce different purchasing identities. Shopping already groups multiple physical source records into one user-facing purchase. Purchased stock records retain item IDs and contribution source keys; replacing those records merely to improve an identity can orphan purchase evidence.

## Decision

Use deterministic purchasing identity v2 with inflection rules, explicit noun exceptions and conservative synonyms. Retain v1 SQL storage keys and existing physical rows. Add non-unique v2 expression lookup indexes. Preserve v1 physical partitions even for new writes: each v2 grouped requirement retains per-source v1 purchaseName and converted purchaseQuantity, then the v2 endpoint decomposes that requirement before calling unchanged v1 reconciliation. New UI grouping presents one purchase without changing the records an old client expects.

When refreshed source multisets and per-product/unit totals are unchanged apart from purchase identity metadata, update the source JSON in place through additive versioned reconciliation. Preserve every row ID, contribution ID, quantity and receipt. Record identity version 2 on new/refreshed source metadata. The existing bounded structure refresh retains its recipe-version and contribution compare-and-swap guards. Material source/amount changes involving receipts fail closed; other repairs use the original reconciliation behind the v2 validation boundary. All existing v1 function bodies, signatures, ACLs and shared Pantry trigger semantics remain unchanged, verified within the migration itself.

Keep frozen v1 identity in the persisted recipe structure validators, including both released structure-rules versions. Purchasing applies v2 after extracting the recipe product. This prevents an unrelated identity improvement from invalidating stored Recipe Intelligence. No new structure schema, enrichment generation or model call is needed.

Category rules match whole words and phrases with explicit ordered precedence. Manual category choices remain authoritative; generated purchases use current category rules. Related Pantry candidates are named in existing guidance, without selecting or combining stock.

## Alternatives

- Rebuild and physically merge all legacy rows: rejected because it can invalidate receipt source keys and existing purchase IDs.
- Rewrite the released v1 SQL function: rejected because stored generated identities and frozen recipe structures depend on its meaning.
- Introduce a model or editable catalogue: unnecessary for the approved deterministic scope.

## Consequences

Legacy backing records can remain separate even though the shopper sees one correct purchase. This is deliberate provenance preservation. `ingredient_identity_version` on the legacy storage row remains 1; source JSON and the application purchase key identify the v2 purchasing projection. No unit conversion catalogue or arithmetic changes.

## Security impact

Existing RLS and membership rules remain authoritative. Reconciliation takes the existing household advisory lock; the identity helper also checks membership and acquires that lock. New functions are invoker functions with empty search paths and restricted execution. V2 Pantry writes use explicit versioned save/put-away endpoints. A table lock coordinates their duplicate check with legacy direct writes. Old clients retain v1 alias semantics and can still create aliases later; v2 clients present ambiguous matches for explicit selection. No global v2 uniqueness invariant is claimed, and existing Pantry rows are never combined. Synthetic tests cover household denial, stale retries and receipt preservation.

## Cost impact

A$0/month and A$0/year. No dependency or provider added.

## Migration impact

Expand the database separately from application adoption. `20261117094901_ingredient_identity_v2.sql` only adds functions and indexes; it neither replaces existing routines/triggers nor rewrites household data. The expansion PR contains no application runtime changes. Its merge may rebuild the unchanged v1 app through Vercel; the protected database workflow then applies the expansion after approved history/backup checks. Only after isolated staging compatibility and expansion verification may the coordinator authorise #228 application adoption. Both remain draft until that coordination. See the CS-116 release plan for exact inputs and exclusions. No release setting changes are needed or authorised.

The existing workflow has a single protected job, not separate dry-run/apply approvals. It applies all pending migrations at its event SHA. CS-112's two invitation migrations and CS-113's partial import migration must stay excluded; actual remote migration history remains unverified without separately authorised production access. Released migrations are immutable; rollback uses the compatible v1 app and database forward fixes.

## Product Principles supported

Save time, reduce mental load, reduce food waste and grocery spend, and keep screens calm. Identity improvements require no extra routine user input.

## Rollback or reconsideration trigger

Stop rollout if SQL/TypeScript parity, stable source references, household isolation or receipt retry tests fail. Revert compatible application changes and forward-fix the database. Do not delete receipts or rewrite the v1 storage identity to force convergence.
