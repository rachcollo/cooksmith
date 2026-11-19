# CS-111 partial UI primitive foundation

- **Date:** 2026-11-17
- **Branch:** `fix/cs-111-ui-primitives`
- **Target:** `main`
- **Baseline:** `b68832ee2134d53f36c7c910980085eab9fb3086`
- **Status:** Partial foundation, draft for independent review. This is not full CS-111 completion.
- **Package:** [CS-111](../../../engineering/ready/cs111-numeric-fields-and-dialogs.md)
- **Commit, PR and exact-head CI:** Recorded in the draft PR and final delivery report.

## Supervised nested-cancellation repair — 19 November 2026

This dated repair record supersedes the original draft/review status below; the
17 November implementation and verification remain historical evidence.

- Supervisor: Evie recovery coordinator. Sole selected writer for this turn:
  recovery task `6afcd63b-b5f8-8191-8144-97a12829903f`.
- Operative governance: accepted main `4e04bae3a155be1a8e430d10b2c50ae90e1bc8ee`,
  including the supervised serial existing-PR exception. Feature-code baseline:
  `b13e54b025ad0db7f2add534486a842731bab109`, existing PR #231/branch above.
  No main integration or history rewrite was required for this repair.
- Fresh complete paginated GitHub inventory: 240 branches, five open PRs, 481 refs;
  no `cooksmith-builds` lock, claim or receipt refs. External evidence and bounded
  selection record are in `/workspace/cs111-supervised-evidence`; no admission
  or adoption receipt was created. Current Jira CS-111 is In Review, with no
  upstream blockers; its outward Blocks link is CS-122. The package declares no
  dependencies and passes completeness validation (seven acceptance criteria).
- Historical owners and descendants remain unknown. Owner acceptance of this
  concurrency risk is not proof of cessation or exclusive writer fencing.
  CS-110's archive receipt remains limited; the CS-111 archive denial remains
  binding. Scheduler and other pickup remain off. All branches and refs retained.
- Bounded change: stop React synthetic cancel propagation at ModalSurface before
  requesting closure. A genuinely nested ConfirmationDialog now cancels without
  invoking the parent callback, reopening confirmation or discarding its draft.
  Dialog/Sheet tests retain raw `1.` text and focus over repeated Escape and
  Keep editing actions. The browser fixture now nests the confirmation in its
  parent and verifies cancellation, focus, accepted discard and repeated reopen.
- Reproduction: both new Dialog/Sheet nested regressions failed before the fix
  because the confirmation reopened. The six ModalCloseContract tests and two ModalSurface tests pass after it.
  Independent read-only review found no actionable findings in the implementation.
- Final static/browser counts, exact published head/tree, final independent review
  and exact-head CI remain pending until recorded in PR #231. Local preflight was attempted but
  the pinned Supabase CLI was unavailable in this managed filesystem; no local
  database or hosted product validation is claimed. Hosted route adoption remains
  deferred; this synthetic fixture is not a production build entry point.
- No route adoption, numeric redesign, schema, dependencies, hosted settings or
  other PR changes. This repair does not complete all of CS-111. A$0 additional
  monthly/annual cost; no real household data, credentials or live emails used.
  Revert only the repair commit to roll it back. Worker stops editing at handoff;
  coordinator handles any separately authorised merge/release after verification.

## Objective and product impact

Support the principles of saving time, reducing mental load and preserving household control: retain typed amounts and let a parent refuse to discard a draft. Existing Dialog and Sheet callers retain their props. Numeric and confirmation route adoption remains deferred.

## Changes and integration contract

- `ModalSurface`, `Dialog`, `Sheet`: Escape and the close button request `onOpenChange(false)`. Only a change to `open=false` closes the native dialog. The parent may refuse synchronously or open a confirmation and decide later. Synchronous parent decisions are committed with `flushSync` during the native interaction, preserving immediate close behaviour for existing callers without closing before their decision. A programmatic prop close does not emit another request. Queued native `close` events cannot close a reopened surface. Use controlled state, not `form method="dialog"` or direct native `close()` calls.
- `data-autofocus` now takes precedence over the header close button. Focus returns on accepted close or unmount; a guarded microtask handles simultaneous closure of nested confirmations and their parent. A veto leaves the native modal and draft intact.
- `NumericField`: `label`, string `defaultValue`, `onValueChange(result)`, optional `required`, `min`, `max`, `integer`, plus TextField presentation/input props. It owns raw string state; change the React `key` to initialise a different record or reset the draft. Updating `defaultValue` alone does not reset an edit. The callback reports edits, not initial mount or constraint changes.
- `parseNumericFieldValue(raw, constraints)` returns `{ raw, value: number | null, valid, error }`. Invalid input always has `value=null`, never NaN. Blank optional input is valid null. Trims whitespace for parsing, supports decimal/comma, ASCII and Unicode fractions through existing `parseIngredientQuantity`, and rejects incomplete or malformed values and JS-specific exponent/hex syntax. The original string remains displayed. No units or domain limits change.
- Use the same constraints on the field and submit parser. Read the current raw value from `FormData` (provide `name`) or the callback; parse again at submit and run existing domain validation before persistence. Do not persist the last valid value when the current draft is invalid. Native custom validity blocks normal form submission; forms using `noValidate` or custom save buttons must check the parsed result themselves. Preserve existing route limits, integer rules and string length rules, including domain validation for recipe quantity strings. `TextField` now accepts a React 19 input ref for custom validity.
- `ConfirmationDialog`: controlled `open`, `onOpenChange`, `onConfirm`, required `title`, `description`, `confirmLabel`; optional `cancelLabel`, `destructive`, `busy`. Safe cancel action receives initial focus. Cancel, Escape and close request dismissal; only the explicit confirmation calls `onConfirm`. The parent owns async work, errors and closing. Set `busy` while working to disable actions and veto dismissal.

