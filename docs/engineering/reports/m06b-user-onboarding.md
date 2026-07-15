# Milestone 6B completion report

## 1. Status

Implemented, database validation pending

## 2. Baseline commit

Started from `main` at `5f0c6da`, containing merged PR #13, the completed Milestone 5 security foundation, engineering standards, and working Milestone 6A authentication. The working tree was clean.

## 3. Onboarding summary

Added an authenticated five-step profile and household onboarding flow with durable progress, refresh-safe resume, completed-user bypass, accessible validation and recovery states, and entry into the existing dashboard. Authentication, email delivery, and PKCE callback behavior were preserved.

## 4. Profile and household creation

Profiles persist display name, IANA timezone, locale, current onboarding step, and completion time. Household creation uses one authenticated bootstrap RPC and returns its household identifier. It does not accept a user identifier from the client.

## 5. Bootstrap implementation

The private security-definer implementation uses an empty `search_path`, fully qualified objects, `auth.uid()`, an auth-user lock, and authenticated-only execution. It atomically creates the household, active owner membership, and default settings. A security-invoker public wrapper exposes only the approved operation. Repeated calls return the existing active household without duplicate bootstrap.

## 6. Preferences

The flow persists default servings, weeknight and weekend cooking limits, cooking confidence, grocery budget band, optional supermarket, weekly planning day, household dietary defaults, and allergies through existing RLS-protected tables.

## 7. Tests and validation

Vitest coverage verifies step validation, full persistence, owner bootstrap calls, dietary/allergy persistence, completion, route gating, and interrupted-flow resume. pgTAP covers RPC grants, secure `search_path`, missing-JWT denial, owner membership, settings creation, and idempotence. Full command results and the final CI result will be recorded at handover.

## 8. Known limitations

The local environment has no Docker-compatible runtime, and its Playwright browser executable is unavailable. Database, generated-type freshness, browser, and automated accessibility validation therefore remain delegated to GitHub Actions. The production migration is not applied by this branch and requires the approved release process after merge. Editing onboarding preferences after completion, invitations, and household switching are deferred.

## 9. Git handover

Branch `m06b-user-onboarding`. Commit and pull-request details are added after final validation and publication.

## 10. Readiness for Milestone 6C

Ready only after this PR passes the complete remote database and browser gates, is accepted, and its migration is released through the approved process. Milestone 6C has not begun.
