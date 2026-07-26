# CS-84 Orchard shared components and visual states handover

- **Date:** 2026-07-27
- **Branch:** `feat/cs-84-orchard-shared-components`
- **Target:** `main`
- **Baseline:** `b6c8c4644d92c12892e72ad89d871e8c13602f90`
- **Implementation commit:** `90353954678b8a8da6ec74619740b5951dab5358`
- **Status:** Implemented, hosted and manual validation pending

## Objective and product impact

Apply Orchard Editorial consistently to Cooksmith's reusable UI primitives so later route migrations can use semantic component APIs instead of route-specific colour styling. The change adds no user steps and changes no workflow, route, data, permission, validation, accessible-name or automation behaviour.

## Changes made

- Added the semantic `accent` Button variant for the single generative or commit action on a screen.
- Added a colour-independent destructive Button tone while preserving the existing primary, secondary and quiet variants.
- Added the semantic `feature` Panel tone and separated flat panels from raised cards.
- Added a generic Tag component that accepts arbitrary string labels and optional neutral, lilac, lime or slate tones.
- Restyled buttons, icon buttons, cards, badges, fields, dialogs, sheets and feedback states with the Orchard tokens.
- Added reusable photo-frame, neutral placeholder and list-row accent surfaces.
- Preserved 44-pixel targets, visible field focus, associated validation, reduced motion, native-dialog focus behaviour and text-backed status cues.
- Added focused component tests for semantic actions, busy and disabled behaviour, destructive cues, feature panels and arbitrary tags.

## Files and components affected

| File or component                      | Purpose                                       |
| -------------------------------------- | --------------------------------------------- |
| `src/components/ui/Button.tsx`         | Semantic accent and destructive states        |
| `src/components/ui/Panel.tsx`          | Semantic default and feature panel tones      |
| `src/components/ui/Tag.tsx`            | Generic arbitrary-label taxonomy tag          |
| `src/styles/components.css`            | Orchard shared-component and surface styling  |
| `tests/unit/SharedComponents.test.tsx` | Shared API, state and accessibility contracts |

## Validation

| Command or check                          | Result      | Notes                                                                      |
| ----------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `npm ci --cache /tmp/cs84-npm-cache`      | Passed      | Exact lockfile installed using a writable managed-workspace cache          |
| `npm run format` / `npm run format:check` | Passed      | Repository formatting clean                                                |
| `npm run lint`                            | Passed      | Zero warnings                                                              |
| `npm run typecheck`                       | Passed      | Strict TypeScript build                                                    |
| `npm run test`                            | Passed      | 50 files, 252 tests                                                        |
| `npm run build`                           | Passed      | Production bundle built                                                    |
| `npm run docs:commands:check`             | Passed      | 142 documented files audited                                               |
| `npm run engineering:check-secrets`       | Passed      | No forbidden files or high-confidence secrets                              |
| `npm run security:audit-production`       | Passed      | No dependency change in CS-84                                              |
| `npm run preflight`                       | Unavailable | Managed workspace lacks the downloaded Supabase platform CLI binary        |
| `npm run test:e2e`                        | Unavailable | All 12 cases could not launch because Playwright Chromium is not installed |

The managed runner also reports its existing `http-proxy` npm warning. It is not produced by repository configuration.

## Preview and manual verification

On the exact Vercel Preview:

1. Review primary, secondary, quiet, accent, destructive, disabled and busy buttons on cream, lilac and white surfaces.
2. Verify visible focus, keyboard operation and 44-pixel targets for buttons, icon buttons and fields.
3. Open representative dialogs and sheets; verify focus enters, Escape closes, background interaction is blocked and focus returns.
4. Check Badge and Tag contrast and confirm status remains understandable without colour.
5. Review fields with hint, error and disabled states and verify validation associations with axe.
6. Check photo placeholders and list-row accents at 320 px, 768 px and 1280 px with no horizontal overflow.
7. Run the hosted Playwright and axe checks and complete a keyboard-only pass.

## Release, accessibility, security, privacy and cost

- **Migrations:** None.
- **Edge Functions changed:** No.
- **Production release:** Application deployment only after human-approved merge.
- **Dependencies:** None added or changed.
- **Accessibility:** Semantic APIs, accessible names, validation relationships, native-dialog behaviour, touch targets, focus and reduced motion are preserved. Hosted axe, keyboard and responsive verification remain pending.
- **Security and privacy:** No auth, data, household, provider, logging or persistence code changed. Tests use synthetic copy only.
- **Cost impact:** A$0 per month and A$0 per year.
- **Rollback:** Revert the implementation and handover commits. No data repair, provider rollback or configuration repair is required.

## Deferred work

Navigation and application-shell migration, route-specific adoption of the new component variants, future product concepts and final legacy-style cleanup remain outside CS-84. CS-85 must not begin until this PR is accepted and merged.
