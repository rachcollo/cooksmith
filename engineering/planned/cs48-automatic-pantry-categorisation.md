# Engineering Package — CS-48: Automatically Categorise Pantry Location and Food Category

## Metadata
- **Milestone:** M11C
- **Jira issue:** CS-48
- **Epic:** Pantry (CS-3)
- **Status:** Planned
- **Branch:** `feat/cs-48-automatic-pantry-categorisation`
- **Depends on:** CS-14
- **Blocks:** CS-55
- **Package path:** `engineering/planned/cs48-automatic-pantry-categorisation.md`

## Product Outcome
Users add food by name while Cooksmith deterministically assigns storage location and food category; users correct exceptions instead of completing a form.

## Current Baseline
- Pantry CRUD/RLS is delivered by CS-14.
- Current location/category fields and defaults require verification.
- CS-55 consumes this contract.
Verify against latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope
### Included
- Assign location and food category from name.
- Versioned deterministic rules with Other/Uncategorised fallback.
- Preserve explicit corrections and define rename/reclassification.
- Reusable authorised contract for approved consumers.
### Explicitly Out of Scope
- LLM/third-party classification
- Nutrition/allergen inference
- Consumption/expiry prediction
- Cross-household learning

## Functional Requirements and Acceptance Criteria
### FR-1 — Deterministic decision table
- [ ] Common foods receive practical location/category.
- [ ] Conflicting/low-confidence values use neutral fallback.
- [ ] Same input/rule version returns same output.

### FR-2 — Minimal input
- [ ] Name is the only normally required Pantry field.
- [ ] Assigned values are visible/editable after save.
- [ ] No mandatory review or confidence jargon.

### FR-3 — Preserve corrections
- [ ] Explicit corrections survive refresh/unrelated edit.
- [ ] Rename behaviour never silently overwrites correction.
- [ ] Household corrections never influence another household.

## UX and Accessibility
- Design mobile first at 320 CSS pixels with no overflow.
- Define loading, empty, busy, success, failure and recovery.
- Preserve 44px targets, keyboard operation, visible focus, contextual names, zoom/reflow and reduced motion.
- Do not rely on colour, hover, position, gesture or icon alone.
- Validate with component tests, Playwright, axe and manual keyboard/available screen-reader checks.

## Data, Security and Privacy
- Keep domain rules typed, deterministic and framework-independent.
- Derive authentication/active household authoritatively; reject forged identifiers.
- Preserve RLS, least privilege and owner/member/inactive/unrelated/unauthenticated coverage.
- Use idempotent operations and set-based reads; avoid N+1.
- Use synthetic fixtures and exclude household content, identities, tokens and credentials from logs/evidence.
- Database changes are additive, migration-safe and use protected post-merge Production release.

## Technical Direction
- Start with a reviewed table: milk→fridge/dairy, chicken→fridge/meat, frozen peas→freezer/frozen, rice→pantry/dry goods, apples→produce/produce.
- Persist automatic-vs-explicit metadata only if current model cannot protect corrections.
- Reuse current application/domain/repository patterns.
- Do not add dependencies/providers/cost without approval.
- Record an ADR for a new durable cross-domain contract.

## Implementation and Validation
1. Confirm dependencies are Done/merged/released.
2. Resolve product decisions; move package to `engineering/ready/`, Jira to Ready and add `codex-ready`.
3. Branch from verified latest remote `main`.
4. Write invariants/decision tables before data changes.
5. Implement smallest coherent change and preserve adjacent journeys.
6. Add unit, component, integration, database/RLS where applicable, E2E, accessibility and responsive tests.
7. Run preflight, npm ci, format, docs command audit, lint, typecheck, test and build; add database gates when applicable.
8. Validate Vercel Preview with synthetic households.
9. Record completion report, handover, release declarations and Jira evidence.

## Hosted Preview Scenarios
- [ ] Add common and ambiguous items.
- [ ] Correct location/category, rename and refresh.
- [ ] Verify CS-55 modal consumer and cross-household isolation.

## Definition of Done
- [ ] Acceptance criteria and regressions pass.
- [ ] Household isolation and adjacent journeys remain intact.
- [ ] GitHub Actions/Vercel pass on exact PR head and hosted evidence is recorded.
- [ ] Migration, Edge, Production, privacy, accessibility and cost impact are explicit.
- [ ] PR merged/released, Jira Done and package moved to `engineering/completed/`.

## Release, Rollback and Cost
- **Expected migration:** None expected; additive metadata may be justified after baseline review.
- **Expected Edge Function:** None unless explicitly approved.
- **Rollback:** Revert UI/application; use forward fix for released immutable migration.
- **New dependency/provider:** None expected.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements
PR title: `[CS-48] M11C — Automatically Categorise Pantry Location and Food Category`
Include Jira/package, principles/effort removed, implementation, tests, Preview, release declarations, security/accessibility, limitations, rollback and cost.
