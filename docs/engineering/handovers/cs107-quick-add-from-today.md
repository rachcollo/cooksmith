# CS-107 handover: Quick-add starts from today

- **Date:** 2026-11-17
- **Branch:** `fix/cs-107-quick-add-from-today`
- **Target:** `main`
- **Baseline:** `37da4f748ef96c704ef4623c8a18aa656ec5f75f`
- **Status:** Implemented, validation pending
- **Package:** `engineering/ready/cs107-quick-add-from-today.md`

## Objective and product impact

Recipe quick-add starts at today rather than Monday, avoiding past-date meals and
manual corrections. This supports practical, low-effort planning. The existing
42-day search, household-scoped repository calls, meal preservation, shopping
addition and duplicate-submit protection remain unchanged. The chosen date is
visible as well as politely announced through a persistent, atomic live region.

## Changes made

- `src/routes/RecipesPage.tsx`: start at profile-local today; show the confirmation.
- `src/domain/meal-plans/week.ts`: optional IANA timezone for local-date formatting;
  existing callers without a timezone retain device-local behaviour.
- Unit and integration regressions cover midweek gaps, today, full current week,
  full search window, date boundaries, DST, preservation and duplicate submission.
- Playwright regression covers keyboard operation, visible feedback, axe and
  overflow at 320, 768 and 1280 pixels in desktop and mobile Chromium projects.

## Migrations, dependencies and setup

None. No database, Auth, RLS, Edge Function or provider configuration changes.
Profile timezone already exists in onboarding state. When it is absent, the
existing device-local fallback applies. An invalid saved timezone yields the
existing recoverable error path rather than silently selecting a different date.

## Local evidence

| Check                                                   | Result                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `npm ci --cache /tmp/cs107-npm-cache`                   | Passed, 431 packages                                       |
| `HOME=/tmp/cs107-home npm run preflight`                | Passed                                                     |
| `npm run format`, `npm run format:check`                | Passed                                                     |
| `npm run lint`, `npm run typecheck`                     | Passed                                                     |
| `npm run test`                                          | 110 suites, 895 tests passed                               |
| `npm run build`                                         | Passed; existing large-chunk advisory                      |
| `npm run docs:commands:check`                           | Passed                                                     |
| `npm run engineering:check-secrets`, `git diff --check` | Passed                                                     |
| Chromium install / targeted Playwright                  | Pending: CDN returned truncated ZIP; no browser executable |

Initial npm/default Supabase preflight attempts could not write the managed home.
Writable temporary npm cache and HOME resolved those environment limitations.
The managed npm `http-proxy` warning is not a repository change.

## Hosted preview and manual verification

Not yet performed. Keep the PR draft until required CI and hosted checks are
complete. Use a synthetic household only, with profile timezone Australia/Melbourne:

1. Midweek, leave Monday to yesterday empty. Quick-add a recipe: today is selected.
2. Fill today through Sunday: quick-add selects Monday of the following week.
3. Verify existing meals and shopping additions are preserved.
4. Verify the confirmation is visible and announced; the add action is keyboard-operable.
5. Check mobile, tablet and desktop widths with no horizontal overflow.
6. Test near UTC midnight with a profile timezone different from the device.

No real household data was accessed. No hosted auth or production release was
performed. Physical devices and assistive technology remain untested. Database
validation is unchanged and delegated to the repository CI, not claimed locally.

## Safety and rollback

No new permissions, secrets, dependencies, paid services or recurring costs.
Monthly A$0; annual A$0. Revert the application commit to roll back. No migration
rollback is needed. GitHub Actions and Vercel evidence must be recorded on the PR
when available; local checks do not substitute for hosted validation.

## Deferred work

Plan my week past-day targeting is CS-114; choosing a day from recipe cards is
CS-118. Neither is included. CS-118 can follow once this correction is accepted.
