# Engineering standards foundation handover

- **Date:** 2026-07-14
- **Branch:** `docs/codex-engineering-standards`
- **Target:** `v2`
- **Commit:** Pending
- **Pull request:** Pending
- **Status:** Validation pending

## Objective

Create one durable engineering-governance source so later Codex tasks can use concise milestone prompts without repeating workflow, security, database, testing and release rules.

## Product impact

- **Product Principles supported:** Reduce mental load, keep the app calm and protect household trust.
- **User effort removed:** The user no longer needs to repeat GitHub-first and engineering-safety instructions in every build prompt.
- **Primary next action improved:** Future prompts can reference the permanent build rules and focus on milestone scope.
- **Product behaviour changed:** No.

## Changes made

Added six permanent standards documents, connected them through `AGENTS.md`, the README and documentation index, and aligned the existing ADR index/template without changing an accepted decision.

## Files and components affected

Documentation and repository formatting configuration only. No `src`, `supabase`, environment or deployment file changed.

## Migrations and setup

None. No setup, provider or environment change is required.

## Tests and verification

See the [completion report](../reports/engineering-standards-foundation.md) for every command and result.

## Accessibility, security, privacy and cost

- **Accessibility:** Standards retain WCAG 2.2 AA, keyboard, focus, reduced-motion and responsive expectations. No interface changed.
- **Security and privacy:** Rules codify secret protection, synthetic fixtures, RLS, secure functions and Production separation.
- **Cost impact:** A$0 monthly and A$0 annually.
- **Credential check:** Passed. No credential, private-key or service-role value was found.

## Known limitations and deferred work

The standards must evolve through reviewed documentation changes when tooling or architecture changes. Milestone 5C tenant-isolation implementation remains entirely deferred.

## Rollback approach

Revert this documentation-only commit. No application, database, hosted service or production rollback is required.

## Recommended next milestone

Milestone 5C only after this pull request is accepted and merged into `v2`.
