# Cooksmith v2

Cooksmith quietly removes the invisible work of feeding a household. `main` is the temporary single source of truth while the private MVP is built. Feature branches are reviewed into `main` and deploy automatically through the existing Vercel project.

## Requirements

- Node.js 24.14.0
- npm 11.9.0
- Docker Desktop or a Docker-compatible runtime for local Supabase

The versions are recorded in `.nvmrc`, `package.json` and the lockfile. Use the pinned versions so local and CI installs remain reproducible.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run db:start
npm run db:reset
npm run dev
```

Open the URL printed by Vite. Obtain local Supabase public values with `npm run db:status`. Never place secrets or service-role values in a `VITE_` variable because Vite exposes those values to the browser.

The application starts safely without an environment file. See [environment and preview setup](docs/engineering/v2/environment-and-preview.md) for the available values.

## Commands

| Command                    | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `npm run preflight`        | Check local tools, environment names and Git state |
| `npm run preflight:all`    | Include Docker and Playwright readiness checks     |
| `npm run dev`              | Start the v2 development server                    |
| `npm run build`            | Type-check and create production assets            |
| `npm run preview`          | Serve the production build locally                 |
| `npm run format`           | Format maintained v2 source and documentation      |
| `npm run format:check`     | Verify formatting without changing files           |
| `npm run lint`             | Run ESLint with zero warnings allowed              |
| `npm run typecheck`        | Run all TypeScript project checks                  |
| `npm run test:unit`        | Run focused unit tests                             |
| `npm run test:integration` | Run application integration tests                  |
| `npm run test`             | Run all Vitest tests                               |
| `npm run test:e2e:install` | Install the local Chromium test browser            |
| `npm run test:e2e`         | Run Playwright shell smoke tests                   |
| `npm run test:e2e:journey` | Run the core journey against local Supabase        |
| `npm run validate:static`  | Run formatting, lint, types, Vitest and build      |
| `npm run validate`         | Run the complete local quality baseline            |
| `npm run db:config:check`  | Check v2 database files and local-only scripts     |
| `npm run db:start`         | Start repository-pinned local Supabase             |
| `npm run db:status`        | Show local Supabase status                         |
| `npm run db:reset`         | Rebuild from v2 migrations and synthetic seed      |
| `npm run db:lint`          | Lint the local v2 schema                           |
| `npm run db:test`          | Run local pgTAP database tests                     |
| `npm run db:test:security` | Run focused adversarial RLS and contract tests     |
| `npm run db:types`         | Generate types from local Supabase                 |
| `npm run db:types:check`   | Detect stale generated database types              |
| `npm run db:validate`      | Run the complete local database gate               |
| `npm run db:stop`          | Stop local Supabase                                |

## Structure

```text
src/
  app/             routing, layouts, providers and boundaries
  application/     use-case orchestration in later milestones
  components/      reusable layout and presentation primitives
  config/          validated runtime configuration
  domain/          framework-independent business rules in later milestones
  infrastructure/  external systems and logging adapters
  routes/          route-level presentation
  shared/          small cross-cutting utilities
tests/
  unit/            isolated rules and components
  integration/     application behaviour across module boundaries
  e2e/             browser-level critical smoke journeys
supabase/
  migrations/      active immutable v2 migrations
  tests/           local pgTAP database tests
  prototype-migrations/ preserved MVP SQL outside the v2 runner
```

Read [project structure and conventions](docs/engineering/v2/project-structure.md) before adding a domain module. The prototype is a product-learning reference only, not a source architecture for v2.

Read [design, routing and navigation](docs/engineering/v2/design-system-and-routing.md) before adding a route or interface component. It documents the primary route map, page-header pattern, component states and accessibility expectations.

Read the [database workflow](docs/engineering/v2/database-workflow.md) before creating a migration. It documents every database command, immutable migration rules, generated types, reset behaviour and Docker troubleshooting.

Read the [core household schema](docs/engineering/v2/core-household-schema.md), [authorisation policy](docs/engineering/v2/authorisation-and-row-level-security.md) and [Milestone 5 security evidence](docs/engineering/v2/milestone-5-security-validation.md) before extending profiles, households, memberships, settings, dietary requirements or allergies.

## CI and previews

Pull requests targeting `main` run a fresh local Supabase migration, seed, lint, pgTAP and generated-type check before formatting, linting, type-checking, unit, integration, build, Chromium and axe checks. CI uses local services and requires no hosted Supabase credentials.

Temporary MVP delivery is `feature branch → main → automatic Vercel deployment`. The primary deployment URL is the canonical application URL. A separate staging integration workflow will be reinstated before public beta. Full environment guidance is in [environment and preview setup](docs/engineering/v2/environment-and-preview.md).

## Contributing

Follow [AGENTS.md](AGENTS.md), the authoritative [documentation index](docs/README.md), and the milestone branch and handover process. Run `npm run preflight`, `npm run docs:commands:check` and `npm run validate` before requesting review. Keep changes within the active roadmap milestone and record material decisions in an ADR.

Dependency changes must be intentional, exact-versioned and accompanied by a regenerated lockfile. See [dependency management](docs/engineering/v2/dependency-management.md).

## Engineering standards

- [Codex build rules](docs/engineering/CODEX_BUILD_RULES.md)
- [Development standards](docs/engineering/DEVELOPMENT_STANDARDS.md)
- [Database standards](docs/engineering/DATABASE_STANDARDS.md)
- [Testing standards](docs/engineering/TESTING_STANDARDS.md)
- [Release checklist](docs/engineering/RELEASE_CHECKLIST.md)
- [Architecture decisions](docs/engineering/ARCHITECTURE_DECISIONS.md)
- [Authentication foundation](docs/engineering/v2/authentication.md)

## Current limitations

- The current v2 routes are purposeful placeholders, not product workflows.
- Hosted authentication email delivery remains pending environment-level Resend SMTP and redirect configuration.
- The `cooksmith` schema remains outside the Data API exposure list. Any later exposure requires matching least-privilege grants, RLS policies and cross-household tests.
- Preview creation and environment values require repository-owner access to Vercel.
- Browser tests install Chromium separately because browsers are not npm package dependencies.
- Local Docker remains optional because GitHub Actions performs the complete Milestone 3 database validation remotely.
