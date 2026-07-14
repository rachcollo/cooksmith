# Architecture decisions

Architecture Decision Records (ADRs) capture durable technical or delivery choices, their trade-offs and their approval status. They preserve reasoning without replacing the Product Principles, architecture specification, roadmap or explicit product approval.

## Location and naming

ADRs live in [`docs/architecture/decisions/`](../architecture/decisions/). Name a new record:

```text
NNN-short-kebab-case-title.md
```

Use the next available three-digit number and start from the existing [ADR template](../architecture/decisions/000-template.md).

## Status values

- `Proposed`: under review and not yet authoritative.
- `Accepted`: approved and currently authoritative.
- `Superseded`: replaced by a newer linked ADR.
- `Rejected`: considered and not approved.

Do not rewrite an accepted ADR to change its decision. Add a new proposed ADR, link both records and mark the old record superseded only after the replacement is accepted.

## Required sections

Every ADR must contain:

- context;
- decision;
- alternatives;
- consequences;
- security impact;
- cost impact, including monthly and annual estimates;
- migration impact;
- Product Principles supported;
- rollback or reconsideration trigger.

## Existing ADRs

| ADR                                                                          | Status   | Decision                                            |
| ---------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| [001](../architecture/decisions/001-existing-repository.md)                  | Accepted | Build v2 in the existing repository                 |
| [002](../architecture/decisions/002-v2-integration-branch.md)                | Accepted | Use a dedicated v2 integration branch               |
| [003](../architecture/decisions/003-greenfield-selective-reuse.md)           | Accepted | Use greenfield architecture with selective reuse    |
| [004](../architecture/decisions/004-retain-core-platform.md)                 | Accepted | Retain React, TypeScript, Vite, Vercel and Supabase |
| [005](../architecture/decisions/005-deterministic-logic-separate-from-ai.md) | Accepted | Keep deterministic logic separate from AI           |
| [006](../architecture/decisions/006-fortnight-planning.md)                   | Accepted | Use fortnight planning                              |
| [007](../architecture/decisions/007-shopping-list-copy-export.md)            | Accepted | Use copy export before retailer API integration     |
| [008](../architecture/decisions/008-isolate-v2-database-assets.md)           | Accepted | Isolate v2 database assets from the prototype       |

The [ADR directory index](../architecture/decisions/README.md) remains the concise status register.

## When Codex must create an ADR

Create a proposed ADR when an approved task requires a durable choice that materially changes one or more of:

- system boundaries or dependency direction;
- persistence, tenancy, authorisation or security architecture;
- a core provider, framework or deployment model;
- public API or cross-module contracts;
- data migration or compatibility strategy;
- material recurring cost or operational responsibility;
- an accepted ADR.

Do not create an ADR for routine implementation, reversible local detail, dependency patch updates or unapproved product scope. If the decision exceeds the task's authority, stop at a proposed ADR and request approval before implementation.
