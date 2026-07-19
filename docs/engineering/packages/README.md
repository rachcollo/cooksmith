# Engineering package index

Engineering packages define build-ready scope, constraints, validation, acceptance criteria, and handover requirements for upcoming Cooksmith milestones.

| Milestone / story | Package                                                                            | Status                          | Depends on                             |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------- |
| M08B / CS-18      | [Meal Planner UX & Drag & Drop](m08b-meal-planner-ux-drag-drop.md)                 | Delivered                       | M08A                                   |
| M09B / CS-19      | [Recipe Authoring & Ingredients](m09b-recipe-authoring-ingredients.md)             | Delivered                       | M09A                                   |
| CS-27             | [Multiline Recipe Authoring](cs27-multiline-recipe-authoring.md)                   | Ready for Build                 | CS-19; deliver with CS-28              |
| CS-28             | [Lossless Recipe Content Structuring](cs28-lossless-recipe-content-structuring.md) | Ready for Build                 | CS-19; deliver with CS-27              |
| M08C / CS-20      | [Meal Planner ↔ Recipe Integration](m08c-meal-planner-recipe-integration.md)       | Ready after CS-27/CS-28         | M08A, CS-18, M09A, CS-19, CS-27, CS-28 |
| CS-30             | [Import and Review a Recipe from a URL](cs30-url-recipe-import.md)                 | Implemented; validation pending | CS-27, CS-28                           |
| CS-29             | [Cook With Me Step-by-Step Mode](cs29-cook-with-me.md)                             | Future / Backlog                | CS-27, CS-28                           |

Build order:

1. Deliver CS-27 and CS-28 together.
2. Start CS-20 and CS-30 after that shared recipe contract merges; they may run concurrently.
3. Keep CS-29 in Backlog until the first-release flow is proven.

Build work must start from the latest `main` and follow the dependency and concurrency boundaries in each package.
