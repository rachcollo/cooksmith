# Milestone 1 handover: Product and engineering guardrails

- **Date:** 2026-07-13
- **Branch:** `m01-product-engineering-guardrails`
- **Target:** `v2`
- **Commit:** Branch head at review time
- **Pull request:** Milestone branch pull request targeting `v2`
- **Status:** Ready for review

## Objective

Give Cooksmith v2 a clear product and engineering decision framework before application implementation begins.

## Product impact

- **Product Principles supported:** All ten, with particular support for calm UX, fewer taps, reduced mental load and quiet, safe AI.
- **User effort removed:** Future contributors can find authority, review criteria, safety rules and handover requirements without reconstructing decisions.
- **Primary next action improved:** A contributor can identify the current milestone, its governing documents and required checks before making changes.
- **Product behaviour changed:** No. Application code, runtime configuration and database schema are unchanged.

## Repository assessment

- `main` was the only remote branch at assessment commit `0ae700388520914eaa6b5c12710c3f431c85c385`. A dedicated `v2` branch was created from that stable commit.
- The repository contained the MVP application, one initial Supabase migration, a short `AGENTS.md`, and no checked-in product or architecture document set.
- No pull-request template, ADR structure, milestone handover process or governance checklists existed.
- `package.json` defined `dev`, `build`, `lint` and `preview`. It did not define `typecheck` or `test`.
- Immediate governance risks were unclear document authority, no architecture decision trail, no PR controls, a broken lint baseline, missing test and typecheck commands, dependencies declared as `latest`, no CI quality gate and no established v2 integration branch.
- The approved Product Specification v2.0 was added after the initial Milestone 1 commit and is recorded as authority priority 2.

## Changes made

- Added the available authoritative and reference documents to a structured documentation set.
- Defined document precedence and the location of future ADRs and milestone handovers.
- Expanded contributor guidance for product direction, language, mobile-first delivery, accessibility, security, privacy, migrations, testing, milestone scope, costs and AI safety.
- Added an ADR process, template and seven records for already approved decisions.
- Added pull-request and milestone handover templates.
- Added cost approval and AI implementation checklists.

## Files and components affected

| File or component                  | Purpose                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `AGENTS.md`                        | Actionable contributor and Codex rules                               |
| `docs/README.md`                   | Authoritative document index and precedence                          |
| `docs/product/`                    | Available authoritative product documents                            |
| `docs/engineering/`                | Technical architecture, roadmap, templates, handovers and checklists |
| `docs/reference/`                  | Non-authoritative current-state evidence                             |
| `docs/architecture/decisions/`     | ADR process, template and approved decisions 001 to 007              |
| `.github/pull_request_template.md` | Required milestone PR evidence and confirmations                     |

## Migrations

None. The existing migration and all database environments are unchanged.

## Setup instructions

None. This milestone adds Markdown governance only and introduces no dependency, provider, environment variable or runtime configuration.

## Tests run

| Command or check        | Result                    | Notes                                                                                                                                                                                                        |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm install`           | Blocked by environment    | npm repeatedly attempted to use the unwritable `/root/.npm` cache. A retry with a writable temporary cache still reached the same runtime-level path. No dependency or lockfile change was retained.         |
| `npm run lint`          | Failed, existing baseline | ESLint 10 could not find `eslint.config.js`, `eslint.config.mjs` or `eslint.config.cjs`. The current-state assessment records the same issue.                                                                |
| `npm run typecheck`     | Not available             | `package.json` has no `typecheck` script.                                                                                                                                                                    |
| `npm run test`          | Not available             | `package.json` has no `test` script and no test suite was discovered.                                                                                                                                        |
| `npm run build`         | Passed                    | TypeScript project build and Vite production build completed. An existing `node_modules` installation with byte-identical `package.json` and `package-lock.json` was used after the runtime blocked install. |
| Secret pattern scan     | Passed                    | No common private-key, GitHub token, AWS key, OpenAI key or service-role assignment pattern was found in repository content.                                                                                 |
| Sensitive file review   | Passed                    | No credential or sensitive environment file was added by this milestone.                                                                                                                                     |
| Behavioural diff review | Passed                    | No application, runtime or database file changed.                                                                                                                                                            |

## Preview or verification instructions

Review `docs/README.md`, follow its links, then compare `AGENTS.md`, the PR template, ADR template, cost checklist, AI checklist and this handover against the Milestone 1 requirements. No application preview is required because product behaviour did not change.

## Accessibility, security, privacy and cost

- **Accessibility:** Contributor expectations now target WCAG 2.2 AA, semantic controls, keyboard and assistive-technology support, focus management, reduced motion and accessible alternatives to drag-and-drop. No interface changed.
- **Security and privacy:** Credential rules, synthetic-data expectations, server-side secret boundaries, logging restrictions and migration approvals are explicit. No provider or production data was accessed or changed.
- **Cost impact:** A$0 per month and A$0 per year. No provider, hosted service, tier or recurring cost was introduced.
- **Credential check:** Repository content and intended staged files were checked for common secret patterns. No credentials were found or committed.

## Known limitations

- The existing lint command is not operational.
- Typecheck and test commands do not exist.
- There is no CI workflow or automated accessibility check.
- npm installation could not be completed in this execution environment because of its cache path behaviour.

## Deferred work

Milestone 2 owns the v2 application shell and quality baseline, including ESLint flat configuration, explicit dependency versions, typecheck and test scripts, tests, CI checks and preview behaviour. No part of that work was started here.

## Rollback approach

Close the milestone pull request without merging or revert its documentation commit. No application deployment, database rollback, provider cancellation or data restoration is required.

## Recommended next milestone

Milestone 2: v2 application shell and quality baseline. Do not begin it until Milestone 1 is reviewed and explicitly accepted.
