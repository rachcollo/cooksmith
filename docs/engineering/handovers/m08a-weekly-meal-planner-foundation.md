# Milestone 8A handover — Weekly Meal Planner Foundation

## Summary

Milestone 8A introduces the first household weekly meal planner. Household members can view a Monday-to-Sunday week, navigate weeks, and add, edit, move or remove free-text planned meals for breakfast, lunch and dinner.

## Changed areas

- Database: `cooksmith.planned_meals`, `cooksmith.meal_type`, audit trigger and RLS policies.
- Domain/application: planned-meal types, validation, week-date helpers and repository contract.
- Infrastructure: Supabase planned-meal repository scoped to the active household and displayed week.
- UI: `/plan` Meal Planner page with week navigation, responsive cards, today badge and CRUD dialogs.
- Tests: unit validation/date helper tests, route integration tests and pgTAP contract/RLS tests.

## Validation run

- `npm ci` — passed with managed-runner warnings.
- `npm run format` — passed.
- `npm run format:check` — passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed.
- `npm run build` — passed with Vite chunk-size warning.
- `npm run db:config:check` — passed.
- `npm run db:validate` — blocked by local runtime prerequisites: Node.js/npm exact version mismatch and no Docker-compatible runtime.

## Preview smoke test still required

When a hosted preview is available, test sign-in, Meal Planner week rendering, add/edit/move/cancel/remove flows, previous/current/next week navigation, Pantry navigation and household navigation on desktop and mobile viewport widths.

## Release notes

This PR contains a Supabase migration. Production deployment must wait for merge to `main` and use the protected Production database release workflow with dry-run and migration-history verification. Released migrations must remain immutable; fixes require forward migrations.
