# E01 handover: CI, preview validation and release hardening

## Current state

E01 is implemented on `e01-ci-preview-release-hardening`. The repository now has a canonical environment preflight, documented command audit, separated CI jobs, preview validation guidance, staging migration release rehearsal guidance and a concise pull-request readiness template.

## Baseline and branch

- Local baseline commit: `7c81abc`
- Branch: `e01-ci-preview-release-hardening`
- Remote limitation: this container has no configured Git remote, so the branch must be compared with the latest accepted `main` before publishing.

## Required follow-up before merge

1. Rebase or recreate the branch from the latest remote `main` in a connected environment.
2. Run the pinned Node.js 24.14.0 and npm 11.9.0 toolchain.
3. Run `npm run preflight:all` with safe non-secret environment names populated.
4. Run the full local/CI quality suite, including Docker-backed `npm run db:validate` and Playwright after `npm run test:e2e:install`.
5. Publish a pull request to `main`, record the hosted preview URL, and complete the preview smoke checklist with synthetic credentials only.

## Migration and release notes

No migration is added by E01. The new staging rehearsal documentation distinguishes local validation from remote deployment and requires dry-run review before any hosted migration push. Production remains protected by the existing production database release workflow.

## Security and cost

No secrets or credentials were added. The preflight reports variable names only. No paid services or provider tiers were added; expected ongoing cost is A$0.

## Next milestone readiness

Future workstreams can use the new preflight and PR evidence template after this branch is updated from `main`, reviewed and merged. Do not treat the local handover as proof of remote CI or hosted preview validation.
