# ADR 008: Isolate v2 database assets from the prototype schema

- **Status:** Accepted
- **Date:** 2026-07-14

## Context

The repository contains an MVP SQL file with prototype profiles, households, recipes, pantry and meal-plan tables. Cooksmith v2 needs a fresh migration history without deleting or accidentally applying the prototype schema.

## Decision

Use `supabase/migrations` as the active Cooksmith v2 migration path and the explicitly named `cooksmith` schema for v2-owned database objects. Preserve the unchanged MVP SQL file under `supabase/prototype-migrations`, outside the active CLI path.

Local and CI commands target only the unlinked local Supabase project. Hosted staging migration commands remain manual and explicit. Production is never linked or targeted by repository scripts.

## Options considered

- **Dedicated v2 schema and migration path:** Accepted. It makes ownership obvious and prevents accidental prototype coupling.
- **Apply the prototype migration before new v2 migrations:** Rejected. It would pull unsupported domain assumptions into the v2 foundation.
- **Delete the prototype migration:** Rejected. It would remove useful production history and evidence.
- **Create a second repository:** Rejected by ADR 001. Existing branch and deployment isolation are sufficient.

## Consequences

Future v2 migrations explicitly qualify objects in `cooksmith`. Milestone 5 must deliberately expose only the required v2 schema through Supabase and implement default-deny RLS. The prototype SQL remains reference material and is not exercised by v2 reset commands.

## Cost impact

A$0 monthly and A$0 annual. Local development uses Docker and hosted staging is expected to use one free Supabase project.

## Product Principles supported

Principles 1, 2 and 8 by making database changes repeatable, understandable and less likely to disturb working production behaviour.

## Rollback or reconsideration trigger

Reconsider the schema boundary only if Supabase platform constraints prevent secure Data API or migration operation. Reversal requires a new migration and ADR. Do not move applied objects by editing shared migration history.
