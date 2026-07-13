# Cooksmith contributor instructions

These instructions apply to Codex and every contributor working in this repository. Read [the documentation index](docs/README.md) before starting work. If instructions conflict, follow the authority order in that index.

## Product direction

Cooksmith quietly removes the invisible work of feeding a household. The application must feel calm, practical and mobile-first. The primary friend-test measure is whether a household can organise two weeks of dinners in under 15 minutes.

Every implementation decision must support one or more Product Principles:

1. Save people time.
2. Reduce mental load.
3. Reduce food waste.
4. Reduce grocery spend.
5. AI works quietly in the background.
6. One tap is always better than five.
7. Every screen answers, "What should I do next?"
8. The app should feel calm, not busy.
9. Optimise for weekly habits, not daily engagement.
10. Do not make users think if Cooksmith can think for them.

Do not add complexity unless it removes more user effort than it creates. Protect household safety and trust before convenience.

## Language and experience

- Design and verify the phone experience first, then tablet and desktop layouts.
- Use Australian/UK English.
- Never use em dashes in product copy.
- Keep the voice warm, wry, plain-speaking, anti-hype and permission-giving. Humour must clarify or relieve, never shame.
- Give every screen one obvious primary action or a clear indication that nothing needs doing.
- Prefer sensible defaults, direct actions and progressive disclosure.

## Accessibility

- Target WCAG 2.2 AA for the friend-test release.
- Use semantic HTML, programmatic labels and logical heading structure.
- All actions must work with keyboard and assistive technology. Do not rely on colour, gesture, hover or placeholder text alone.
- Manage focus for dialogs, sheets, validation and route changes. Provide visible focus states and respect reduced-motion preferences.
- Provide accessible alternatives for drag-and-drop interactions.
- Test changed journeys at mobile viewport sizes, by keyboard, and with the automated accessibility tooling available for that milestone.

## Credentials, security and privacy

- Never commit secrets, tokens, credentials, real household data or sensitive environment files.
- Browser code may receive only values explicitly approved as public, such as the Supabase URL and publishable key.
- Keep service-role, AI, email and monitoring credentials in the approved server-side secret store.
- Do not place credentials or sensitive household details in logs, analytics, errors, screenshots, fixtures or AI prompts.
- Use synthetic data in development, previews, tests and documentation.
- Check staged changes for secrets before every commit. If exposure is suspected, stop, remove it from history where authorised, rotate the credential and record the incident.

## Database migrations

- Do not change the production database outside an approved milestone and deployment plan.
- Use timestamped, additive Supabase migrations and an expand-migrate-contract sequence where practical.
- Never edit a migration already applied to a shared environment.
- Every migration requires a forward path, rollback or mitigation notes, fresh-database verification and compatibility consideration for the previous application version.
- Destructive migrations require backup confirmation and separate explicit approval.
- Seeds and fixtures must contain synthetic data only.
- Regenerate and commit database types after an approved schema change.

## Testing and validation

- Add or update tests in the same milestone as changed behaviour.
- Run every applicable existing repository check before handover. The expected quality suite is install, lint, typecheck, tests, migration checks and production build once those commands exist.
- Do not invent missing quality commands or broaden a milestone to repair tooling unless that milestone includes the work. Record missing checks in the handover.
- Do not use live paid providers in normal automated tests. Use fakes or contract fixtures.
- A fixed defect should receive a regression test where practical.

## Milestone scope and workflow

- Work from the latest `v2` integration branch on one milestone branch. Never work directly on `main`.
- Target milestone pull requests to `v2`. Do not merge to `main` without an approved release checkpoint.
- Read the milestone dependencies and state the Product Principles supported and user effort removed before implementation.
- Keep work within the approved milestone. Do not redesign the product, add features, refactor unrelated areas or begin the next milestone.
- Treat the MVP as a prototype. Reuse code only when it meets the target architecture, types, accessibility, security, testing and user-experience requirements.
- Record durable architecture decisions in `docs/architecture/decisions/`. Do not use an ADR to silently expand scope.

## Costs and providers

- Complete the [cost approval checklist](docs/engineering/checklists/cost-approval.md) and obtain explicit approval before adding a paid provider, adding a hosted service, changing a provider tier or increasing baseline cost by more than A$20 per month.
- Prefer free or included tiers until a measured limitation justifies an upgrade.
- Never activate a provider or incur a recurring cost solely because it appears in the target architecture.

## AI safety and fallbacks

- Complete the [AI implementation checklist](docs/engineering/checklists/ai-implementation.md) for every AI operation.
- Use deterministic code for dates, arithmetic, permissions, quantities, dietary and allergy exclusions, shopping calculations and hard-constraint validation.
- AI returns structured, validated proposals. It is advisory and never the database, calculator or final safety authority.
- Minimise data sent to providers. Validate outputs server-side, require user confirmation for consequential changes, enforce cost and timeout limits, and provide a useful deterministic fallback.
- Provider failure must not block the core planning, shopping or preparation journey where a deterministic result can be produced.

## Required handover

Complete the [milestone handover template](docs/engineering/templates/milestone-handover.md). Include the objective, scope, principles supported, user effort removed, changes, affected files, migrations, setup, checks and results, preview instructions, accessibility, security, privacy, cost impact, known limitations, deferred work, rollback approach, credential check and recommended next milestone. Do not recommend starting the next milestone before the current one is accepted.
