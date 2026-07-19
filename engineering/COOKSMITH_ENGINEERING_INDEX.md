# Cooksmith Engineering Index

## Purpose
Jira is the delivery source of truth. Repository engineering packages are the implementation contracts Codex consumes.

## Package Lifecycle
```text
engineering/planned
        ↓ approved and unblocked
engineering/ready
        ↓ Codex claims issue; Jira → In Progress
engineering/building
        ↓ PR opened; Jira → In Review
engineering/review
        ↓ preview validation; Jira → Testing
engineering/completed
        ↓ merged and released; Jira → Done
```

Never keep duplicate package copies in multiple status folders.

## Next-Task Selection Rule
Codex may select work only when all are true:

1. Jira project is `CS`.
2. Status is `Ready`.
3. Label `codex-ready` is present.
4. The Jira issue references a package identifying itself as belonging to that key, under `engineering/` or `docs/engineering/packages/`, and that package passes readiness validation (no unresolved template placeholders, a Ready status, real acceptance criteria).
5. Every blocker is Done.
6. No active branch or open PR already claims the issue.
7. It is the highest-priority eligible item unless a human names another issue.

For equal priority, prefer the lower Jira key unless parallel execution is explicitly authorised.

This rule is mechanically enforced by
[`scripts/engineering/select-next-ready-issue.mjs`](../scripts/engineering/select-next-ready-issue.mjs),
using [`scripts/engineering/validate-package-readiness.mjs`](../scripts/engineering/validate-package-readiness.mjs)
for rule 4. See [automated pickup](../docs/operations/AI_ENGINEERING_OPERATING_SYSTEM.md#automated-pickup)
for how selection connects to actually starting a build.

## Active Roadmap

| Order | Milestone | Jira | Package | Status | Dependencies | Branch |
|---:|---|---|---|---|---|---|
| 1 | M08B Meal Planner UX & Drag-and-Drop | CS-18 | `engineering/ready/m08b-meal-planner-ux-drag-drop.md` | Ready | CS-15 Done | `feat/cs-18-meal-planner-drag-drop` |
| 2 | M09B Recipe Authoring & Ingredients | CS-19 | `engineering/ready/m09b-recipe-authoring-ingredients.md` | Ready | CS-16 Done | `feat/cs-19-recipe-authoring` |
| 3 | M08C Planner and Recipe Integration | CS-20 | `engineering/planned/m08c-planner-recipe-integration.md` | Backlog | Prefer CS-18 and CS-19 Done | `feat/cs-20-planner-recipe-integration` |
| 4 | M10A Shopping List Foundation | CS-21 | `engineering/review/cs21-shopping-list-foundation.md` | Done in Jira; package lifecycle cleanup pending | CS-20 Done | `feat/cs-21-shopping-list-foundation` |
| 5 | M10B Generate Shopping List | CS-22 | `engineering/planned/cs22-generate-shopping-list-from-meal-plan.md` | Planned; linked-recipe save defect must be resolved before Ready | CS-21 Done; planner prerequisite | `feat/cs-22-generate-shopping-list` |
| 6 | M11A Pantry Reconciliation | CS-23 | Not authored | Backlog | CS-22 | `feat/cs-23-pantry-reconciliation` |
| 7 | M11B Pantry Intelligence | CS-24 | Not authored | Backlog | CS-23 | `feat/cs-24-pantry-intelligence` |
| 8 | M12A MVP Beta Readiness | CS-25 | Not authored | Backlog | Core MVP and E01 | `chore/cs-25-beta-readiness` |
| 9 | M12B Beta Feedback | CS-26 | Not authored | Backlog | CS-25 | `chore/cs-26-beta-feedback` |
| 10 | Pantry-aware shopping indicator | CS-50 | Not authored | Backlog | Pantry and Shopping foundations | Not assigned |

## Completed Milestones

| Milestone | Jira | Status |
|---|---|---|
| M06A Authentication | CS-9 | Done |
| M06B Household Foundation | CS-10 | Done |
| M06C Invitations & Member Management | CS-11 | Done |
| M07A Pantry Foundation | CS-12 | Done |
| M07B Household Staples | CS-13 | Done |
| M07C Pantry Management | CS-14 | Done |
| M08A Meal Planner Foundation | CS-15 | Done |
| M09A Recipe Library Foundation | CS-16 | Done |

## Parallel Work
M08B and M09B are parallel-safe. M08C is the convergence milestone and should wait until both are merged unless the user explicitly accepts integration risk. E01 may continue in parallel without rewriting unrelated product behaviour.

## Jira-to-Package Contract
Every implementation issue should contain:
- milestone and outcome;
- package path;
- dependency keys;
- branch name;
- acceptance summary;
- `cooksmith`, `mvp`, milestone/domain labels;
- `codex-ready` only while genuinely eligible;
- PR and preview links after work starts.

The detailed requirements remain in the package, not duplicated indefinitely in Jira.

## Drift Control
Before starting, compare Jira, package, current `main`, open PRs, and recent migrations.

When they disagree:
- merged code is the technical baseline;
- package controls scope and acceptance;
- Jira controls workflow and dependency readiness;
- material conflicts require human review before implementation.
