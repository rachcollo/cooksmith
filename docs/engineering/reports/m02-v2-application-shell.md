# Milestone 2 completion report: v2 application shell and quality baseline

## 1. Summary

Milestone 2 establishes a clean Cooksmith v2 React application on its own milestone branch from `v2`. It provides a branded, responsive shell; base routes; accessible UI primitives; controlled loading, error and not-found patterns; validated public build configuration; structured logs; deterministic quality tooling; pull-request CI; and Vercel branch-preview configuration.

No product workflow, authentication, household model, Supabase integration, database schema, pantry, recipe, planning, shopping-list or AI behaviour was added.

## 2. Repository assessment

The merged `v2` branch contained the Milestone 1 governance documents plus the prototype application copied from `main`. The prototype had a single application composition, browser-side Supabase coupling, unpinned `latest` dependencies, no unit or browser test framework, no formatting check, no flat ESLint configuration, no type-check script, no pull-request CI and generated `dist` assets tracked in Git.

The repository already had an active Vercel connection and the approved React, TypeScript and Vite toolchain. The authoritative architecture also approves React Router, Vitest, React Testing Library and Playwright.

## 3. Reuse decisions

| Decision                                             | Result                                      | Reason                                                                                   |
| ---------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| React, TypeScript and Vite                           | Reused with exact versions                  | Explicitly approved and suitable for the target architecture                             |
| Vercel connection and root build                     | Reused with committed preview configuration | Existing connection can create independent branch previews without changing `main`       |
| Brand colours, type direction and calm visual intent | Selectively reinterpreted                   | Consistent with Product Principles without carrying prototype composition forward        |
| Prototype `App.tsx`, hooks and local data            | Rejected                                    | Monolithic presentation and business concerns do not meet v2 boundaries                  |
| Prototype Supabase and auth modules                  | Rejected for this milestone                 | Authentication, environment isolation and database discipline belong to later milestones |
| dnd-kit and icon package                             | Removed from v2 dependencies                | No Milestone 2 behaviour needs them                                                      |
| Tracked `dist` output                                | Removed from version control                | Builds must be reproducible from source and the lockfile                                 |

## 4. Architecture

The application is composed in `src/app`. Route pages live in `src/routes`; generic accessible primitives live in `src/components/ui`; typed public configuration lives in `src/config`; structured logging lives in `src/infrastructure`; and cross-cutting helpers live in `src/shared`. `src/domain` and `src/application` contain boundary guidance only, with no speculative business abstractions.

The shell exposes `/`, `/health` and an explicit not-found route. The root layout owns landmarks, navigation, environment labelling and responsive containment. React Suspense supplies the loading pattern. Route and application error boundaries provide calm recovery states and correlation references.

The roadmap schedules the expanded design system and routing milestone later. The user explicitly required a minimal routing, loading, error and UI baseline in this milestone, so only the primitives necessary to prove the shell were added. Product navigation, dialogs, sheets and authenticated routes remain deferred.

## 5. Dependencies

Node.js 24.14.0 and npm 11.9.0 are pinned. All package versions are exact and the npm lockfile is committed.

Runtime packages are React 19.2.7, React DOM 19.2.7 and React Router DOM 7.18.1. Development tooling adds Vite 8.1.4, TypeScript 6.0.3, ESLint 9.39.5, Prettier 3.9.5, Vitest 4.1.10, Testing Library, Playwright 1.61.1 and axe Playwright integration.

ESLint 10 was evaluated during installation but rejected because `eslint-plugin-jsx-a11y` does not declare compatibility. ESLint and `@eslint/js` are pinned to 9.39.5, resolving the peer dependency tree without overrides. The clean install reports zero audit vulnerabilities.

## 6. Quality baseline

- ESLint flat configuration checks TypeScript, React Hooks, fast refresh, JSX accessibility, unused values and console usage.
- Prettier checks maintained v2 source, tests, workflow, configuration and milestone documentation without rewriting authoritative specifications.
- TypeScript project references check browser source, Node-based configuration and tests in strict mode.
- Vitest and Testing Library cover environment validation, log redaction, accessible field errors and routed shell behaviour.
- Playwright covers the rendered home, health, deep-link not-found recovery and automated axe scan on Chromium and a Pixel 7 viewport.
- `npm run validate:static` provides the local deterministic gate; `npm run validate` adds browser smoke tests.

## 7. CI

`.github/workflows/v2-quality.yml` runs on pull requests to `v2` and pushes to `v2`. A single job performs checkout, pinned Node setup, cached `npm ci`, formatting, lint, type-checking, unit and integration tests, production build, matching Chromium installation and end-to-end smoke tests. Permissions are read-only, no repository secrets are consumed, concurrent superseded runs are cancelled, and Playwright diagnostics are retained for seven days only on failure.

## 8. Preview environment

`vercel.json` declares the Vite framework, `npm ci`, production build, `dist` output, safe single-page routing, baseline security headers and search-engine exclusion. `/health.json` supports a static platform probe and `/health` verifies the rendered shell.

Vercel Git integration should create previews for milestone branches and pull requests. A repository owner must keep `main` as the production branch, enable preview deployments and set `VITE_APP_ENV=preview` for Preview only. No deployment credentials or production environment values are committed.

## 9. Validation results

| Check                                | Result                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `npm ci`                             | Passed from the committed lockfile, 386 packages                                                |
| `npm run format:check`               | Passed                                                                                          |
| `npm run lint`                       | Passed with zero warnings                                                                       |
| `npm run typecheck`                  | Passed                                                                                          |
| `npm run test`                       | Passed, 4 files and 8 tests                                                                     |
| `npm run build`                      | Passed, 41 modules transformed                                                                  |
| Production preview `/health.json`    | Passed                                                                                          |
| Production preview unknown deep link | Passed                                                                                          |
| `npm audit --audit-level=critical`   | Passed, zero vulnerabilities                                                                    |
| Secret and sensitive-file scan       | Passed, no matching committed material                                                          |
| `npm run test:e2e:install`           | Environment-blocked: the workspace returned an invalid zero-byte Chromium archive after retries |
| `npm run test:e2e`                   | Not runnable locally without the matching browser; remains mandatory in CI                      |

## 10. Known limitations

- Vercel project settings and the resulting preview URL require repository-owner access and must be verified after the branch is published.
- The local execution environment could install npm packages but could not retrieve the Playwright Chromium archive. The CI workflow uses Playwright's supported GitHub runner installation path.
- The structured console logger is a no-cost baseline. Sentry is not connected because this milestone has no measured need for a paid hosted integration.
- Only public, non-sensitive build metadata is validated. Supabase CLI setup, server-only variables and environment isolation remain in the roadmap's next infrastructure milestone.
- The UI primitives are intentionally incomplete. Product-specific navigation and advanced primitives belong to the approved design-system milestone.

## 11. Readiness for Milestone 3

The source foundation is ready for the approved Milestone 3 environment and migration discipline work once this pull request passes GitHub CI and its Vercel preview is verified. Milestone 3 can add local Supabase structure, isolated environments, immutable migrations, seed conventions and generated database types without reusing prototype data access patterns.
