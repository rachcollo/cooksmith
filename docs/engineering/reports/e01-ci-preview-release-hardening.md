# E01 completion report: CI, preview validation and release hardening

## Status

Implemented, with environment-limited validation pending in this container.

## Baseline

- Branch: `e01-ci-preview-release-hardening`
- Local baseline commit: `7c81abc` (`Merge pull request #25 from rachcollo/codex/implement-pantry-item-editing-and-improvements`)
- Remote status: no Git remote is configured in this container, so latest remote `main`, publishing and GitHub Actions status could not be verified locally.

## Scope summary

E01 adds a canonical environment preflight, aligns command documentation, separates CI quality gates, documents hosted-preview and staging-migration validation, and standardises pull-request evidence. No application feature or product behaviour is intentionally changed.

## Changed files

- Tooling scripts: `scripts/preflight.mjs`, `scripts/audit-documentation-commands.mjs`
- Tooling tests: `tests/unit/preflight.test.ts`, `tests/mjs-modules.d.ts`
- Package scripts: `package.json`
- CI: `.github/workflows/v2-quality.yml`
- Pull request template: `.github/pull_request_template.md`
- Documentation: `README.md`, `docs/engineering/CODEX_BUILD_RULES.md`, `docs/engineering/TESTING_STANDARDS.md`, `docs/engineering/RELEASE_CHECKLIST.md`, `docs/engineering/v2/environment-and-preview.md`, `docs/engineering/v2/database-workflow.md`

## Validation evidence

Passed locally:

- `npm ci` completed, with expected engine warnings because this container runs Node.js 24.15.0 and npm 11.4.2 instead of the pinned Node.js 24.14.0 and npm 11.9.0.
- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test` (20 files, 71 tests)
- `npm run build`, with the existing non-blocking Vite chunk-size advisory.
- `npm run db:config:check`
- `npm run docs:commands:check`
- `ruby -e "require 'yaml'; Dir['.github/workflows/*.yml'].each { |f| YAML.load_file(f); puts \"#{f}: ok\" }"`

Environment-limited locally:

- `npm run preflight:all` correctly failed for wrong Node/npm versions, missing environment variable names, missing Git remote, missing Docker and missing Playwright Chromium while confirming the feature branch and pinned Supabase CLI.
- `npm run db:validate` passed `db:config:check` then stopped at `db:prerequisites:runtime` because the container has wrong Node/npm versions and no Docker daemon.
- `npm run test:e2e` could not launch Chromium because the Playwright browser executable is not installed in this container.

## Hosted preview, GitHub Actions and manual validation

A hosted preview was not available from this container because there is no configured Git remote or publishable GitHub pull request. The new checklist documents the exact hosted-preview evidence required on the package pull request.

GitHub Actions could not be observed locally for the same reason. Workflow YAML parsed successfully, and the workflow now separates preflight, database, format/docs, lint, typecheck, Vitest, build and Playwright jobs. The preflight accepts GitHub Actions PR refs when checkout is detached and installs Chromium before the CI `preflight:all` browser availability check.

## Security, privacy, production and cost

No secrets, credentials, real household data, production database access or provider-tier changes were introduced. Environment checks print variable names only, never values. CI remains read-only against local services and does not push hosted migrations. Cost impact is A$0 monthly and A$0 annually.

## Handover

See `docs/engineering/handovers/e01-ci-preview-release-hardening.md`.
