# Milestone 5C completion report: Database validation and adversarial RLS testing

## 1. Status

**Complete**

Implementation and all local and GitHub Actions validation are complete. Docker-backed database verification ran in the isolated GitHub Actions environment.

## 2. Baseline commit

- Starting branch: `v2`
- Starting commit: `7bcb10750472b9652491a8a47cd5be56661cb193`
- Starting working tree: clean
- Milestones 5A and 5B present
- Engineering standards present through merged pull request #8
- Working branch: `m05c-database-validation`

## 3. Summary

Milestone 5C adds deterministic inactive-member coverage, full operation-oriented tenant-isolation tests, JWT edge cases, adversarial identifier tests, helper hardening checks, an API-contract suite, generated-type compile checks and explicit CI enforcement. No product functionality or Milestone 6 work was implemented.

## 4. Security test matrix

| Surface               | Owner           | Member          | Unrelated      | Inactive       | Operations and attacks                                |
| --------------------- | --------------- | --------------- | -------------- | -------------- | ----------------------------------------------------- |
| Infrastructure health | Denied          | Denied          | Denied         | Denied         | SELECT/INSERT/UPDATE/DELETE grants absent             |
| Profiles              | Self only       | Self only       | Self only      | Self only      | Cross-ID read/write rejected; delete absent           |
| Households            | Own tenant      | Own tenant read | Denied         | Denied         | Cross-ID update rejected; create/delete absent        |
| Memberships           | CRUD own tenant | Read only       | Denied         | Denied         | Self-promotion, cross-tenant insert/move/delete       |
| Application roles     | Browser denied  | Browser denied  | Browser denied | Browser denied | Global role does not grant household access           |
| Settings              | CRUD own tenant | Read only       | Denied         | Denied         | Cross-tenant identifiers and every operation          |
| Dietary requirements  | CRUD own tenant | Read only       | Denied         | Denied         | Cross-tenant identifiers and every operation          |
| Allergies             | CRUD own tenant | Read only       | Denied         | Denied         | Cross-household member identifier and every operation |

## 5. JWT edge-case coverage

- Missing subject fails closed in all helpers and RLS reads.
- Malformed UUID subject produces `22P02` and no access.
- Stale `owner` and `admin` claims cannot reactivate an inactive membership.
- Unstored application-role claims are ignored.
- Live application roles remain separate from household roles.

## 6. Adversarial testing summary

The suite manipulates known household, membership and safety-record identifiers across Household A and Household B; attempts member self-promotion; tests an unrelated global administrator; and verifies inactive users cannot read or write. Tests exercise PostgreSQL policies directly rather than mocking RLS.

## 7. API contract verification

Catalog tests pin the private table set, exact policy-operation surface, RLS state, grants, helper returns and anonymous boundary. A TypeScript test compiles representative generated row, insert and enum types. The configuration checker rejects adding `cooksmith` to the Data API schema list.

## 8. Generated type verification

The committed generated file remains the schema-derived source for database rows. CI performs a fresh reset, regeneration and `git diff --exit-code`; the new compile-time contract test verifies representative table and enum shapes.

## 9. CI updates

The existing `v2 quality` job now runs `npm run db:test:security` after the complete pgTAP suite. Database reset, lint, generated-type freshness, application checks, build and browser checks remain intact.

## 10. Validation results

| Command or check                  | Result          | Notes                                                                         |
| --------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| Standards and baseline inspection | Passed          | Correct merged `v2` baseline                                                  |
| `npm ci`                          | Passed          | Exact lockfile install; writable temporary cache required in this environment |
| `npm run db:config:check`         | Passed          | Three immutable migrations and private API boundary verified                  |
| `npm run db:prerequisites`        | Passed          | Pinned Node, npm and Supabase CLI available                                   |
| `npm run format:check`            | Passed          | All maintained source and documentation formatted                             |
| `npm run lint`                    | Passed          | Zero warnings                                                                 |
| `npm run typecheck`               | Passed          | Strict TypeScript and generated contract checks                               |
| `npm run test`                    | Passed          | 9 files and 33 application/API-contract tests                                 |
| `npm run build`                   | Passed          | Production TypeScript and Vite build                                          |
| Markdown link verification        | Passed          | All local links in 57 Markdown files resolve                                  |
| `npm run db:validate`             | Passed remotely | Fresh reset, lint, complete pgTAP suite and type freshness passed in CI       |
| `npm run db:test:security`        | Passed remotely | Focused tenant, JWT, helper and API contracts passed independently            |
| GitHub Actions browser checks     | Passed remotely | Playwright, responsive and accessibility regressions preserved                |
| `git diff --check`                | Passed          | No whitespace errors                                                          |
| Tracked secret scan               | Passed          | No private-key, token, AWS-key or service-role value found                    |

## 11. Known limitations

- The `cooksmith` schema remains deliberately outside the Data API.
- Trusted application-role administration, Auth UI and household lifecycle workflows remain later work.
- Local database validation still depends on a Docker-compatible runtime; CI supplied the accepted equivalent.

## 12. Git handover

- Branch: `m05c-database-validation`
- Local implementation head: `3c2f340f069d470ba2d7f3eaf3cad698c0df71bd`
- Published validated head: `a616fe023087db97f6d91551818ec0b6fc2e45c2`
- Publishing status: draft pull request #9
- Pull request: <https://github.com/rachcollo/cooksmith/pull/9>
- Pull request target: `v2`
- `main`: unchanged

## 13. Final Milestone 5 status

Complete. Milestones 5A, 5B and 5C now provide the schema, default-deny RLS framework and full adversarial proof suite.

## 14. Readiness for Milestone 6

Ready for Milestone 6 after pull request #9 is reviewed and merged into `v2`. Milestone 6 has not begun.
