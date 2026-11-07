# CS-97 handover: Next-week shopping

- **Branch:** `fix/cs-97-next-week-shopping`
- **Target:** `main`
- **Baseline:** `294d24e50a31433f9a4a522fceeffadccc294921`, verified against remote `main` before branching.
- **Status:** Implemented, validation pending.
- **Publishing:** Draft PR and exact-head CI evidence will be recorded in the PR. No merge or release performed.

## Objective and product impact

Remove the error when shopping ahead for the following week and make that
routine flow the starting point. Supports saving time, reducing mental load,
one-tap actions and weekly habits. No custom date entry is needed for next week.

The reproduced 8 November scenario previously opened 2–8 November, rejected
9–15 November against the old anchor, and discarded a correctly anchored
future range on reload. Two new regression tests failed against the baseline
before the fix.

## Changes made

- Next week is the next local-calendar Monday through Sunday, including month,
  year, leap-day and daylight-saving boundaries. This week and existing
  next-3/next-5 planned-meal presets remain available.
- Custom dates use their selected week's anchor rather than the week in which
  Shopping was opened. Future selections survive reload and remain selected
  through their final date. Reversed, invalid and cross-week ranges are rejected.
- The compact dropdown identifies the household default. Presets save
  automatically; only custom dates need Save dates. Failed saves preserve the
  previous list and custom draft.
- Existing `week` defaults migrate to `nextWeek`; shorter presets and saved
  explicit ranges are preserved. Because the previous schema recorded no
  default provenance, deliberately chosen `week` defaults migrate too. Owners
  can choose This week again.
- Pantry/bought stock is allocated to outstanding current-week meals before
  next-week demand. Changing the displayed range cannot reuse that stock.
- Manual items, purchase state, contribution snapshots and household isolation
  remain unchanged.

## Files and components affected

Domain shopping period, Shopping period/default controls, Supabase shopping
adapter, focused domain/component/adapter tests, synthetic browser fixture,
local HTTP contract test, pgTAP, product specification and CS-97 package.
No dependency or Edge Function change. Generated types are unchanged because
the migration changes text checks/defaults, not column or function signatures;
CI must still verify freshness.

## Migrations and release

`20261107223923_next_week_shopping_default.sql` adds the `nextWeek` preset to
the existing checks and changes/backfills the household default. It preserves
the single Monday-based week constraint, all saved selections, RLS and grants.

This PR does not deploy Production. A later approved release must use the
protected **Production database release** workflow after merge, target the
exact approved `main` SHA, verify migration history and perform the dry-run.
Released migrations remain immutable; subsequent fixes require a new forward
migration. No automatic merge, migration, release approval or deployment is
part of this work.

Coordinate the client and database release: the old client rejects the new
default value. Deploy the compatible new client before applying the migration,
then verify both together and refresh older sessions. Until the migration is
applied, existing defaults load, but saving Next week is unavailable. Do not
describe the feature as live before this sequence and authenticated checks
complete. A staged compatibility-only rollout may be preferable if old clients
cannot be refreshed during the release window.

## Local automated evidence

- Pinned dependencies installed with `npm ci` using a writable temporary npm cache.
- `npm run preflight` passed using a writable temporary HOME for Supabase CLI.
- `npm run format`, `npm run format:check`, `npm run lint` and `npm run typecheck` passed.
- `npm test`: 104 suites, 782 tests passed at initial full validation.
- `npm run build`, `npm run docs:commands:check` and `npm run engineering:check-secrets` passed.
- Domain/component/adapter regressions cover the exact November dates, defaults,
  expiry, invalid ranges, persistence, failed saves and cross-week stock allocation.
- `npm run db:config:check` passed. `db:validate`, `db:lint`, `db:test` and
  `db:types:check` could not proceed because no Docker-compatible runtime exists.
  New pgTAP includes 29 assertions, including replay of recorded migration SQL
  inside a rolled-back transaction. Real database/HTTP execution remains pending CI.
- Playwright browser download failed with an invalid archive. Installed system
  Chromium could not launch because local socket creation is prohibited, also
  on the approved escalation attempt. The browser/axe assertions were not
  reached locally. No repository test gate was weakened.
- Managed npm `http-proxy` warnings are environment-only; no config changed.

## GitHub Actions and hosted validation

The draft PR is the source for exact-head CI, mergeability and Vercel status.
Required database, browser and accessibility checks must pass before review.
No hosted authenticated preview, production database, real household data or
physical-device testing was used. No paid provider call was made.

Use only an approved staging preview and synthetic households for later checks:

1. On a Sunday, load Shopping with the next-week default and confirm the next
   Monday–Sunday dates and correct planned ingredients appear automatically.
2. Select This week, then Custom dates, enter the following Monday and Sunday,
   save, reload and reopen Shopping. Dates and manual items must remain.
3. Switch between Next week, This week and household default. Quantities should
   change reversibly without double-counting pantry or bought stock.
4. Save from a second active member; another household must not read/change it.
5. Verify failed saves, keyboard/date input, 320px layout, Safari and VoiceOver.

## Safety, cost and rollback

- No secrets, credentials, real household data or sensitive environment files
  included. Staged-content scanning is required again before commit.
- Semantic controls and existing busy/failure handling retained. Local component
  checks passed; browser axe and physical assistive-technology checks remain pending.
- Cost impact: A$0/month and A$0/year. No new service, provider or dependency.
- Do not roll the frontend back to a version that cannot parse `nextWeek` after
  migration. Use a reviewed forward compatibility fix, or separately approved
  compensating migration that remaps new presets before any legacy rollback.
- No later milestone started. Release and final acceptance remain separate.
