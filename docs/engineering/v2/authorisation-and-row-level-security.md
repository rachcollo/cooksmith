# Authorisation and row level security

Milestone 5B makes the Cooksmith v2 household foundation default deny and adds the minimum reusable authorisation helpers needed by current and future household policies. PostgreSQL RLS is the final household data boundary. Frontend state, email addresses and global application roles never substitute for active household membership.

## Authorisation helpers

| Helper                                               | Purpose                                               | Source of authority |
| ---------------------------------------------------- | ----------------------------------------------------- | ------------------- |
| `cooksmith.is_active_household_member(household_id)` | Resolves active membership for `auth.uid()`           | `household_members` |
| `cooksmith.has_household_role(household_id, role)`   | Resolves an active owner/member role for `auth.uid()` | `household_members` |
| `cooksmith.has_application_role(role)`               | Resolves a global application role for `auth.uid()`   | `app_user_roles`    |

The helpers are `stable`, `security definer` SQL functions because membership and application-role lookups must not recursively invoke their own RLS policies. Each function:

- lives in the non-exposed `cooksmith` schema;
- fully qualifies every referenced object;
- sets `search_path` to the empty string;
- derives the caller only from `auth.uid()`;
- has `PUBLIC` and `anon` execution revoked;
- grants execution only to `authenticated`.

Do not add arguments that allow a caller to supply a user ID. Do not move these helpers into an exposed schema.

## Policy matrix

No policy means default deny. `anon` has no schema usage or table privileges.

| Table                            | Authenticated read              | Authenticated write                                   |
| -------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `infrastructure_health`          | None                            | None                                                  |
| `profiles`                       | Own row                         | Insert and update own row; no delete                  |
| `households`                     | Active members                  | Active owners may update; no browser insert or delete |
| `household_members`              | Active members of the household | Active owners may insert, update and delete           |
| `app_user_roles`                 | None                            | None                                                  |
| `household_settings`             | Active members                  | Active owners may insert, update and delete           |
| `household_dietary_requirements` | Active members                  | Active owners may insert, update and delete           |
| `household_allergies`            | Active members                  | Active owners may insert, update and delete           |
| `household_invitations`          | Active owners only              | RPC-only; no direct authenticated writes              |

Every update policy has both `using` and `with check`. Application roles are intentionally not referenced by household policies. An administrator without an active household membership therefore receives no household access.

## Self-escalation protection

A member cannot update their membership row because membership writes require an existing active owner role. An unrelated user cannot insert themselves into a household for the same reason. Authenticated clients have no privileges or policies on `app_user_roles`, so global roles can be granted only through a later trusted, audited server-side path.

The schema-level `app_user_roles_no_self_grant` constraint remains defence in depth. It does not replace the browser deny rules.

Milestone 6C adds database-level protection for immutable membership row/user identifiers, one active household per user, and the final active owner; existing RLS continues to reject cross-household movement. Invitation acceptance always creates or reactivates the caller as `member`; no client-supplied role or user identifier is accepted. Removing a member changes the membership to `inactive`, so every existing household policy denies access immediately.

## Data API boundary

Milestone 5B granted `authenticated` the minimum table privileges required for the policies to operate. Milestone 6B is the approved client-integration point and exposes `cooksmith` through the Data API. RLS remains enabled on every private table, anonymous access remains denied, and grants must never broaden without matching policies and adversarial tests.

## Verification

`supabase/tests/0003_authorisation_and_rls.test.sql` provides the Milestone 5B smoke coverage. Milestone 5C adds the complete operation, actor, JWT, helper and API-contract suites in tests `0004` through `0006`. See [Milestone 5 security validation](milestone-5-security-validation.md) for the final evidence matrix and extension rules.

Milestone 6C invitation and membership abuse cases are exercised in `0008_household_invitations.test.sql`, including owner/member/unrelated actors, application-role separation, email mismatch, invalid and expired tokens, duplicate acceptance, immediate removal, final-owner protection, identifier manipulation, and the one-household constraint.

## Extension rules

For each future private table:

1. Include an immutable household scope where the data model requires it.
2. Enable RLS in the same migration that creates or exposes the table.
3. Add the minimum table privileges and explicit policies.
4. Use an existing helper rather than duplicating membership logic.
5. Add both `using` and `with check` to updates.
6. Add cross-household tests before the table is exposed.
7. Keep application-role and household-role decisions separate.

## CS-79 purchasing identity

Shopping contribution rows now have composite foreign keys binding both shopping item and planned meal to `household_id`. Existing active-member RLS applies to the nested contribution source-quantity read. Reconciliation checks active membership and meal ownership and uses a household advisory lock. Pantry identity validation is an invoker trigger under existing RLS, with an identity-scoped transaction lock; it does not read or merge another household’s Pantry. See [ADR 014](../../architecture/decisions/014-purchasing-ingredient-identity.md).

CS-79 measurement settings reuse the existing household-recipe, private-import ownership and shopping membership policies. No new exposed table or definer function is introduced. Conventions are constrained to the declared enum, manual combination defaults false, and grouped RPCs validate household membership/all item IDs before writing either setting. `0037_purchase_measure_conventions.test.sql` verifies persisted provenance, invalid settings, explicit overrides and cross-household denial.

## CS-98 put-away receipts

`shopping_put_away_batches` and `shopping_put_away_receipts` expose SELECT only to active household members. Anonymous access and direct client insert/update/delete are denied. `shopping_put_away_sources` is a security-invoker read; `put_shopping_away` delegates to a private privileged transaction that derives the actor from `auth.uid()`, rechecks current membership, validates household source identifiers and snapshot tokens, and records Pantry availability plus receipts atomically. The household Shopping lock coordinates purchase-level completion, overrides and source refresh. Historical receipts are retained after Shopping deletion. See [ADR 017](../../architecture/decisions/017-shopping-put-away-receipts.md) and pgTAP `0044`.

## CS-101 public recipe refresh lock

Public imported recipes remain readable but cannot be updated or deleted by ordinary clients, including their importing owner. Private imports remain editable only by their owner. Shopping overrides change household purchases, never the public source recipe; existing household-recipe collaboration rules are unchanged.

`cooksmith_private.lock_shopping_imported_recipe_version(uuid,uuid,uuid)` is a restricted, non-Data-API security-definer capability needed because PostgreSQL applies UPDATE RLS to locking SELECTs. Granting UPDATE visibility to public readers would undermine source protection. The helper instead derives `auth.uid()`, checks active household membership and the exact household/meal/imported-recipe link, then locks only an unarchived public recipe or the caller's own private import. It returns only `updated_at`; it cannot update a recipe. Empty search path, fully qualified objects and revoked PUBLIC/anon execution limit its authority. The exposed refresh remains security invoker, with its existing household/contribution checks and PT409 version comparison. The share lock survives through reconciliation until transaction end.

`0041_shopping_public_recipe_lock.test.sql` covers member/owner, unrelated/inactive/missing caller, unlinked and cross-household identifiers, private-owner visibility, archival and unpublishing. `scripts/http/shopping-public-refresh.test.mjs` covers the real repository over authenticated HTTP: edit a Shopping ingredient, refresh an unchanged public recipe, retain overrides/bought/manual purchases, retry idempotently, reject stale versions, leave the source unchanged, deny public and other-owner edits, and preserve own-private editing. HTTP suites run sequentially because these local fixtures share seeded households.
