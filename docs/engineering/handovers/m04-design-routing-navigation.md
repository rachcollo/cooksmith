# Milestone 4 handover: Design system, routing and accessible navigation

- **Date:** 2026-07-14
- **Branch:** `m04-design-routing-navigation`
- **Target:** `v2`
- **Commit:** The commit containing this final handover
- **Pull request:** [#5](https://github.com/rachcollo/cooksmith/pull/5)
- **Status:** Implemented, manual validation pending

## Objective

Create a calm, consistent, mobile-first and accessible application frame for future Cooksmith v2 features without implementing those features.

## Product impact

- **Product Principles supported:** Save time, reduce mental load, make the next action obvious and keep the application calm.
- **User effort removed:** Consistent navigation, page patterns, controls and recovery states remove repeated interpretation.
- **Primary next action improved:** Every current route presents one genuine navigation action.
- **Product behaviour changed:** The v2 foundation now has stable routes and navigation. No product workflow or database behaviour was added.

## Changes made

- Added restrained semantic design tokens and responsive layout primitives.
- Added typed, accessible controls, fields, states, cards, badges, dialogs and sheets.
- Added real lazy-loaded routing for the approved destinations.
- Added adaptive bottom and rail navigation, document titles and route announcements.
- Added safe loading, route-error and not-found patterns.
- Expanded component, integration, browser, responsive and axe test coverage.
- Documented route and component conventions for later milestones.

## Files and components affected

| File or component        | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `src/styles/`            | Tokens and global, layout, component and navigation styles |
| `src/components/layout/` | Shared responsive composition and page-header primitives   |
| `src/components/ui/`     | Typed accessible interface primitives                      |
| `src/app/navigation/`    | Approved route definitions and adaptive navigation         |
| `src/app/router/`        | Lazy route modules, titles and route hierarchy             |
| `src/routes/`            | Home, placeholder, health and not-found pages              |
| `tests/unit/`            | Component interaction and accessibility associations       |
| `tests/integration/`     | Shell, route, history and error behaviour                  |
| `tests/e2e/`             | Responsive navigation, focus, dialog and axe checks        |
| `docs/engineering/v2/`   | Design-system and routing conventions                      |

## Migrations

None. Milestone 3 database assets remain unchanged.

## Setup instructions

Run `npm ci`, then `npm run dev`. Use `npm run test:e2e:install` once on a browser-capable development machine before local browser tests.

## Tests run

See the [Milestone 4 completion report](../reports/m04-design-routing-navigation.md) for the complete command matrix. Static validation and 24 Vitest tests pass locally. GitHub Actions passed the complete Supabase gate and all 20 browser, responsive and axe checks.

## Preview or verification instructions

Open `/`, then use every primary navigation destination. Verify direct links, refresh, browser history, the skip link, visible keyboard focus and the foundation-details dialog. Check mobile bottom navigation below 64rem and the desktop rail at or above 64rem.

## Accessibility, security, privacy and cost

- **Accessibility:** Semantic landmarks, labels, focus, status announcements, reduced motion and responsive touch targets are implemented. VoiceOver and physical-device checks remain pending.
- **Security and privacy:** No product data, credential, provider error or service-role value is exposed.
- **Cost impact:** A$0 monthly and A$0 annually.
- **Credential check:** The final repository scan found no credential material or sensitive environment file.

## Known limitations

VoiceOver and physical-device checks remain pending. Placeholder routes intentionally contain no product behaviour.

## Deferred work

Authentication, households, onboarding, pantry, recipes, planning, shopping, AI and all database-backed feature work remain in their approved later milestones.

## Rollback approach

Revert the Milestone 4 commits from `v2`. There are no migrations, hosted services or data changes to unwind.

## Recommended next milestone

Milestone 5: Core Database, API Types and RLS Framework may begin only after Milestone 4 browser validation and acceptance. This task does not begin it.
