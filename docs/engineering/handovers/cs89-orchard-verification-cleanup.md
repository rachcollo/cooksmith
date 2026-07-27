# CS-89 handover: Orchard verification and legacy cleanup

- **Date:** 2026-07-27
- **Branch:** `feat/cs-89-orchard-verification-cleanup`
- **Target:** `main`
- **Baseline:** `67884555f59ad8dd81070bea9e9d15bc5efdf730`
- **Implementation commit:** `56a29b477d9815d0fd030e9f9d95ffc0f3e54b27`
- **Evidence commit:** recorded in the pull request after publication
- **Pull request:** recorded after publication
- **Status:** Implemented; CI, Preview and manual verification pending

## Objective

Prove the integrated Orchard migration is internally consistent and accessible, remove
only evidenced dead legacy styling, and leave a repeatable verification contract for
responsive and accessibility review.

## Product impact

- **Product Principles supported:** calm and practical presentation, less effort finding
  the next action, and trust through preserved interaction and recovery behaviour.
- **User effort removed:** consistent typography, surfaces and interaction treatment now
  applies through public, authenticated and secondary routes.
- **Primary next action improved:** no product action changed; visual hierarchy remains
  consistent across routes.
- **Product behaviour changed:** No. Routing, workflows, validation, permissions,
  accessible names, roles, keyboard interaction and automation identifiers are
  preserved.

## Integrated migration evidence

