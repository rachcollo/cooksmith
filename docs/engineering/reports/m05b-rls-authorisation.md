# Milestone 5B completion report: Authorisation helpers and row level security

## 1. Status

**Complete**

Implementation and all available local and GitHub Actions validation are complete. Docker-backed database verification ran in the isolated GitHub Actions environment.

## 2. Baseline commit

- Starting branch: `v2`
- Starting commit: `a065364c10fcdafc86266ebaba572c2f67aee559`
- Starting working tree: clean
- Milestone 5A present through merged pull request #6
- Working branch: `m05b-rls-authorisation`

## 3. Helper functions created

- `cooksmith.is_active_household_member(uuid)`
- `cooksmith.has_household_role(uuid, cooksmith.household_role)`
- `cooksmith.has_application_role(cooksmith.application_role)`

All are stable security-definer SQL functions with empty `search_path`, fully qualified relations, `auth.uid()` caller resolution and execute permission restricted to `authenticated`.

## 4. RLS policies implemented

RLS is enabled on every current Cooksmith table. Profiles are self-scoped. Active household members can read household data. Active owners can manage membership, settings, dietary requirements and allergies. Infrastructure and application-role tables remain default deny. No application role bypasses household membership.

## 5. Policy matrix

| Table                            | Read          | Insert | Update | Delete |
| -------------------------------- | ------------- | ------ | ------ | ------ |
| `infrastructure_health`          | Deny          | Deny   | Deny   | Deny   |
| `profiles`                       | Self          | Self   | Self   | Deny   |
| `households`                     | Active member | Deny   | Owner  | Deny   |
| `household_members`              | Active member | Owner  | Owner  | Owner  |
| `app_user_roles`                 | Deny          | Deny   | Deny   | Deny   |
| `household_settings`             | Active member | Owner  | Owner  | Owner  |
| `household_dietary_requirements` | Active member | Owner  | Owner  | Owner  |
| `household_allergies`            | Active member | Owner  | Owner  | Owner  |

Anonymous access is denied throughout.

## 6. Validation results

| Command or check                      | Result          | Notes                                                                        |
| ------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| Baseline and working-tree inspection  | Passed          | Correct merged `v2` baseline                                                 |
| Supabase current documentation review | Passed          | Confirmed RLS, grants, update checks and hardened helper pattern             |
| `npm ci`                              | Passed          | Clean exact dependency installation after using the writable workspace cache |
| `npm run format`                      | Passed          | Repository formatting applied                                                |
| `npm run db:config:check`             | Passed          | Three timestamped local-only migrations recognised                           |
| `npm run db:prerequisites`            | Passed          | Pinned Node, npm and Supabase CLI available                                  |
| `npm run lint`                        | Passed          | Zero warnings                                                                |
| `npm run typecheck`                   | Passed          | Strict TypeScript checks                                                     |
| `npm run test`                        | Passed          | 8 files and 30 application tests                                             |
| `npm run build`                       | Passed          | Production TypeScript and Vite build                                         |
| `npm run db:validate`                 | Passed remotely | Fresh reset, database lint, pgTAP and generated-type freshness passed in CI  |
| GitHub Actions database tests         | Passed          | Existing schema tests plus 24 Milestone 5B RLS smoke checks                  |
| GitHub Actions browser smoke tests    | Passed          | Existing application and accessibility baseline preserved                    |
| Tracked-file secret scan              | Passed          | No credential, private-key or service-role value found                       |
| `git diff --check`                    | Passed          | No whitespace errors                                                         |

## 7. Deferred work for Milestone 5C

- Full operation-by-operation tenant-isolation matrix
- Inactive membership and lifecycle edge cases
- Missing, malformed and stale JWT scenarios
- Broader helper and policy abuse cases
- API-contract verification
- Coverage for later private tables

Authentication UI, onboarding, invitations and all product domains remain outside both 5B and 5C.

## 8. Git handover

- Branch: `m05b-rls-authorisation`
- Local completion commit: `e6db619063cc915eb39031ee59dd299a4f3fe6b0`
- Published implementation commit: `116d9c1d7214165115e4427138211fb542d23d88`
- Publishing status: draft pull request #7
- Pull request target: `v2`
- `main`: unchanged
