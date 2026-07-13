# Cooksmith v2

Cooksmith quietly removes the invisible work of feeding a household. This branch contains the clean v2 application foundation. It is independent of the prototype on `main` and deliberately contains no household, pantry, recipe, planning or shopping-list functionality yet.

## Requirements

- Node.js 24.14.0
- npm 11.9.0

The versions are recorded in `.nvmrc`, `package.json` and the lockfile. Use the pinned versions so local and CI installs remain reproducible.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open the URL printed by Vite. The only current environment values are public build metadata. Never place credentials in a `VITE_` variable because Vite exposes those values to the browser.

The application starts safely without an environment file. See [environment and preview setup](docs/engineering/v2/environment-and-preview.md) for the available values.

## Commands

| Command                    | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `npm run dev`              | Start the v2 development server               |
| `npm run build`            | Type-check and create production assets       |
| `npm run preview`          | Serve the production build locally            |
| `npm run format`           | Format maintained v2 source and documentation |
| `npm run format:check`     | Verify formatting without changing files      |
| `npm run lint`             | Run ESLint with zero warnings allowed         |
| `npm run typecheck`        | Run all TypeScript project checks             |
| `npm run test:unit`        | Run focused unit tests                        |
| `npm run test:integration` | Run application integration tests             |
| `npm run test`             | Run all Vitest tests                          |
| `npm run test:e2e:install` | Install the local Chromium test browser       |
| `npm run test:e2e`         | Run Playwright shell smoke tests              |
| `npm run validate:static`  | Run formatting, lint, types, Vitest and build |
| `npm run validate`         | Run the complete local quality baseline       |

## Structure

```text
src/
  app/             routing, layouts, providers and boundaries
  application/     use-case orchestration in later milestones
  components/ui/   small reusable presentation primitives
  config/          validated runtime configuration
  domain/          framework-independent business rules in later milestones
  infrastructure/  external systems and logging adapters
  routes/          route-level presentation
  shared/          small cross-cutting utilities
tests/
  unit/            isolated rules and components
  integration/     application behaviour across module boundaries
  e2e/             browser-level critical smoke journeys
```

Read [project structure and conventions](docs/engineering/v2/project-structure.md) before adding a domain module. The prototype is a product-learning reference only, not a source architecture for v2.

## CI and previews

Pull requests targeting `v2` run clean installation, formatting, linting, type-checking, unit and integration tests, production build and Chromium smoke tests. Vercel can create an independent, non-production branch preview from the repository root using `vercel.json`.

The preview must retain `main` as the production branch. Configure preview-only variables in the Vercel project settings, not in source control. Full instructions and the manual platform checks are in [environment and preview setup](docs/engineering/v2/environment-and-preview.md).

## Contributing

Follow [AGENTS.md](AGENTS.md), the authoritative [documentation index](docs/README.md), and the milestone branch and handover process. Run `npm run validate` before requesting review. Keep changes within the active roadmap milestone and record material decisions in an ADR.

Dependency changes must be intentional, exact-versioned and accompanied by a regenerated lockfile. See [dependency management](docs/engineering/v2/dependency-management.md).

## Current limitations

- This milestone provides an application shell, not product workflows.
- Authentication and Supabase integration begin only in their approved milestones.
- Preview creation and environment values require repository-owner access to Vercel.
- Browser tests install Chromium separately because browsers are not npm package dependencies.
