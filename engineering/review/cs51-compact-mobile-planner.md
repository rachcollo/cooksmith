# Engineering Package — CS-51: Compact Mobile Planner

**Status:** In Review

**Branch:** `feat/cs-51-compact-mobile-planner`

**Base:** `main` at `1cf450f75456a8f3cedfa18a0b15b66be8ab5db8`

**Jira:** CS-51

## Objective

Let a household scan the full Monday-to-Sunday plan on a phone without crowding the planner with secondary controls.

## Approved behaviour

- Present each mobile day as a compact horizontal row while retaining 44px add, edit and remove targets.
- Match the mobile planner heading to the Recipe Library's 2rem heading scale.
- Remove “The weekly wrangle” and the mobile-only explanatory panel from the visible flow.
- Keep recipe details available from the linked meal card.
- Remove the standalone recipe-unlink action; edit and remove remain available.
- Preserve tablet and desktop presentation.

## Acceptance criteria

- [x] Seven compact day rows render on mobile without horizontal overflow.
- [x] Add, edit and remove retain accessible names and minimum touch-target sizing.
- [x] The planner eyebrow and unlink action are absent.
- [x] Focused integration coverage protects the visible action set.
- [ ] GitHub Actions responsive and accessibility gates pass.
- [ ] The Vercel Preview is verified at a representative phone viewport.

## Release impact

No migration, Edge Function, dependency, provider or recurring-cost change. Cost impact is A$0/month and A$0/year.

## Recovery

Revert the UI commit if the compact presentation causes a regression. No data or schema recovery is required.
