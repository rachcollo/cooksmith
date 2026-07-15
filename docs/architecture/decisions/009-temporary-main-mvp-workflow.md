# ADR 009: Use main as the temporary MVP integration branch

- **Status:** Accepted
- **Date:** 2026-07-15
- **Supersedes:** [ADR 002](002-v2-integration-branch.md)

## Context

Cooksmith is not public. Maintaining separate `v2` integration and `main` production branches adds review and deployment overhead while a single private MVP is being built. Milestones 1 through 6A have been accepted on `v2`, and `main` is an ancestor of that branch.

## Decision

Merge the accepted `v2` history into `main`. While this ADR is active, create each feature or milestone branch from `main`, target its pull request to `main`, and let the existing Vercel Git integration deploy accepted merges. The primary deployment URL is the canonical application URL.

This is a temporary delivery simplification, not approval for public launch or production data. Before public beta, replace this decision with an approved `feature branch → staging → production` workflow.

## Alternatives

- Keep `v2` as the integration branch: safer separation, but unnecessary operational overhead at the current private-MVP stage.
- Work directly on `main`: rejected because it removes pull-request review and CI gates.
- Create or rename Vercel projects: rejected because the existing project can deploy `main` without infrastructure churn.

## Consequences

- `main` becomes the repository source of truth and Vercel production branch.
- Feature previews remain available, but `v2` is no longer the active target.
- Every merge to `main` is deployment-affecting and must pass CI and review.
- Historical milestone reports remain unchanged evidence of the workflow used at the time.

## Security impact

No credential, RLS policy, database migration or domain changes are introduced. Environment values remain separately scoped. A merge to `main` does not authorise real customer data, public launch or production database operations.

## Cost impact

A$0 monthly and A$0 annually. The decision uses the existing GitHub, Vercel and Supabase arrangements.

## Migration impact

Git history is fast-forward compatible because the former `main` head is an ancestor of accepted `v2`. No database migration is added or changed.

## Product Principles supported

- Save people time.
- Reduce mental load.
- Keep the MVP delivery path calm and understandable.

## Reconsideration trigger

Supersede this ADR before public beta, real customer data, production database provisioning, or when independent staging verification becomes necessary.
