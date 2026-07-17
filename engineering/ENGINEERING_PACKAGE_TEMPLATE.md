# Cooksmith Engineering Package Template

## Metadata
- **Milestone:** `[ID]`
- **Title:** `[Title]`
- **Jira issue:** `[CS-###]`
- **Epic:** `[Epic / key]`
- **Status:** `Planned | Ready | Building | In Review | Testing | Done`
- **Branch:** `[type]/[jira-key]-[slug]`
- **Depends on:** `[issue keys or None]`
- **Blocks:** `[issue keys or None]`
- **Package path:** `engineering/[status]/[filename].md`

## Product Outcome
Describe the user or operational outcome in one or two clear paragraphs.

## Current Baseline
Document the relevant state of `main`: existing features that must remain intact, recently merged work, current database/API/UI/test conventions, and known constraints. Codex must inspect the repository and verify this baseline before editing.

## Scope
### Included
- Concrete, testable delivery item.

### Explicitly Out of Scope
- Related capability intentionally deferred.

## Functional Requirements
### FR-1 — Requirement name
Describe observable behaviour.

**Acceptance criteria**
- [ ] Testable result.
- [ ] Testable result.

## UX and Interaction Requirements
- Prefer direct manipulation and progressive disclosure.
- Keep Cooksmith clean, mobile-friendly, and uncluttered.
- Define loading, empty, success, error, and destructive-action states.
- Preserve keyboard and screen-reader usability.

## Data and Domain Requirements
- Household data must remain household-scoped.
- Row-level security must be preserved.
- Database changes must be additive and migration-safe.
- Do not recreate user-deleted defaults or data.

## Technical Direction
- Reuse current project patterns.
- Keep changes focused.
- Avoid broad rewrites.
- Prefer typed domain boundaries.
- Keep server-side authorization authoritative.
- Do not add dependencies without PR justification.

## Implementation Guidance
1. Inspect `main`, Jira, and this package.
2. Verify dependencies are merged.
3. Update data model/migrations where required.
4. Implement domain and persistence behaviour.
5. Implement the smallest coherent UI.
6. Add automated coverage.
7. Run the full quality suite.
8. Validate hosted preview.
9. Update Jira and open the PR.

## Security and Privacy
- Enforce authentication and household isolation.
- Do not expose credentials.
- Do not weaken RLS.
- Add negative cross-household tests.

## Accessibility
- Core actions keyboard operable.
- Predictable focus.
- Accessible names.
- Non-pointer alternative for drag-and-drop.
- Associated validation messages.

## Test Plan
### Unit tests
- Domain logic, validation, and edge cases.

### Integration tests
- Persistence, authorization, policies, and migrations.

### End-to-end tests
- Primary journey, recovery path, and mobile critical path.

## Quality Gates
- [ ] Lint passes.
- [ ] Type checking passes.
- [ ] Unit/integration tests pass.
- [ ] End-to-end tests pass or approved limitation is documented.
- [ ] Production build passes.
- [ ] Migrations are tested.
- [ ] No secrets committed.
- [ ] Hosted preview manually validated.
- [ ] Jira contains PR and current status.

## Definition of Done
- [ ] Acceptance criteria met.
- [ ] Automated coverage protects primary behaviour.
- [ ] Cross-household access denied.
- [ ] Preview validated.
- [ ] PR passed checks and review.
- [ ] Jira moved through workflow.
- [ ] Package moved to `engineering/completed/` after merge.

## PR Requirements
PR title: `[CS-###] [Milestone] — [Concise title]`

Include Jira issue, package path, delivered behaviour, screenshots/recording, migration notes, tests, preview evidence, limitations, and rollback notes.
