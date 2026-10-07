# CS-97 follow-up: household default and compact Shopping filter

- **Date:** 2026-10-07
- **Branch:** `feat/cs-97-shopping-default-dropdown`
- **Target:** `main`
- **Baseline:** started from accepted `3f6ecebf8dd922be990cd6f022218ea7adde0e4b` (PR191), then integrated accepted `19bb8c573c5f7dc75c595285a967fcd876d8974f` (PR192).
- **Status:** Implemented, hosted/manual validation pending. Draft review; no merge or release performed.
- **Commit and PR:** See the linked CS-97 follow-up PR for its exact head and CI results.

## Objective and product impact

Rach reports PR191 functions correctly but its Shopping period UI is too cluttered. Move the usual preset to household Settings and make the Shopping dropdown apply immediately. This supports calm, practical mobile use and removes a redundant confirmation click. The original functional report is owner evidence, not acceptance of this visual refinement or proof of other beta journeys.

## Changes made

- Settings exposes an owner-managed default: full active week, next 3 planned meals or next 5 planned meals. Ordinary active members can read it. These are meal counts, not days.
- Shopping has one compact “Buy for” dropdown and a short dates/meal-count summary. Presets save immediately. Only Custom dates reveals date inputs and a Save dates button.
- “Household default” follows Settings. A valid current-week shared override stays in force when Settings changes. Selecting Household default explicitly clears that override behaviour. Missing, invalid or expired overrides use the default; defaults of next 3/5 meals move with today on reload, whereas explicit overrides retain their selection-date anchor until the week ends.
- Current-list changes remain shared among active household members. Defaults retain existing owner-only Settings write permission. No RLS policies or grants change.
- Preference writes do not reconcile, delete or rewrite purchases/contributions. Manual items, explicit quantities, bought state and source history remain intact.
- Pending controls disable duplicate writes, errors retain the previous list, stale background successes/errors cannot supersede a newer selection, and successful changes preserve select focus. Household switching ignores old responses.
- At 320px and 200% text, Shopping item controls retain 48px targets without forcing horizontal overflow. The title row wraps rather than squeezing the title between the count and viewport.

## Files and components affected

| Area                                                                                | Purpose                                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/domain/shopping/period.ts`                                                     | Separate default and override resolution; concise summary             |
| `src/application/shopping/shoppingRepository.ts`, Supabase Shopping adapter         | Read/write the existing household Settings boundary                   |
| Shopping period control, new Shopping defaults section, Settings and Shopping pages | Auto-apply UI, permissions, loading/error and stale-response handling |
| `src/styles/components.css`                                                         | Compact period layout and enlarged-text Shopping layout               |
| Generated database types                                                            | Fresh local schema generation                                         |
| Domain, integration, browser, SQL and HTTP tests                                    | Behaviour, interaction, isolation and retained purchase evidence      |

## Migrations and setup

Migration: `20261007020500_household_shopping_default.sql`. It adds constrained non-null `household_settings.shopping_default_period` with `week` for existing households and permits `default` in the current-period kind constraint. Existing dates and permissions remain unchanged. No Edge Function or dependency changes.

This PR does not deploy Production. After a separately approved merge, release the exact approved main SHA through protected **Production database release**, with backup/compatibility review, pending-set dry-run and migration-history verification. Apply the migration before serving this client; loading Shopping requires the new column. The new migration is later than the accepted baseline migrations. If an older pending feature such as CS-98 joins the release, review the complete pending set and history before choosing any out-of-order option; do not assume this new migration itself requires it. Released migrations remain immutable; fixes use new forward migrations.

## Local tests

| Check                                                                                         | Result                                                                                                                           |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Clean `npm ci` using writable `/tmp` npm cache                                                | Passed; default home cache was unavailable                                                                                       |
| `npm run validate:static`                                                                     | Passed: 631 tests in 86 files, format, lint, TypeScript and production build                                                     |
| Local PostgreSQL 17 migration replay, seed and pgTAP                                          | Passed: 624 assertions in 37 files, including 12 new Settings/override permissions and constraints checks                        |
| Local database lint                                                                           | Passed: no schema errors (loopback connection with `PGSSLMODE=disable`)                                                          |
| Fresh generated types from migrated local schema                                              | Exact match                                                                                                                      |
| Real local PostgREST 14.5 HTTP suite, serial                                                  | Passed: 5 checks, including real-adapter owner/member/isolation, separate override/default and unchanged purchases/contributions |
| Full Playwright with Chromium/mobile and Shopping WebKit                                      | Passed: 50 checks; desktop/mobile Chromium and six real WebKit Shopping checks                                                   |
| Preflight, documented command audit, database config, secrets and production dependency audit | Passed; existing reviewed browser-only React Router RSC advisory exception                                                       |

All database/API data was synthetic and local. The local CLI launcher tried writing to a read-only home directory; preflight used the installed pinned 2.109.1 Go binary via `SUPABASE_CLI_BINARY_OVERRIDE`. Local API tests used explicit loopback configuration. A repeated HTTP run initially collided with the existing suite's retained recipe fixture; a clean synthetic reset passed all five tests. No production retry/reset was performed.

Initial browser work exposed and fixed 200% text overflow. A full run on local port 4190 passed 44 Chromium checks but WebKit refused that restricted port before loading any app code. The final run uses port 4191. Local WebKit uses extracted runtime libraries; only the host-dependency preflight is bypassed, not browser execution. CI installs its normal browser dependencies. No assertions were removed to pass validation.

## Hosted preview and manual verification

Authenticated hosted preview and physical-device/screen-reader checks remain unperformed. A Vercel build or shallow public deployment smoke is not functional acceptance. With authorised synthetic accounts and the migrated preview schema:

1. As owner, change Settings default to Next 3 planned meals and open Shopping with Household default selected. Verify the right planned contributions and unchanged manual/bought items.
2. Select Full active week; it applies without Apply. Change the Settings default to Next 5: the current explicit week override persists. Select Household default to follow the new preset.
3. Choose Custom dates; only then show date inputs. Save a valid interval, test invalid dates and restore the default.
4. Use a second member to confirm shared current selection, readable default and owner-only default editing. Switch households and verify isolation.
5. Test narrow phone, enlarged text and keyboard, offline/error retry, bought/unbought, explicit quantity and (once accepted) CS-98 put-away. Check week rollover with synthetic dates locally.

## Accessibility, security, privacy and cost

Native labelled selects, keyboard interaction/focus, status/error feedback, mobile overflow and automated axe are covered. Automation is not full WCAG or physical Safari/VoiceOver proof. Existing RLS protects settings and current periods; owner/member/unrelated/inactive/anonymous database cases pass. No credentials, real data, production configuration or paid evaluation used. Staged content is scanned before commit. No new dependency/provider; incremental cost A$0/month and A$0/year.

## Rollback and deferred work

Prefer a forward fix. Retain the additive Settings column and existing shopping records. The old client does not understand current-period kind `default` and would fall back to its old week behaviour; a UI rollback therefore does not preserve the new preference semantics without a reviewed compatibility fix. Never delete purchases, history or retained overrides to roll back presentation.

Home redesign, other MVP scope, production release, paid enrichment and broader beta acceptance are deferred. This follow-up needs owner visual acceptance and authorised hosted verification before completion; it does not start another milestone.
