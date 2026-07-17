# Milestone 9A completion report: Recipe Library Foundation

- **Date:** 2026-07-17
- **Branch:** work (requested branch: m09a-recipe-library-foundation; no Git remote/main was available locally)
- **Baseline:** local repository state before this change; remote `origin/main` could not be verified because no `origin` remote is configured.
- **Status:** Implemented, database validation environment-limited

## Objective

Create the first household recipe-library slice so active household members can create, view, edit, search and archive recipe summaries for the active household.

## Scope delivered

- Added `cooksmith.household_recipes` with core recipe summary fields, audit columns, soft archive support, constraints, indexes, RLS and pgTAP coverage.
- Added recipe domain types, input validation and Supabase repository mapping.
- Replaced the recipe placeholder with an authenticated Recipe Library page covering loading, empty, no-result, failure, create, detail, edit, cancel and archive flows.
- Added unit and integration tests for validation and user-visible recipe-library behaviour.

## Lifecycle decision

Milestone 9A uses soft archive via `archived_at`. Active library queries hide archived recipes by default. This preserves future restoration options without adding a restoration UI before it is approved.

## Validation evidence

| Command                                                                               | Result              | Notes                                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                              | Passed with warning | Runner has Node 24.15.0/npm 11.4.2 while the project pins Node 24.14.0/npm 11.9.0.                         |
| `npm run format`                                                                      | Passed              | Formatting applied.                                                                                        |
| `npm run format:check`                                                                | Passed              | Prettier check passed.                                                                                     |
| `npm run lint`                                                                        | Passed              | ESLint passed.                                                                                             |
| `npm run typecheck`                                                                   | Passed              | TypeScript passed.                                                                                         |
| `npm run test`                                                                        | Passed              | 21 files / 73 tests passed.                                                                                |
| `npm run build`                                                                       | Passed with warning | Vite reported the existing chunk-size warning.                                                             |
| `npm run db:config:check`                                                             | Passed              | Local database configuration check passed.                                                                 |
| `npm run db:validate`                                                                 | Environment-limited | Runtime prerequisite check failed because pinned Node/npm versions were unavailable and Docker was absent. |
| `npm run test -- tests/unit/recipeSchemas.test.ts tests/integration/recipes.test.tsx` | Passed              | Focused recipe unit and integration coverage.                                                              |

## Validation still required

`npm run db:validate` remains pending in an environment with the pinned Node/npm versions and Docker-compatible runtime. Database pgTAP was added but could not execute locally because Supabase reset was blocked by those prerequisites.

## Security, privacy and cost

- Household scope is enforced through active-membership RLS policies.
- Audit fields are derived from `auth.uid()` in a private trigger, not caller-supplied values.
- Recipe text and URLs are treated as untrusted; URLs are validated as HTTP(S), and descriptions are rendered as plain React text, not raw HTML.
- No paid services or new dependencies were added. Cost impact: A$0/month and A$0/year.

## Hosted preview smoke test

Not performed in this local environment. Preview validation should exercise the Milestone 9A smoke-test flow from the package prompt on desktop and mobile widths.

## Production database release note

This PR contains a Supabase migration. It does not deploy Production by itself. Production deployment must occur only after merge through the protected Production database release workflow for the exact approved `main` SHA, including dry-run and migration-history verification. Released migrations are immutable; fixes must use forward migrations.
