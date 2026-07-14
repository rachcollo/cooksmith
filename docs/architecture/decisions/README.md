# Architecture Decision Records

ADRs record durable technical and delivery decisions that affect Cooksmith v2. They do not replace the Product Principles or approve new product scope.

## Process

1. Copy `000-template.md` to the next sequential number using a short kebab-case title.
2. Set the status to `Proposed` while the decision is under review.
3. Record meaningful options, consequences, cost and supported Product Principles.
4. Change the status to `Accepted` only after approval.
5. Do not rewrite an accepted decision. Add a new ADR that supersedes it and cross-link both records.
6. Review an ADR when its stated reconsideration trigger occurs.

## Status values

`Proposed`, `Accepted`, `Superseded` or `Rejected`.

See the permanent [architecture decision standards](../../engineering/ARCHITECTURE_DECISIONS.md) for required sections and guidance on when a new ADR is necessary.

## Decision index

| ADR | Status | Decision |
|---|---|---|
| [001](001-existing-repository.md) | Accepted | Build Cooksmith v2 in the existing repository |
| [002](002-v2-integration-branch.md) | Accepted | Use a dedicated v2 integration branch |
| [003](003-greenfield-selective-reuse.md) | Accepted | Use greenfield architecture with selective reuse |
| [004](004-retain-core-platform.md) | Accepted | Retain React, TypeScript, Vite, Vercel and Supabase |
| [005](005-deterministic-logic-separate-from-ai.md) | Accepted | Keep deterministic logic separate from AI |
| [006](006-fortnight-planning.md) | Accepted | Use fortnight planning rather than week-only planning |
| [007](007-shopping-list-copy-export.md) | Accepted | Use shopping-list copy export before retailer API integration |
| [008](008-isolate-v2-database-assets.md) | Accepted | Isolate v2 database assets from the prototype schema |
