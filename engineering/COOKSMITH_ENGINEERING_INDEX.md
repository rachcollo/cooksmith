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
| 6 | Automatic Pantry categorisation | CS-48 | `engineering/planned/cs48-automatic-pantry-categorisation.md` | Planned | CS-14 Done | `feat/cs-48-automatic-pantry-categorisation` |
| 7 | Recipe Library compact toolbar | CS-53 | `engineering/planned/cs53-compact-recipe-library-toolbar.md` | Planned; parallel-safe with CS-48 and CS-54 | Recipe/import foundations Done | `feat/cs-53-compact-recipe-toolbar` |
| 8 | Shopping page compact UX | CS-54 | `engineering/review/cs54-compact-shopping-page.md` | In Review; hosted responsive validation pending | CS-21 and CS-22 Done | `feat/cs-54-compact-shopping-page` |
| 9 | Pantry compact management UX | CS-55 | `engineering/planned/cs55-simplify-compact-pantry.md` | Planned | CS-48 | `feat/cs-55-compact-pantry` |
| 10 | Retailer-ready list copy | CS-41 | `engineering/planned/cs41-copy-retailer-ready-shopping-list.md` | Planned; start after CS-54 to avoid Shopping-page conflicts | CS-21, CS-22 and CS-54 | `feat/cs-41-copy-retailer-shopping-list` |
| 11 | Fortnight plan generation | CS-38 | `engineering/planned/cs38-generate-fortnight-meal-plan.md` | Planned; may run with CS-55 or CS-41 | Planner/recipe/Shopping foundations | `feat/cs-38-fortnight-plan-generation` |
| 12 | M11A Pantry Reconciliation | CS-23 | `engineering/planned/cs23-pantry-consumption-reconciliation.md` | Planned; start after CS-48 and preferably CS-55 | CS-14, CS-22, CS-48 | `feat/cs-23-pantry-reconciliation` |
| 13 | Pantry-aware shopping indicator | CS-50 | `engineering/planned/cs50-pantry-aware-shopping-indicator.md` | Jira Ready; package readiness transition still required | CS-14, CS-21, CS-22 Done | `feat/cs-50-pantry-aware-shopping-indicator` |
| 14 | Quick-add recipe to next plan date | CS-52 | `engineering/planned/cs52-quick-add-recipe-to-next-plan-date.md` | Jira Ready; package readiness transition still required | CS-20 and CS-49 Done | `feat/cs-52-quick-add-recipe-planner` |
| 15 | M11B Pantry Intelligence | CS-24 | `engineering/planned/cs24-explainable-pantry-intelligence.md` | Planned | CS-23 | `feat/cs-24-pantry-intelligence` |
| 16 | M12A MVP Beta Readiness | CS-25 | `engineering/planned/cs25-mvp-beta-readiness.md` | Planned; final gate | Approved core MVP and E01 | `chore/cs-25-beta-readiness` |
| 17 | M12B Beta Feedback | CS-26 | Not authored | Backlog | CS-25 | `chore/cs-26-beta-feedback` |

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

- **Wave 1:** CS-48, CS-53 and CS-54 may run concurrently because they own Pantry categorisation, Recipe Library toolbar and Shopping density respectively.
- **Wave 2:** CS-55 follows CS-48. CS-41 follows CS-54. CS-55 and CS-41 may run concurrently.
- **Independent planning stream:** CS-38 may run alongside Wave 2 when no shared Planner/Shopping contract change is active.
- **Pantry data stream:** CS-23 follows CS-48 and preferably CS-55; it should not run concurrently with another Pantry schema/lifecycle change.
- **Intelligence and release:** CS-24 follows accepted CS-23 reconciliation. CS-25 is the final beta gate after the approved MVP scope and critical defects are complete.
- CS-50 and CS-52 retain their existing packages; Jira/package lifecycle drift must be resolved before autonomous pickup.
- E01 may continue in parallel without rewriting unrelated product behaviour.

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
