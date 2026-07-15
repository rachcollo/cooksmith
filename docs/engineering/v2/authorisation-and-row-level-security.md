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

Every update policy has both `using` and `with check`. Application roles are intentionally not referenced by household policies. An administrator without an active household membership therefore receives no household access.

## Self-escalation protection

A member cannot update their membership row because membership writes require an existing active owner role. An unrelated user cannot insert themselves into a household for the same reason. Authenticated clients have no privileges or policies on `app_user_roles`, so global roles can be granted only through a later trusted, audited server-side path.

The schema-level `app_user_roles_no_self_grant` constraint remains defence in depth. It does not replace the browser deny rules.

## Data API boundary

Milestone 5B granted `authenticated` the minimum table privileges required for the policies to operate. Milestone 6B is the approved client-integration point and exposes `cooksmith` through the Data API. RLS remains enabled on every private table, anonymous access remains denied, and grants must never broaden without matching policies and adversarial tests.

## Verification

`supabase/tests/0003_authorisation_and_rls.test.sql` provides the Milestone 5B smoke coverage. Milestone 5C adds the complete operation, actor, JWT, helper and API-contract suites in tests `0004` through `0006`. See [Milestone 5 security validation](milestone-5-security-validation.md) for the final evidence matrix and extension rules.

## Extension rules

For each future private table:

1. Include an immutable household scope where the data model requires it.
2. Enable RLS in the same migration that creates or exposes the table.
3. Add the minimum table privileges and explicit policies.
4. Use an existing helper rather than duplicating membership logic.
5. Add both `using` and `with check` to updates.
6. Add cross-household tests before the table is exposed.
7. Keep application-role and household-role decisions separate.
