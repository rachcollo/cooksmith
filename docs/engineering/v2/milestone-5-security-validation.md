# Milestone 5 security validation

Milestone 5C proves the household security boundary established by Milestones 5A and 5B. The tests execute real PostgreSQL grants, RLS policies and authorisation helpers against deterministic synthetic actors. They do not mock policy outcomes.

## Deterministic actors

| Actor             | Live database state                | Expected household access                      |
| ----------------- | ---------------------------------- | ---------------------------------------------- |
| Owner A           | Active owner of Household A        | Read Household A; manage owner-controlled rows |
| Member A          | Active member of Household A       | Read Household A; no owner-controlled writes   |
| Owner B           | Active owner of Household B        | Household B only                               |
| Unrelated User    | No household membership            | No household access                            |
| Inactive Member A | Inactive membership in Household A | No household access                            |

All identifiers, timestamps and Auth rows are synthetic. The fixture has no email, password, token, customer or production data.

## Final operation matrix

| Table                            | Select        | Insert       | Update       | Delete       |
| -------------------------------- | ------------- | ------------ | ------------ | ------------ |
| `infrastructure_health`          | Deny          | Deny         | Deny         | Deny         |
| `profiles`                       | Self          | Self         | Self         | Deny         |
| `households`                     | Active member | Deny         | Active owner | Deny         |
| `household_members`              | Active member | Active owner | Active owner | Active owner |
| `app_user_roles`                 | Deny          | Deny         | Deny         | Deny         |
| `household_settings`             | Active member | Active owner | Active owner | Active owner |
| `household_dietary_requirements` | Active member | Active owner | Active owner | Active owner |
| `household_allergies`            | Active member | Active owner | Active owner | Active owner |

The pgTAP suite verifies permitted operations and denied operations through both privilege checks and real SQL statements. Cross-household primary keys, household IDs and member IDs are deliberately manipulated. Update checks prevent rows from being moved to a household the caller does not own, while composite foreign keys prevent member-scoped safety records from referencing another household.

## JWT and helper contract

Household access is computed from `auth.uid()` and current database rows. It does not trust household or application roles embedded in JWT claims.

- A missing subject resolves to no actor and fails closed.
- A malformed UUID subject raises PostgreSQL `22P02` and cannot produce access.
- An inactive membership remains denied even when stale claims say `owner` or `admin`.
- An unpersisted application-role claim is ignored.
- A live global application role can be resolved by its helper but never grants household membership or ownership.

The suite also verifies that all three helpers remain stable `security definer` functions with an empty `search_path`, fully database-backed decisions, and execute permission limited to `authenticated`.

## API contract

The database contract has three enforced layers:

1. Catalog tests pin the eight private tables, policy operations, RLS enablement, helper return types, grants and anonymous boundary.
2. `tests/unit/databaseContract.test.ts` compiles representative row, insert and enum contracts from the generated Supabase types and verifies runtime enum constants.
3. CI regenerates `database.types.ts` from a freshly reset database and fails on any diff.

Milestone 5C originally kept `cooksmith` absent from `[api].schemas`. Milestone 6B is the approved integration milestone: it exposes the schema after reviewing grants, policies and adversarial tests together. `scripts/check-database-config.mjs` now requires that approved boundary.

## Test organisation

- `0003_authorisation_and_rls.test.sql`: Milestone 5B security smoke tests.
- `0004_tenant_isolation_matrix.test.sql`: operation and actor matrix plus identifier attacks.
- `0005_jwt_and_helper_security.test.sql`: session edges, stale claims and role separation.
- `0006_api_contract.test.sql`: catalog, policy, grants and helper API contract.

`npm run db:test` runs the complete database suite. `npm run db:test:security` reruns the three Milestone 5C contracts explicitly in CI so they cannot be silently removed from the security gate.

## Extension rule

Every new private table must extend the operation matrix with owner, member, unrelated and inactive actors, identifier manipulation, JWT/session behaviour where relevant, catalog contract checks, generated types and CI coverage before exposure.
