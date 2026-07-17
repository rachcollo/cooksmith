# Cooksmith documentation index

This index defines the source-of-truth order for Cooksmith v2. Contributors must resolve conflicts using the priority below, not the date or location of a document.

## Authority order

| Priority | Document                                                                                                                    | Role                                          | Repository status |
| -------: | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------- |
|        1 | [Product Principles](product/Cooksmith_Product_Principles.md)                                                               | Governing product and delivery lens           | Available         |
|        2 | [Product Specification](product/Cooksmith_Product_Specification.md)                                                         | Defines what Cooksmith is                     | Available         |
|        3 | [Functional Specification and User Story Catalogue](product/Cooksmith_Functional_Specification_and_User_Story_Catalogue.md) | Defines expected behaviour                    | Available         |
|        4 | [Technical Architecture Specification](engineering/Cooksmith_Technical_Architecture_Specification.md)                       | Defines the approved target architecture      | Available         |
|        5 | [Implementation Roadmap](engineering/Cooksmith_Implementation_Roadmap.md)                                                   | Defines milestone sequence and delivery scope | Available         |

## Engineering governance

- Contributor rules: [`AGENTS.md`](../AGENTS.md)
- Permanent Codex workflow: [Codex build rules](engineering/CODEX_BUILD_RULES.md)
- Development standards: [Development standards](engineering/DEVELOPMENT_STANDARDS.md)
- Database standards: [Database standards](engineering/DATABASE_STANDARDS.md)
- Testing standards: [Testing standards](engineering/TESTING_STANDARDS.md)
- Release and merge checks: [Release checklist](engineering/RELEASE_CHECKLIST.md)
- Architecture decision guidance: [Architecture decisions](engineering/ARCHITECTURE_DECISIONS.md)
- Architecture decisions: [ADR index](architecture/decisions/README.md)
- ADR template: [ADR template](architecture/decisions/000-template.md)
- Cost review: [Cost approval checklist](engineering/checklists/cost-approval.md)
- AI review: [AI implementation checklist](engineering/checklists/ai-implementation.md)
- Pull requests: [Pull request template](../.github/pull_request_template.md)
- Milestone handovers: [Handover index](engineering/handovers/README.md)
- Handover template: [Milestone handover template](engineering/templates/milestone-handover.md)
- v2 project conventions: [Project structure](engineering/v2/project-structure.md)
- v2 environment and preview: [Environment and preview setup](engineering/v2/environment-and-preview.md)
- v2 dependency policy: [Dependency management](engineering/v2/dependency-management.md)
- v2 database workflow: [Environment and migration discipline](engineering/v2/database-workflow.md)
- Production database releases: [Protected GitHub workflow and runbook](engineering/v2/production-database-releases.md)
- Supabase staging setup: [Staging project guide](engineering/v2/staging-supabase-setup.md)
- v2 design system and routing: [Design, routing and navigation](engineering/v2/design-system-and-routing.md)
- v2 core household schema: [Core household schema](engineering/v2/core-household-schema.md)
- v2 authorisation and RLS: [Authorisation and row level security](engineering/v2/authorisation-and-row-level-security.md)
- v2 onboarding: [User onboarding and household bootstrap](engineering/v2/onboarding.md)
- v2 household invitations: [Household invitations and member management](engineering/v2/household-invitations.md)
- v2 pantry foundation: [Pantry foundation](engineering/v2/pantry-foundation.md)
- Milestone 5 security evidence: [Database and RLS validation](engineering/v2/milestone-5-security-validation.md)
- Milestone 5C completion report: [Adversarial RLS and API contracts](engineering/reports/m05c-database-validation.md)
- Milestone 6B completion report: [User onboarding and household bootstrap](engineering/reports/m06b-user-onboarding.md)
- Milestone 7A completion report: [Pantry foundation](engineering/reports/m07a-pantry-foundation.md)
- Milestone 9A completion report: [Recipe Library Foundation](engineering/reports/m09a-recipe-library-foundation.md)
- Milestone 6C completion report: [Household invitations and member management](engineering/reports/m06c-household-invitations.md)
- Milestone 5B completion report: [Authorisation helpers and row level security](engineering/reports/m05b-rls-authorisation.md)
- Engineering standards foundation report: [Completion report](engineering/reports/engineering-standards-foundation.md)
- Milestone 5A completion report: [Core household schema](engineering/reports/m05a-core-household-schema.md)
- Milestone 4 completion report: [Design system, routing and accessible navigation](engineering/reports/m04-design-routing-navigation.md)
- Milestone 3 completion report: [Environment and migration discipline](engineering/reports/m03-environments-migrations.md)
- Milestone 2 completion report: [v2 application shell and quality baseline](engineering/reports/m02-v2-application-shell.md)

## Reference material

The [Current State Assessment](reference/Cooksmith_Current_State_Assessment.md) describes the prototype baseline. It is evidence and context, not an authority over the documents above.

## Recording future decisions

Record durable architecture decisions as sequential ADRs. Record delivery results as milestone handovers. Product changes require an update to the appropriate authoritative product document and explicit approval, not an ADR alone.