| Package                                      | Implementation pull request                                | Result         |
| -------------------------------------------- | ---------------------------------------------------------- | -------------- |
| CS-83 — foundations, fonts and tokens        | [PR #105](https://github.com/rachcollo/cooksmith/pull/105) | Merged         |
| CS-84 — shared components                    | [PR #106](https://github.com/rachcollo/cooksmith/pull/106) | Merged         |
| CS-85 — navigation and shell                 | [PR #107](https://github.com/rachcollo/cooksmith/pull/107) | Merged         |
| CS-86 — Recipes and Pantry                   | [PR #108](https://github.com/rachcollo/cooksmith/pull/108) | Merged         |
| CS-87 — Plan and Shopping                    | [PR #109](https://github.com/rachcollo/cooksmith/pull/109) | Merged         |
| CS-88 — Home, Get Ahead and secondary routes | [PR #110](https://github.com/rachcollo/cooksmith/pull/110) | Merged         |
| CS-89 — verification and cleanup             | Current pull request                                       | Pending review |

The before references remain the migration-safe PNGs under
`docs/design/orchard/references/png/`. The updated Playwright suite attaches after
screenshots of the public welcome surface at 320px, 390px, 768px and 1280px in CI. The
authenticated route comparison must be completed against the exact Vercel Preview.

## Changes made

- Replaced undefined legacy aliases on auth, onboarding, Pantry, Recipes and Shopping
  surfaces with canonical Orchard tokens.
- Removed two unused tokens and seven dead selector groups after repository-wide usage
  searches showed no rendered component references.
- Applied Preview review feedback across the four core routes: compact four-column mobile
  Pantry cards, three-column mobile Recipe cards, contained recipe photo frames, compact
  Plan rows with recipe imagery and three retained actions, and a borderless Shopping
  quick-add area.
- Replaced Pantry's duplicate badge plus A/NA control with one explicit Available or Out
  of stock toggle, reduced the Pantry suggestions callout, and matched search/input
  control heights to adjacent actions.
- Removed the Plan completion eyebrow, kept dates on one line and aligned the Plan recipe
  detail with the Recipe Library presentation.
- Added a unit contract that rejects American colour tokens, temporary token aliases and
  undefined shared-token references.
- Added browser evidence for 320px, 390px, 768px and 1280px overflow, screenshots, axe
  serious/critical findings, keyboard focus and reduced motion.
- Updated the permanent design-system document to describe the shipped routes,
  six-destination mobile navigation, seven-destination desktop navigation and Orchard
  component conventions.
- Added proposed ADR 010 so acceptance of Orchard as the durable design system is
  explicit during review.

## Deletion and token evidence

- `rg` across `src/` found zero American `--color-*` properties.
- `rg` across `src/` found zero `--temp-*`, `--legacy-*` or `--compat-*` aliases.
- The token integrity test found zero undefined shared variables after allowing only the
  documented component-level override properties.
- Removed selectors had zero references outside their CSS definitions:
  `environment-badge`, `list-row-accent`, `pantry-panel-heading`,
  `pantry-reconciliation-panel`, `reconciliation-actions`, `duration-grid` and
  `choice-card`.
- Active shopping reconciliation selectors were retained and migrated from
  `--radius-lg` to `--radius-large`.

## Files and components affected

| File or component                                                    | Purpose                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/styles/tokens.css`                                              | Remove unused Orchard tokens                                                |
| `src/styles/components.css`                                          | Token cleanup plus responsive Pantry, Recipe, Plan and Shopping refinements |
| `src/styles/mealPlannerLinkedCards.css`                              | Compact linked-recipe Plan row layout                                       |
| `src/routes/PantryPage.tsx`                                          | Explicit availability toggle and compact insight action                     |
| `src/routes/PlanPage.tsx`                                            | Compact header, recipe imagery and Recipe Library-aligned detail            |
| `tests/integration/pantry.test.tsx`                                  | Pantry availability and reduced-callout regression coverage                 |
| `tests/integration/mealPlanner.test.tsx`                             | Planner header, imagery and recipe-detail regression coverage               |
| `tests/unit/orchardStyles.test.ts`                                   | Prevent token drift and undefined shared variables                          |
| `tests/e2e/shell.spec.ts`                                            | Responsive screenshots, overflow, axe, keyboard and reduced-motion evidence |
| `docs/engineering/v2/design-system-and-routing.md`                   | Promote the shipped Orchard system                                          |
| `docs/architecture/decisions/010-orchard-editorial-design-system.md` | Proposed durable design-system decision                                     |
| `engineering/review/cs89-orchard-verification-cleanup.md`            | Move the package to review                                                  |

## Migrations and dependencies

- **Database migrations:** None.
- **Edge Functions changed:** No.
- **Production database release required:** No.
- **Production Edge Function release required:** No.
- **Dependencies or providers changed:** None.

## Tests run

| Command or check                                                                | Result              | Notes                                                                      |
| ------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| `npm ci --cache /tmp/cs89-npm-cache`                                            | Passed              | 426 packages installed                                                     |
| `npm run preflight`                                                             | Unavailable         | Managed runner could not execute the optional pinned Supabase platform CLI |
| `TZ=Australia/Melbourne npm run format:check`                                   | Passed              | Required because the date suite is timezone-sensitive                      |
| `TZ=Australia/Melbourne npm run lint`                                           | Passed              | Zero warnings                                                              |
| `TZ=Australia/Melbourne npm run typecheck`                                      | Passed              | Strict TypeScript                                                          |
| `TZ=Australia/Melbourne npm run test`                                           | Passed              | 51 files, 262 tests                                                        |
| `TZ=Australia/Melbourne npm run build`                                          | Passed              | Production Vite build                                                      |
| `TZ=Australia/Melbourne npm run docs:commands:check`                            | Passed              | 148 documentation files                                                    |
| `TZ=Australia/Melbourne npm run engineering:check-secrets`                      | Passed              | No forbidden environment files or high-confidence secrets                  |
| `TZ=Australia/Melbourne npm run security:audit-production`                      | Passed              | Existing reviewed React Router exception only                              |
| `TZ=Australia/Melbourne npm run test:e2e`                                       | Unavailable locally | Chromium executable absent                                                 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/cs89-playwright npx playwright install chromium` | Unavailable locally | Permitted CDN returned empty archives; CI remains authoritative            |
| `git diff --check`                                                              | Passed              | No whitespace errors                                                       |

The first test run without `TZ` produced the existing UTC-sensitive date expectation
(`16 July` instead of Australian `17 July`). The complete suite passed when run with
the product timezone; no application change was made for that environment-only result.

## Preview and manual verification

On the exact Vercel Preview:

1. Compare every current route and shared overlay with the written Orchard rules and the
   migration-safe PNG at 320px, 390px, 768px and 1280px.
2. Confirm no horizontal overflow, clipped actions or hidden essential long names.
3. Complete keyboard-only journeys through navigation, forms, Plan movement, Get Ahead,
   dialogs and sheets; verify focus entry, order, visibility, Escape and return.
4. Run axe on Home, Pantry, Recipes, Plan, Shopping, Get Ahead, Settings, onboarding,
   invitation, authentication and recovery states; serious/critical findings must be
   zero.
5. Check text and interactive contrast, colour-independent availability/progress/status
   cues, 44px targets and reduced-motion behaviour.
6. Use synthetic data only and capture authenticated after screenshots for the PR.

Hosted Preview, VoiceOver, real-device, authenticated axe and visual comparison are
pending and must not be reported as complete until performed.

## Accessibility, security, privacy and cost

- **Accessibility:** automated unit coverage passed; browser axe, responsive screenshots
  and keyboard/reduced-motion checks are committed but await CI/Preview execution.
- **Security and privacy:** no auth, data, permissions, household boundaries, providers,
  persistence or logging changed. Synthetic evidence only.
- **Cost impact:** A$0/month and A$0/year.
- **Credential check:** staged implementation content passed the repository secret scan.

## Deferred product work

Future Home dashboard content, fortnight planning, persistent meal locks, retailer copy,
multi-column aisle layouts, segmented Pantry stock and any new Get Ahead behaviour
remain separate product stories. No future-concept reference was implemented.

## Rollback approach

Revert the CS-89 commits. No data, provider, migration or configuration repair is
required. Reintroducing the undefined or compatibility aliases is not recommended; use
canonical tokens in any forward fix.

## Recommended next milestone

Complete CI, Vercel Preview, authenticated route comparison and manual accessibility
review, then accept ADR 010 and merge only after human approval. CS-82 can close after
production deployment verification; no later milestone begins in this handover.
