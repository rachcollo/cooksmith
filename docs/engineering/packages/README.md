# Engineering package index

Engineering packages define build-ready scope, constraints, validation, acceptance criteria, and handover requirements for upcoming Cooksmith milestones.

| Milestone | Package | Status | Depends on |
| --- | --- | --- | --- |
| M08B | [Meal Planner UX & Drag & Drop](m08b-meal-planner-ux-drag-drop.md) | Ready for Build | M08A |
| M09B | [Recipe Authoring & Ingredients](m09b-recipe-authoring-ingredients.md) | Ready for Build | M09A |
| M08C | [Meal Planner ↔ Recipe Integration](m08c-meal-planner-recipe-integration.md) | Ready after dependencies merge | M08A, M08B, M09A, M09B |

Build work must start from the latest `main` and follow the dependency and concurrency boundaries in each package.
