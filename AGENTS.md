# Cooksmith contributor instructions

These instructions apply to Codex and every contributor working in this repository.

## Mandatory engineering standards

Before implementing any task, read and follow:

`docs/engineering/CODEX_BUILD_RULES.md`

Also read:

- [`DEVELOPMENT_STANDARDS.md`](docs/engineering/DEVELOPMENT_STANDARDS.md) for all implementation work;
- [`DATABASE_STANDARDS.md`](docs/engineering/DATABASE_STANDARDS.md) for database, Supabase, Auth, RLS or generated-type work;
- [`TESTING_STANDARDS.md`](docs/engineering/TESTING_STANDARDS.md) for required evidence;
- [`RELEASE_CHECKLIST.md`](docs/engineering/RELEASE_CHECKLIST.md) before review or release;
- [`ARCHITECTURE_DECISIONS.md`](docs/engineering/ARCHITECTURE_DECISIONS.md) when a durable technical decision is required.

The [documentation index](docs/README.md) defines the authoritative product and architecture hierarchy. Resolve conflicts through that hierarchy and stop on any material unresolved conflict.

The [AI engineering operating system](docs/operations/AI_ENGINEERING_OPERATING_SYSTEM.md) describes how Jira, this repository, CI, Vercel and Supabase releases coordinate, including the automated PR governance and Jira sync checks that run on every pull request. Every pull request title and branch must reference a Jira key (`CS-###`) and a matching engineering package, or the **PR governance** check fails.

## Product direction

Cooksmith quietly removes the invisible work of feeding a household. Apply the Product Principles, keep the experience calm and practical, use Australian/UK English, design mobile first and target WCAG 2.2 AA. Protect household safety and trust before convenience.

## Repository workflow

- During the temporary MVP workflow, create one scoped feature branch from the latest accepted `main` commit and target its pull request to `main`.
- Never work directly on `main`. The retained `v2` branch is historical and is not the active integration target.
- Keep the user out of Terminal work while a safe local or connected GitHub route exists.
- Do not begin later milestones, add unapproved scope, force-push or rewrite accepted history.
- Never commit secrets, credentials, real household data or sensitive environment files.
- Treat merges to `main` as deployments to the current private MVP environment. Do not access a production database, real customer data, custom domains or public-launch configuration without separate approval.
- Run every applicable repository check, record honest limitations and complete the handover template.
- Obtain explicit approval before adding paid services, provider tiers or material recurring cost.

Prototype code is reference material only. Reuse it only when it meets the v2 architecture, type, accessibility, security, test and product-experience standards.
