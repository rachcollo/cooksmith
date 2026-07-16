# Production database release workflow completion report

## Status

Implemented, production configuration pending

## Baseline

Started from `main` at `e6dd325`, the merge commit for PR #15. Milestone 6C and
`20260715143724_add_household_invitations.sql` are present. The working tree was
clean.

## Summary

Added a manually approved, main-only GitHub Actions workflow for hosted
Supabase migrations and an operational runbook. The workflow validates the
exact release commit, uses a protected environment, performs a dry-run, applies
pending migrations in order, and verifies hosted migration history afterward.
It cannot reset or seed Production.

## Production protection

The workflow requires the `production-database` environment and three
environment secrets. Normal CI remains isolated. No credential, project
reference, production data, or hosted database access was used while creating
the workflow. Released migrations remain immutable; recovery uses a reviewed
forward migration or an approved Supabase recovery plan.

## Validation

Repository formatting, lint, strict TypeScript, tests, build, migration
configuration, Markdown links, whitespace, and secret scans are required before
handover. The hosted dry-run and deployment remain unavailable until the
workflow is merged and the protected environment is configured.

## Cost

A$0 additional monthly and annual cost. The workflow uses existing GitHub
Actions, Supabase, and repository dependencies.

## Handover

- Branch: `ops/production-database-release`
- Target: `main`
- Production release: not run by this pull request
- Next action: review and merge, configure the protected environment, then run
  the workflow for the approved `main` merge commit.
