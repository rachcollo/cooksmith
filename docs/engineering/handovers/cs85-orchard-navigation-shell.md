# CS-85 Orchard navigation and application shell handover

- **Date:** 2026-07-27
- **Branch:** `feat/cs-85-orchard-navigation-shell`
- **Target:** `main`
- **Baseline:** `ba2597ed0151cd7fee1b0ef377a889941e9a38c1`
- **Implementation commit:** `d6a8667bf517313d9ca6d000108c9edd84d77330`
- **Status:** Implemented, hosted and manual validation pending

## Objective and product impact

Give Cooksmith one coherent Orchard frame across mobile and desktop while preserving the existing routes, workflows, accessible names, keyboard behaviour and automation identifiers. The frame keeps all six labelled mobile destinations and all seven desktop destinations in their approved order without adding a user step.

## Changes made

- Replaced the legacy square brand mark with the canonical lilac Orchard blob monogram and editorial wordmark.
- Restyled the mobile frame as a fixed six-column cream bottom navigation with mono labels, existing Lucide icons, safe-area accommodation and a lime active underline.
- Restyled the desktop application shell as a cream rail with all seven destinations and a lime active surface.
- Removed the obsolete mobile Settings header shortcut so Settings remains desktop-rail-only, matching the approved route contract.
- Updated page spacing to reserve the actual mobile navigation and safe-area height.
- Preserved the existing Shopping long-press menu, real links, focus-visible behaviour and `aria-current="page"` contract.
- Added regression coverage for destination count, order, Settings visibility and exactly one active desktop destination on every route.

## Files and components affected

| File or component                                     | Purpose                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/app/layout/RootLayout.tsx`                       | Canonical brand structure and approved responsive shell destinations      |
| `src/styles/layout.css`                               | Orchard page canvas and mobile navigation clearance                       |
| `src/styles/navigation.css`                           | Mobile navigation, desktop rail, brand mark, active states and safe areas |
| `tests/integration/app-shell.test.tsx`                | Destination order and active-route regression contracts                   |
| `engineering/review/cs85-orchard-navigation-shell.md` | Package lifecycle evidence                                                |

## Validation

| Command or check                          | Result      | Notes                                                                         |
| ----------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `npm ci`                                  | Passed      | Exact lockfile installed with writable cache                                  |
| `npm run format` / `npm run format:check` | Passed      | Repository formatting clean                                                   |
| `npm run lint`                            | Passed      | Zero warnings                                                                 |
| `npm run typecheck`                       | Passed      | Strict TypeScript build                                                       |
| `npm run test`                            | Passed      | 50 files, 260 tests                                                           |
| `npm run build`                           | Passed      | Production bundle built                                                       |
| `npm run docs:commands:check`             | Passed      | 143 documented files audited                                                  |
| `npm run engineering:check-secrets`       | Passed      | No forbidden files or high-confidence secrets                                 |
| `npm run security:audit-production`       | Passed      | Reviewed existing browser-only React Router exception                         |
| `npm run preflight`                       | Unavailable | Supabase CLI cannot create its managed-runner cache under read-only `/root`   |
| `npm run test:e2e`                        | Unavailable | Chromium is absent; the permitted download returned an empty, invalid archive |

The managed runner also reports its existing `http-proxy` npm warning. It is not produced by repository configuration.

## Preview and manual verification

On the exact Vercel Preview:

1. At 320 px and 390 px, confirm all six mobile destinations and labels remain visible without horizontal overflow.
2. Confirm Home, Pantry, Recipes, Plan, Shopping and Get Ahead each set exactly one mobile `aria-current="page"` state and show the lime underline.
3. At 768 px, confirm the mobile frame remains active, bottom content clears the fixed navigation and safe-area padding holds.
4. At 1024 px and 1280 px, confirm the seven-destination rail replaces the mobile frame and Settings appears only in the rail.
5. Use direct URLs, refresh, back and forward on every destination and confirm the correct active state persists.
6. Keyboard through the skip link, brand, desktop rail, Shopping menu and page actions; confirm focus remains visible.
7. Long-press or open the Shopping context menu and confirm `Restock pantry` still opens the existing flow.
8. Run axe against representative mobile and desktop routes and confirm no serious or critical findings.

## Release, accessibility, security, privacy and cost

- **Migrations:** None.
- **Edge Functions changed:** No.
- **Production release:** Application deployment only after human-approved merge.
- **Dependencies:** None added or changed.
- **Accessibility:** Semantic navigation landmarks, labels, Lucide icons, `aria-current`, skip link, focus-visible treatment, 44-pixel targets and reduced motion are preserved. Hosted axe, keyboard and responsive verification remain pending.
- **Security and privacy:** No auth, data, household, provider, logging or persistence code changed. Tests use synthetic data only.
- **Cost impact:** A$0 per month and A$0 per year.
- **Rollback:** Revert the implementation commit. No data, provider or configuration repair is required.

## Deferred work

Route content migration and any future product concepts remain outside CS-85. CS-86, CS-87 and CS-88 must not begin until this pull request is accepted and merged.
