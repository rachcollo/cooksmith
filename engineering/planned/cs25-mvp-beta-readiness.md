# Engineering Package — CS-25: MVP Beta Readiness

## Metadata
- **Milestone:** M12A
- **Jira issue:** CS-25
- **Epic:** Beta Launch (CS-8)
- **Status:** Planned
- **Branch:** `chore/cs-25-beta-readiness`
- **Depends on:** Approved core MVP scope, critical defect closure and E01/AIEOS
- **Blocks:** CS-26
- **Package path:** `engineering/planned/cs25-mvp-beta-readiness.md`

## Product Outcome
Create an evidence-backed go/no-go gate for a small friends-and-family beta across product journey, security, release safety, accessibility and support.

## Current Baseline
- Merging main deploys private MVP.
- Database/Edge releases use protected post-merge workflows.
- Beta scope and critical journey must be frozen before Ready.
Verify latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope
### Included
- Evidence-linked product/security/data/accessibility/operations checklist.
- Exact candidate SHA and environment separation.
- Synthetic end-to-end mobile household journey.
- Support, incident, feedback, rollback and cost readiness.
- Named go/no-go decision and pause capability.
### Explicitly Out of Scope
- Public launch
- Paid acquisition
- Future-scale features
- Unsubstantiated certification claims

## Functional Requirements and Acceptance Criteria
### FR-1 — Critical journey evidence
- [ ] Auth/onboarding/invitations and core recipe→plan→shopping→pantry journey pass.
- [ ] No dead controls or known data-loss path.
- [ ] Mobile/desktop empty/loading/error/recovery verified.

### FR-2 — Security and release safety
- [ ] RLS negative tests and config/secret boundary review pass.
- [ ] Exact candidate SHA matches reviewed code and release history.
- [ ] Backup, forward-fix and incident processes documented.

### FR-3 — Operational go/no-go
- [ ] Every blocker has owner/Jira issue.
- [ ] Beta owner, support, monitoring, feedback and costs confirmed.
- [ ] Product owner records go/no-go; access can pause; first-week checks scheduled.

## UX and Accessibility
- Design mobile first at 320px with calm default-led flows.
- Define loading, empty, busy, success, failure and recovery.
- Preserve 44px targets, keyboard/focus, contextual names, zoom/reflow and reduced motion.
- Do not rely on colour, hover, gesture or icon alone.
- Validate through component tests, responsive Playwright, axe and manual keyboard/available screen-reader checks.

## Data, Security and Privacy
- Keep domain rules typed, deterministic and framework-independent.
- Derive authentication/active household authoritatively; reject forged identifiers.
- Preserve RLS/least privilege and owner/member/inactive/unrelated/unauthenticated coverage.
- Use idempotent operations and set-based reads; avoid N+1.
- Use synthetic fixtures; exclude household content, identities, tokens and credentials from logs/evidence.
- Data changes are additive/migration-safe and use protected post-merge Production release.

## Technical Direction
- Create evidence manifest/checklist referencing immutable CI, Preview and release results.
- Do not treat checklist as authority to deploy, migrate, buy or invite without separate gates.
- Reuse current application/domain/repository patterns.
- No dependency/provider/cost without approval.
- Record ADR for new durable cross-domain contract.

## Implementation and Validation
1. Confirm dependencies Done/merged/released and settle product decisions.
2. Move package to `engineering/ready/`, Jira to Ready and add `codex-ready`.
3. Branch from latest verified remote `main`.
4. Write invariants/decision tables before data changes.
5. Implement smallest coherent change; preserve adjacent journeys.
6. Add unit, component, integration, database/RLS where applicable, E2E, accessibility and responsive tests.
7. Run preflight, npm ci, format, docs audit, lint, typecheck, test, build and applicable database gates.
8. Validate exact Vercel Preview with synthetic households.
9. Record completion report, handover, release declarations and Jira evidence.

## Hosted Preview Scenarios
- [ ] New synthetic household completes full journey on mobile.
- [ ] Invitation/member and unrelated-household negative scenario.
- [ ] Record exact candidate SHA, device/browser and all not-run limitations.

## Definition of Done
- [ ] Acceptance criteria/regressions pass and household isolation remains intact.
- [ ] GitHub Actions/Vercel pass on exact head; hosted evidence recorded.
- [ ] Migration, Edge, Production, privacy, accessibility and cost impact explicit.
- [ ] PR merged/released, Jira Done and package moved to `engineering/completed/`.

## Release, Rollback and Cost
- **Expected migration:** None inherent; all prior approved migrations must be verified released.
- **Expected Edge Function:** None inherent; all required prior functions must be verified released.
- **Rollback:** Pause invitations/access and follow approved deployment/database forward-fix plan.
- **New dependency/provider:** None expected unless explicitly approved.
- **Recurring cost:** A$0/month and A$0/year unless explicitly approved.

## PR Requirements
PR title: `[CS-25] M12A — MVP Beta Readiness`
Include Jira/package, principles/effort removed, implementation, tests, Preview, release declarations, security/accessibility, limitations, rollback and cost.