## Files and tests

Shared primitives and parser are under `src/components/ui`. New component/parser regressions are `tests/unit/NumericField.test.tsx` and `ModalCloseContract.test.tsx`; existing builders' tests are untouched. `tests/e2e/ui-primitives.spec.ts` uses a synthetic, test-only Vite fixture under `tests/e2e/fixtures/ui-primitives` without adding an application route or production entry point.

## Verification

Local final evidence:

| Check                                                                                                                           | Result                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm ci --cache /tmp/cooksmith-npm-cache`                                                                                       | Passed; default home cache was read-only                                       |
| `npm run preflight`                                                                                                             | Passed with permission for CLI local cache initialisation                      |
| `npm run format`, `format:check`, `lint`, `typecheck`, `build`                                                                  | Passed; existing large-bundle advisory remains                                 |
| `npm run test`                                                                                                                  | 111 files, 962 tests passed                                                    |
| `npm run docs:commands:check`                                                                                                   | Passed, 209 files                                                              |
| `npm run engineering:check-secrets`, production dependency audit, PR governance, `git diff --check`                             | Passed; dependency audit retains its existing reviewed exception               |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/cooksmith-browsers npm run test:e2e -- --project=chromium --project=mobile-chromium --workers=2` | 56 passed, 2 existing PostgREST-dependent skips                                |
| Full browser command including WebKit                                                                                           | Environment-limited: 12 WebKit launch failures due to missing system libraries |
| Local database/RLS, hosted preview, physical devices, screen readers                                                            | Not run; no database scope or synthetic PostgREST setup                        |

Earlier failures were corrected and the complete Chromium suite rerun: nested focus restoration, immediate-close compatibility, and a test assumption about Tab wrapping through native browser chrome. No existing test was edited. Exact-head CI is recorded in the draft PR, separately from these local results.

Focused tests cover raw intermediate text, invalid-submit blocking, supplied limits, errors, vetoes, controlled save, repeated close/reopen, queued close events, unmount and busy confirmation. Browser checks cover Dialog and Sheet on desktop/mobile Chromium, nested confirm/cancel, keyboard focus, Escape, decimal/comma/fraction save, axe and widths 320/390/768/1280. Screenshots are emitted to Playwright's ignored test-results directory.

Initial verification exposed two issues addressed within the primitive: nested close focus needed restoration after both dialogs left the top layer, and existing immediate-close callers required committing a synchronous parent decision in the request handler. The Pantry regression test was not modified.

## Preview and manual verification

Hosted preview and physical-device/screen-reader checks have not been performed. No deploy is requested. For local synthetic verification run the new Playwright spec with the repository dev server; test-only fixture paths are not built into the production application. For eventual route adoption, verify typed decimals and invalid-save handling in each affected form, refuse discard without draft loss, confirm discard, and reopen repeatedly on desktop and mobile with keyboard and screen reader. Hosted route validation remains part of that later integration work.

## Safety, release and rollback

No migrations, Edge Functions, generated types, dependencies, units, auth, database access, infrastructure or route changes. No live emails, production changes, real household data or data deletion. Cost impact A$0/month and A$0/year. Staged content passed the repository secret scan and whitespace checks. Roll back by reverting this application-only foundation commit; no data rollback is needed.

## Deferred work and readiness

All numeric route adoption and every `window.confirm` replacement remain deferred, including Shopping, Recipes, Planner, Pantry, Freezer and Settings. Coordinate those changes with CS-112, CS-113, CS-116 and CS-107 owners. Do not claim full CS-111 delivery, mark Jira Done, enable scheduled pickup, merge, deploy or release this draft. Keep the foundation unmerged for independent review.
