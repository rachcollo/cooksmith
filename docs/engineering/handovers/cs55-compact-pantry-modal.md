# CS-55 Compact Pantry Modal Handover

- **Date:** 2026-07-24
- **Branch:** `feat/cs-55-compact-pantry`
- **Target:** `main`
- **Baseline commit:** `17044fbfc15ea0fe48d0e64bfc5cec9426ec2781`
- **Status:** Ready for review; hosted validation pending

## Objective and Product Impact

CS-55 keeps Pantry calm and focused by moving occasional item entry into an on-demand dialog. It
removes a full form from the default page while preserving the established add-item workflow and
automatic categorisation contract.

## Changes Made

| File or component                                   | Purpose                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| `src/routes/PantryPage.tsx`                         | Compact toolbar, nested location/category hierarchy and item actions. |
| `src/styles/components.css`                         | Square cards, borderless actions and responsive toolbar/layout.       |
| `tests/integration/pantry.test.tsx`                 | Toolbar, hierarchy, quantity and availability regression coverage.    |
| `engineering/ready/cs55-simplify-compact-pantry.md` | Authoritative CS-55 scope and acceptance criteria (unchanged).        |

## Database, Dependencies and Release

- **Migrations:** None.
- **Edge Functions:** None.
- **Dependencies:** `react-router-dom` and its exact `react-router` dependency are pinned to 8.2.1,
  above both the `6.0.0–7.17.0` advisory range reported for 7.11.0 and the `7.12.0–8.2.0` range
  reported for 7.18.1. No new dependency was added.
- **Production access or release:** None; merging to `main` remains a separate reviewed action.

## Preview Verification

When a hosted preview is available, sign in with a synthetic household, open Pantry and verify at
mobile and desktop widths that **Add item** opens the dialog, focus enters Item name, Cancel
clears the draft, reopening starts blank, and a valid item saves and appears in the list. Also verify
Escape dismissal, keyboard traversal and no horizontal overflow.

No hosted preview was available in this container because no Git remote is configured, so these
checks remain pending and must not be treated as passed.

## Local Validation

| Command                                             | Result                                                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run format` / `npm run format:check`           | Passed.                                                                                             |
| `npm run lint`                                      | Passed.                                                                                             |
| `npm run typecheck`                                 | Passed.                                                                                             |
| `npm run test -- tests/integration/pantry.test.tsx` | Passed: 8 tests.                                                                                    |
| `npm run build`                                     | Passed with the existing large-chunk advisory.                                                      |
| `npm run docs:commands:check`                       | Passed.                                                                                             |
| `npm run engineering:check-secrets`                 | Passed.                                                                                             |
| `npm run engineering:validate-package -- CS-55`     | Passed against the ready package.                                                                   |
| `npm audit --omit=dev --audit-level=high`           | Registry endpoint returned HTTP 403 locally; CI must verify the pinned non-vulnerable versions.     |
| `npm run test`                                      | Passed: 244 tests after bounding Testing Library's async retry window for parallel CI contention.   |
| `npm run preflight`                                 | Environment-limited: runner Node/npm versions differ from the pins and no Git remote is configured. |
| `npm run test:e2e`                                  | Environment-limited: the Playwright Chromium executable is absent.                                  |
| `npm run test:e2e:install`                          | Environment-limited: the browser CDN returned HTTP 403.                                             |

The review follow-up also verified that each Pantry card now contains exactly two actions, keeps
its quantity inside the information column, and keeps the Pantry title and Add item action on one
compact row. Testing Library now uses a bounded three-second async retry window so route-level lazy
imports do not produce one-second false negatives when all integration files run concurrently.

The final UI review groups items by category beneath each storage location instead of repeating
category labels on cards. Empty quantities render no placeholder, availability toggles between A
and NA, item buttons are borderless, cards use a square recipe-style shape, and Search, Filters, Add
and Suggestions share one compact icon-led toolbar. At mobile widths the cards use a four-column
grid with condensed card typography and actions.

The edit dialog keeps Location and Category together on one row, followed by Quantity and Unit on
one row, and uses tighter vertical spacing so the complete form is easier to review on a mobile
screen.

## Accessibility, Security, Privacy and Cost

- **Accessibility:** The dialog has an accessible title and description, labelled controls, initial
  focus, keyboard dismissal and responsive field stacking. Automated and hosted axe evidence remains
  subject to the available browser environment.
- **Security and privacy:** Existing repository validation and household boundaries are unchanged;
  no credentials or real household data are included.
- **Cost:** A$0/month and A$0/year; no provider or tier changes.

## Rollback and Deferred Work

Revert the CS-55 commits to restore the inline form; no data rollback is required. New Pantry
metadata, bulk entry, scanning and AI behaviour remain outside this package.
