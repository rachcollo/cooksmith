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
| 6 | Automatic Pantry categorisation | CS-48 | `engineering/review/cs48-automatic-pantry-categorisation.md` | In Review | CS-14 Done | `feat/cs-48-automatic-pantry-categorisation` |
| 7 | Recipe Library compact toolbar | CS-53 | `engineering/review/cs53-compact-recipe-library-toolbar.md` | In Review; parallel-safe with CS-48 and CS-54 | Recipe/import foundations Done | `feat/cs-53-compact-recipe-toolbar` |
| 8 | Shopping page compact UX | CS-54 | `engineering/review/cs54-compact-shopping-page.md` | In Review; hosted responsive validation pending | CS-21 and CS-22 Done | `feat/cs-54-compact-shopping-page` |
| 9 | Pantry compact management UX | CS-55 | `engineering/ready/cs55-simplify-compact-pantry.md` | Ready | CS-48 | `feat/cs-55-compact-pantry` |
| 10 | Retailer-ready list copy | CS-41 | `engineering/planned/cs41-copy-retailer-ready-shopping-list.md` | Planned; start after CS-54 to avoid Shopping-page conflicts | CS-21, CS-22 and CS-54 | `feat/cs-41-copy-retailer-shopping-list` |
| 11 | Week plan generation | CS-38 | `engineering/ready/cs38-generate-week-meal-plan.md` | In implementation review; PR #69 | CS-20 and CS-22 Done | `feat/cs-38-week-plan-generation` |
| 12 | Compact Plan my week review | CS-59 | `engineering/ready/cs59-compact-plan-my-week.md` | Package ready for approval; blocked until CS-38 Done | CS-38 | `feat/cs-59-compact-plan-my-week` |
| 13 | M11A Pantry Reconciliation | CS-23 | `engineering/ready/cs23-pantry-consumption-reconciliation.md` | Ready; start after CS-48 and preferably CS-55 | CS-14, CS-22, CS-48 | `feat/cs-23-pantry-reconciliation` |
| 14 | Pantry-aware shopping indicator | CS-50 | `engineering/review/cs50-pantry-aware-shopping-indicator.md` | In Review; hosted validation pending | CS-14, CS-21, CS-22 Done | `feat/cs-50-pantry-aware-shopping-indicator` |
| 15 | Quick-add recipe to next plan date | CS-52 | `engineering/planned/cs52-quick-add-recipe-to-next-plan-date.md` | Jira Ready; package readiness transition still required | CS-20 and CS-49 Done | `feat/cs-52-quick-add-recipe-planner` |
| 16 | M11B Pantry Intelligence | CS-24 | `engineering/ready/cs24-explainable-pantry-intelligence.md` | Ready | CS-23 | `feat/cs-24-pantry-intelligence` |
| 17 | Onboarding feature guidance | CS-60 | `engineering/planned/cs60-onboarding-how-to.md` | Planned; product decisions required before Ready | Stable MVP navigation | `feat/cs-60-onboarding-how-to` |
| 18 | M12A MVP Beta Readiness | CS-25 | `engineering/planned/cs25-mvp-beta-readiness.md` | Planned; final gate | Approved core MVP and E01 | `chore/cs-25-beta-readiness` |
| 19 | M12B Beta Feedback | CS-26 | Not authored | Backlog | CS-25 | `chore/cs-26-beta-feedback` |
| 20 | Get Ahead Opportunity Detection | CS-65 | `engineering/ready/cs65-preparation-opportunity-detection.md` | Ready | Recipes and Meal Planner | `feat/cs-65-preparation-opportunity-detection` |
| 21 | Get Ahead Session | CS-66 | `engineering/ready/cs66-get-ahead-session.md` | Ready; blocked until CS-65 Done | CS-65 | `feat/cs-66-get-ahead-session` |
| 22 | Intelligent Task Prioritisation | CS-67 | `engineering/ready/cs67-intelligent-task-prioritisation.md` | Ready; blocked until CS-65 and CS-66 Done | CS-65, CS-66 | `feat/cs-67-intelligent-task-prioritisation` |
| 23 | Task Consolidation | CS-68 | `engineering/ready/cs68-task-consolidation.md` | Ready; blocked until CS-65 and CS-66 Done | CS-65, CS-66 | `feat/cs-68-task-consolidation` |
| 24 | Smart Prep Checklist | CS-69 | `engineering/ready/cs69-smart-prep-checklist.md` | Ready; blocked until CS-66 and CS-67 Done | CS-66, CS-67 | `feat/cs-69-smart-prep-checklist` |

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
- **Independent planning stream:** CS-38 may run alongside Wave 2 only when no shared Planner or Shopping reconciliation contract change is active. CS-59 follows CS-38 and must not overlap the CS-38 implementation branch.
- **Pantry data stream:** CS-23 follows CS-48 and preferably CS-55; it should not run concurrently with another Pantry schema/lifecycle change.
- **Intelligence and release:** CS-24 follows accepted CS-23 reconciliation. CS-60 remains Planned until its onboarding product decisions are approved. CS-25 is the final beta gate after the approved MVP scope and critical defects are complete.
- CS-50 is in review. CS-52 retains its existing package; Jira/package lifecycle drift must be resolved before autonomous pickup.
- E01 may continue in parallel without rewriting unrelated product behaviour.
- **Get Ahead core:** CS-65 must be accepted before CS-66. After CS-66, CS-67 and CS-68 may be developed concurrently because ranking and consolidation own separate domain contracts. CS-69 follows CS-67 and should consume CS-68 when available without being blocked by it.

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
