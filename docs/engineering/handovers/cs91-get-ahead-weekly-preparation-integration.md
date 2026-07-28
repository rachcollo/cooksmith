# CS-91 handover: Get Ahead weekly preparation integration

- **Date:** 2026-07-28
- **Branch:** `feat/cs-91-get-ahead-weekly-preparation-integration`
- **Target:** `main`
- **Baseline:** `6ff4173`
- **Status:** In review

## Objective

Connect the saved CS-81 weekly preparation plan to Get Ahead through a trusted household-scoped boundary, preserve the deterministic checklist when that service is unavailable, and extend the CS-62 admin portal with audited AI controls and privacy-safe evaluation evidence.

## Product impact

- Households receive consolidated preparation tasks naturally inside the existing duration and checklist journey.
- Reopening the same plan cache identity preserves progress; a changed identity starts a safe fresh checklist instead of silently applying stale completion.
- Technical provider details remain out of the household experience.
- Administrators can inspect and confirm AI enablement, emergency-stop state, the safe model identifier and the latest 30-plan aggregate evidence.

## Changes made

- Added the authenticated `get-weekly-preparation-plan` Edge Function. It derives the user, active household, week meals, servings, immutable recipe versions and validated active enrichment server-side before invoking the CS-81 worker.
- Added a typed client repository and framework-independent adapter from validated weekly plan subtasks to Get Ahead opportunities.
- Preserved deterministic browser analysis as the recovery path for unavailable, invalid or unenriched plans.
- Bound saved checklist progress to the weekly preparation cache key.
- Added admin-only settings read/update policies, append-only audit evidence and privacy-safe evaluation aggregate storage.
- Extended the protected Production Edge Function workflow for both weekly preparation functions.

## Migrations and release order

Migration: `20260728113000_weekly_preparation_admin_controls.sql`.

This pull request does not deploy Production. After merge, release the exact accepted `main` SHA through the protected Production database workflow with dry-run and migration-history verification. Then deploy Edge Functions from the same accepted SHA through the protected Edge Function workflow. Released migrations remain immutable; corrections use a new forward migration.

## Preview verification

1. Deploy the migration and `generate-weekly-preparation-plan` plus `get-weekly-preparation-plan` to the isolated Preview Supabase project.
2. Open Get Ahead with two planned recipes that have active Recipe Intelligence and confirm consolidated work, recipe attribution and quantity.
3. Reopen Get Ahead and confirm the same cache identity resumes progress without another model call.
4. Change a relevant meal or recipe version and confirm a fresh checklist is offered.
5. Disable the orchestration function or use a recipe without enrichment and confirm the existing deterministic checklist remains usable with non-technical copy.
6. As an application admin, confirm enable/disable and emergency-stop changes require confirmation and create audit evidence.
7. As a normal household user, confirm the admin route, settings, audit and evaluation data are inaccessible.

Hosted Preview, hosted provider evaluation, keyboard/assistive-technology review and responsive browser verification remain required before acceptance.

## Security, privacy and cost

- Browser input is limited to week dates. Household scope, candidates and trusted recipe intelligence are derived server-side.
- Worker, provider and service-role credentials never enter browser code or responses.
- Admin authorisation reuses `has_application_role('admin')`; UI hiding is not an access boundary.
- Evaluation persistence contains aggregates and version identifiers, not recipe content, prompts or provider responses.
- No dependency or fixed recurring cost was added. Deterministic use is A$0/month and A$0/year. Model usage remains disabled by default and variable until the hosted 30-plan result and projected cost are accepted.

## Rollback

Disable AI or activate the emergency stop, preserve audit/evaluation evidence, revert the application and Edge Function wiring, and forward-fix any released schema issue. The deterministic Get Ahead path remains available throughout.
