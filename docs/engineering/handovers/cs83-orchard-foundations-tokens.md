# CS-83 Orchard foundations, fonts and token migration handover

- **Date:** 2026-07-27
- **Branch:** `feat/cs-83-orchard-foundations-tokens`
- **Target:** `main`
- **Baseline:** `b4cadc856fccf087305c098df89afa28149a6258`
- **Implementation commit:** `ccee4bbf47205faeb43114974a7da9f5eedff4e9`
- **Status:** Implemented, hosted and manual validation pending

## Objective and product impact

Establish the Orchard Editorial visual foundations for later shared-component and route migrations without changing product behaviour. The change supports Cooksmith's calm, practical experience through one canonical palette, typography system and interaction foundation. It adds no user steps and changes no workflows, routing, data access, validation, permissions, accessible names or automation identifiers.

## Changes made

- Added exact Fontsource 5.3.0 packages for Cormorant Garamond, Space Grotesk and Space Mono.
- Imported only the approved Latin weights and styles at the application entry point.
- Replaced the foundation tokens with the canonical Orchard palette, typography, borders, shapes, shadows, focus, motion, layout and navigation dimensions.
- Normalised all `var(--color-*)` drift in `src/` to British `var(--colour-*)` names.
- Applied the global Cormorant heading, Space Grotesk body and Space Mono eyebrow treatment.
- Updated the browser theme colour and favicon to the approved cream and forest treatment.

## Files and components affected

| File or component                                        | Purpose                               |
| -------------------------------------------------------- | ------------------------------------- |
| `package.json`, `package-lock.json`                      | Exact local font dependencies         |
| `src/main.tsx`                                           | Approved self-hosted font imports     |
| `src/styles/tokens.css`                                  | Canonical Orchard foundation tokens   |
| `src/styles/global.css`                                  | Global typography and focus treatment |
| `src/styles/components.css`, `src/styles/navigation.css` | British token-name normalisation      |
| `index.html`, `public/favicon.svg`                       | Orchard browser chrome and brand mark |

## Validation

| Command or check                          | Result      | Notes                                                                    |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `npm ci`                                  | Passed      | Exact lockfile installed                                                 |
| `npm run format` / `npm run format:check` | Passed      | Repository formatting clean                                              |
| `npm run lint`                            | Passed      | Zero warnings                                                            |
| `npm run typecheck`                       | Passed      | Strict TypeScript build                                                  |
| `npm run test`                            | Passed      | 49 files, 247 tests                                                      |
| `npm run build`                           | Passed      | Production bundle includes local font assets only                        |
| `npm run docs:commands:check`             | Passed      | Documented commands valid                                                |
| `npm run engineering:check-secrets`       | Passed      | No forbidden files or high-confidence secrets                            |
| `npm run security:audit-production`       | Passed      | Existing reviewed React Router exception only                            |
| `rg -n 'var\(--color-[a-z]' src`          | Passed      | Zero matches                                                             |
| `npm run preflight`                       | Unavailable | Managed workspace lacks the downloaded Supabase platform CLI binary      |
| `npm run test:e2e`                        | Unavailable | Playwright Chromium executable is not installed in the managed workspace |

## Preview and manual verification

On the exact Vercel Preview:

1. Verify Cormorant headings, Space Grotesk body text and Space Mono eyebrows render without external font requests.
2. Block font assets and confirm fallback text remains readable and layouts remain usable.
3. Check visible focus on cream, forest, lilac and lime surfaces.
4. Review authenticated and public routes at 320 px, 768 px and 1280 px for overflow or behavioural regression.
5. Run the hosted Playwright and axe checks and complete a keyboard-only pass.

## Release, accessibility, security, privacy and cost

- **Migrations:** None.
- **Edge Functions changed:** No.
- **Production release:** Application deployment only after human-approved merge.
- **Accessibility:** Focus, reduced motion and semantic behaviour are preserved. Hosted axe, keyboard and responsive verification remain pending.
- **Security and privacy:** Fonts are bundled locally; there are no runtime font-provider requests. No data, permissions, auth or persistence code changed.
- **Cost impact:** A$0 per month and A$0 per year.
- **Rollback:** Revert the implementation and handover commits. No data repair or provider rollback is required.

## Deferred work

Shared components, navigation, application shell, route migration, future product concepts and final legacy-style cleanup remain outside CS-83. CS-84 must not begin until this PR is accepted and merged.
