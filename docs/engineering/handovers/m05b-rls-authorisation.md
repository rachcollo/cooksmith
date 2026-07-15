# Milestone 5B handover: Authorisation helpers and row level security

## Objective

Protect every Cooksmith v2 private table with default-deny RLS and reusable, hardened household and application-role checks without beginning authentication, onboarding or the full Milestone 5C isolation suite.

## Scope and principles

This milestone protects household trust and reduces future authorisation duplication. It supports calm, low-effort product behaviour by establishing one deterministic permission boundary before feature workflows are added.

## Changes made

- Added three explicit-search-path authorisation helpers.
- Enabled RLS on all eight current `cooksmith` tables.
- Kept infrastructure and global application-role tables browser inaccessible.
- Added self-profile, active-member read and owner-managed write policies.
- Added least-privilege authenticated grants without exposing the schema through the Data API.
- Added pgTAP security smoke tests and the policy matrix.

## Files affected

- `supabase/migrations/20260714090000_add_authorisation_helpers_and_rls.sql`
- `supabase/tests/0003_authorisation_and_rls.test.sql`
- `docs/engineering/v2/authorisation-and-row-level-security.md`
- Milestone indexes, report and repository guidance

No application route, UI component, authentication flow or domain feature changed.

## Migration and rollback

The additive migration creates functions, grants, RLS enablement and policies. It does not alter table columns or data. Before shared deployment, reset the isolated local database to remove it. After shared deployment, preserve immutable migration history and use a reviewed forward-fix that revokes policies or privileges before removing helpers.

## Setup and validation

Use the existing local-only database workflow. The full results are recorded in the completion report. No hosted or production database was accessed.

## Accessibility and privacy

There is no interface change. RLS protects profiles, household preferences, dietary requirements and allergies from unrelated authenticated users. Fixtures and tests use only deterministic synthetic identities.

## Security

Helpers use `security definer` solely to avoid RLS recursion, fully qualify objects, use `auth.uid()`, set an empty `search_path` and restrict execution to `authenticated`. Global application roles do not confer household access. No browser path can write application roles.

## Cost and credentials

No dependency, provider, service, tier or recurring cost was added. No credential, secret, real household data or production configuration was introduced.

## Known limitations and deferred work

- Last-owner lifecycle protection remains a later household workflow concern.
- Trusted application-role administration and audit logging remain later work.
- The `cooksmith` schema remains unexposed through the Data API.
- Milestone 5C must add the full tenant-isolation and API-contract suite, including inactive membership and malformed session coverage.

## Recommended next milestone

Milestone 5C only after this pull request is accepted and its database gate passes. Do not begin it from an unmerged branch.
