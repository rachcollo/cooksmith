# ADR 011: Database-backed application administrator controls

- **Status:** Accepted
- **Date:** 2026-07-28

## Context

CS-62 needs global operational controls that ordinary household users cannot change. Email
addresses, hidden navigation, frontend state and user-editable metadata are not trustworthy
authorisation sources.

## Decision

Cooksmith will use the existing `cooksmith.app_user_roles` table and
`cooksmith.has_application_role()` helper as the authoritative application-role boundary.
Feature flags are global database records with secure typed client defaults. Signed-in users may
read effective flags, while only users with the `admin` application role may update them. A
database trigger writes append-only, attributable audit evidence for every state change.

Application administrator status does not grant household access and remains separate from
household owner/member roles.

## Consequences

- Admin route checks and database write policies use the same trusted role source.
- A database release is required before the portal can operate in a hosted environment.
- Adding an administrator remains an out-of-band privileged operation.
- No paid flag provider, browser secret or recurring cost is introduced.
