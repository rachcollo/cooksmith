# ADR 004: Retain the core platform

- **Status:** Accepted
- **Date:** 2026-07-13

## Context

The existing React, TypeScript, Vite, Vercel and Supabase stack is suitable for a mobile-first web application and has already supported MVP validation.

## Decision

Retain React, TypeScript and Vite for the application, Vercel for web hosting and previews, and Supabase for authentication, PostgreSQL, Row-Level Security and storage.

## Options considered

- **Retain the current core platform:** Accepted. It is capable, familiar and cost-efficient for friend testing.
- **Replace one or more core technologies now:** Rejected. No measured limitation justifies migration during foundation work.

## Consequences

Target structures can change without changing the core platform. Provider tiers and optional services still require cost approval when their trigger is met.

## Cost impact

No new cost from this decision. Friend testing should use free or already approved tiers until a measured limitation justifies change.

## Product Principles supported

Principles 1, 2, 4 and 8 by retaining a lean, known platform and avoiding unnecessary migration.

## Rollback or reconsideration trigger

Reconsider a platform component when a measured reliability, security, accessibility, performance or cost limitation cannot be resolved within the approved tier.
