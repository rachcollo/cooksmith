# CS-50 Pantry-aware shopping indicator handover

## Status

Implemented; hosted Preview and manual validation pending.

## Baseline and scope

- Branch: `feat/cs-50-pantry-aware-shopping-indicator`
- Baseline: latest `main` used by the connected GitHub branch creation
- Package: `engineering/review/cs50-pantry-aware-shopping-indicator.md`
- Adds read-only, household-scoped pantry guidance to shopping rows.
- Database migrations: none.
- Edge Functions: none.
- New dependencies: none.
- Cost: A$0/month and A$0/year.

## Implementation

- Loads shopping and pantry records through their existing authorised repositories for the same active household.
- Filters pantry records defensively by active household and availability.
- Uses a deterministic, versioned domain matcher. Exact normalised names are strong matches; duplicate or token-related candidates are ambiguous and receive no indicator.
- Gives strong-match cards a subtle alternate background and an item-specific `?` control.
- Reveals the approved message on pointer hover, keyboard focus and press/tap, with Escape and outside-press dismissal.
- Does not persist match state or mutate pantry or shopping records.

## Validation

- `npm ci --cache /tmp/cooksmith-npm-cache`: passed.
- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run docs:commands:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 40 files and 182 tests.
- `npm run build`: passed with the existing Vite chunk-size warning.
- `npm run engineering:check-secrets`: passed.
- `npm run preflight`: environment limitation; Node, npm, environment, remote and branch checks passed, but the runner did not expose the pinned Supabase CLI on PATH. No database change is included.

## Remaining validation

- GitHub Actions and Vercel checks on the exact PR head.
- Hosted Preview mobile and desktop journeys using two synthetic households.
- Keyboard, touch, screen-reader, zoom and 320 CSS-pixel manual checks.

## Release and rollback

Merging deploys the private MVP application. No database or Edge Function release is required. Roll back by reverting the derived match index and shopping-row treatment; no data repair is required.
