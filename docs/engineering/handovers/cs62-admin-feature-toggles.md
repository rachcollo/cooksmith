# CS-62 handover: Admin portal and feature toggles

- **Date:** 2026-07-28
- **Branch:** `feat/cs-62-admin-feature-toggles`
- **Target:** `main`
- **Baseline:** `6b9eb082abcb9eaff8029d07e89cb16c643474c1`
- **Commit:** Pending
- **Pull request:** Pending
- **Status:** Ready for review after CI

## Objective

Provide a protected administration surface for typed feature toggles, beginning with the
default-off post-Apply planner confirmation.

## Changes made

- Reused the trusted application-role model and added an `/admin` route guard.
- Added typed flag persistence, secure defaults, administrator-only updates and audit history.
- Added a responsive Feature toggles page and planner confirmation wiring.
- Added application, route, database, RLS and generated-contract coverage.

## Migration

`20260728093000_admin_feature_toggles.sql` is additive. This PR does not deploy Production. After
merge, release the exact approved `main` SHA through the protected Production database workflow.
The migration is immutable after release; corrections use a forward migration.

## Verification

- Non-admin navigation to `/admin` returns to Home.
- Admin navigation to `/admin` displays the Planner confirmation screen toggle.
- Off: Apply plan completes and closes immediately.
- On: Apply plan shows `Your week is planned`; Done closes it.
- An Apply failure remains in the review dialog.

## Accessibility, security, privacy and cost

- Semantic checkbox, visible state text and 44px control target; responsive layout.
- RLS enforces writes independently of the route guard. Audit rows cannot be forged by browser
  users. Application admin status never implies household access.
- No new provider or dependency. Cost impact is A$0/month and A$0/year.
- No Edge Function changes.

## Rollback

Disable the flag to preserve the current user flow. Revert application wiring if needed. Once the
migration is released, retain it and use a forward fix for schema changes.

## Next milestone

After merge, database release and verification, CS-91 can build on this administrator foundation.
