# CS-102 local verification and beta finish scope

## Assessment

The measured quantity loop is implemented locally. The release is **not yet signed off**: owner visual acceptance and the existing hosted/manual authentication and Get Ahead gates remain. Exact-head CI is recorded on the implementation PR. No production configuration/data changes, merge, manual deployment or paid evaluation occurred; opening the draft PRs runs the repository’s existing preview automation.

The source baseline is `main` at `3e3c53b496912d27b746098b5600db60aad701a4`. Package draft [PR199](https://github.com/rachcollo/cooksmith/pull/199) contains the package/ADR/audit commit `92164ab`. Implementation branch `feat/cs-102-quantity-loop` targets main; its draft PR records the exact head and CI results. See the [handover](../handovers/cs102-quantity-loop.md) for behaviour, migrations and the release sequence.

## Baseline local evidence before the correction follow-up

Logs are in `/workspace/cooksmith-review/cs102`.

| Check                                                       | Result                                                               | Evidence                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Format, ESLint, TypeScript, Vitest, production build        | Passed;658 tests in90 files                                          | `static-final.log`                                            |
| Fresh migration replay and all pgTAP                        | Passed;669 checks in38 files                                         | `database-final.log`                                          |
| Database function lint                                      | Passed; no schema errors/warnings                                    | `database-lint.log`                                           |
| Generated database types                                    | Fresh CLI output matches checked-in file after repository formatting | `/tmp/cs102-types-final.ts`, `/tmp/cs102-types-normalised.ts` |
| Real local PostgREST HTTP suite                             | Passed;11 tests                                                      | `full-http-final.log`                                         |
| Final Plan reflow regression                                | Passed;8 desktop Chromium/WebKit checks plus4 mobile Chromium checks | `plan-reflow-final.log`, `mobile-plan-final.log`              |
| Full Playwright suite                                       | Passed;56 checks before final narrow-layout adjustment               | `full-browser-final.log`                                      |
| Additional WebKit planner, put-away and quantity journeys   | Passed;3 supplementary checks                                        | `webkit-final.log`                                            |
| Preflight                                                   | Passed with pinned CLI binary override                               | `preflight-current.log`                                       |
| Database config                                             | Passed;70 migrations                                                 | `database-config.log`                                         |
| Documentation commands                                      | Passed                                                               | `docs-commands.log`                                           |
| Tracked secret/environment scan                             | Passed                                                               | `secrets.log`                                                 |
| Production dependency audit                                 | Passed with repository-reviewed non-RSC React Router exception       | `dependency-audit.log`                                        |
| Engineering package readiness                               | Passed;9 acceptance criteria                                         | `engineering/review/cs102-quantity-loop.md`                   |
| Exact-head hosted CI/preview                                | Baseline head b5048d7: all9 quality jobs passed                      | GitHub run37623780640                                         |
| Hosted auth/email, authenticated Get Ahead, physical device | Not run in this local change                                         | Separate release evidence required                            |

The full56-check browser run preceded the final narrow-layout adjustment. All affected Plan/freezer/quantity journeys were rerun on that final layout:8 desktop/WebKit plus4 mobile checks. A title-width assertion now accompanies the overflow check at200% text.

The saved environment uses Node24.19.0/npm11.9.0, pinned Supabase CLI2.109.1, synthetic PostgreSQL17 and PostgREST14.5. The CLI wrapper cannot write its usual home cache; `SUPABASE_CLI_BINARY_OVERRIDE` points to the installed pinned binary. Type generation and database lint use the localhost55432 URL with `PGSSLMODE=disable`. Despite the CLI saying “remote database”, the target is the local synthetic container. Browser binaries are in `/tmp/cooksmith-browsers`, with installed WebKit libraries supplied through `LD_LIBRARY_PATH`. Vite runs on local port4193. No hosted credential is committed or required.

## What the HTTP and browser journeys establish

- Demand600g +400g, stock500g: Shopping projects500g, with no double allocation and no deletion of source demand.
- Buy500g, then put away: pending coverage transfers to Pantry once; exact retry changes nothing a second time.
- Pantry200g plus pending500g, cook600g before put-away: Pantry0g, pending100g. Put-away adds100g. Undo after transfer aggregates the recorded600g into that Pantry item, producing700g once.
- Competing Done commands: one200 response and one409; no duplicate consumption. Stale put-away snapshots fail atomically; a fully consumed purchase transfers0g.
- Unknown prior stock plus measured receipt:500g is labelled a minimum. Consuming that floor leaves stock potentially available; a partial adjustment preserves uncertainty. A confirmed current-count edit can clear it.
- Tampered Undo amounts and stale recipe versions are rejected without stock changes. Foreign-household snapshot access is denied. Freezer completion uses the same revision contract and rejects new legacy consumption commands.
- Browser uses real Shopping/Pantry/Plan repositories and real local HTTP, with synthetic authentication. The known case requires buy1, open review1, batch confirm1, Done1, Undo1, and zero text entries. It checks Pantry200→600→0→600 and persisted completion state. The unknown-amount case requires no extra confirmation and leaves quantities unchanged.
- Shared-recognition corpus:9 named legacy/product cases, all recognised without mandatory text edits. This is fixture coverage, not a claimed real-user exception rate.
- Mobile320px,200% text,44px targets, keyboard menu/Escape focus and axe checks accompany the journey. No physical-device claim is made.

## Failures found and resolved during development

Earlier failures are retained in logs rather than hidden:

- Old SQL/freezer tests called the retired consumption route. They now exercise revisioned completion and exact request retries; legacy rejection is separately tested over HTTP.
- An old Undo test constructed mutable Pantry snapshots instead of requesting the recorded-effect review. The new test proves inverse deltas after a later manual balance change.
- Shopping period and put-away expectations were updated for recorded purchase amounts and optional quantity metadata; original unknown/period cases still pass.
- Freezer/planner browser tests tried to click actions now inside the secondary menu. They now open the menu before editing/removing, without bypassing user interaction.
- Visual inspection exposed a200%-text title squeezed into individual letters despite no horizontal overflow. Narrow cards now give the title full width and move controls below it when needed; the final12 affected browser checks pass.
- Mobile/WebKit axe runs sampled recipe/planner dialogs during their entrance opacity transitions. The helper now awaits finite animations before measuring settled colours. The contrast rule remains enabled.
- The HTTP generated-demand fixture initially compared a mixed-case label against the canonical stored name and left contributions for another test. It now uses a unique canonical name, cleans up its plans and derives dates from the active week.

## Minimal remaining finish plan

1. **Review gate:** keep the package and implementation PRs draft until exact-head CI and owner review are complete. CS-102 remains In Review; do not mark Done from a deployment smoke.
2. **Release blockers:** exact-head CI; owner approval of the quantity loop and three migrations; hosted/manual email/reset/recovery and household-invitation checks; authenticated Get Ahead rendering/cache/fallback evidence. A deployment smoke or historical evaluation score is insufficient.
3. **Small finish checks:** physical-phone Plan/Shopping pass; review action counts and uncertain-quantity copy; confirm the independent CS-97 period-default change integrates without replacing its behaviour.
4. **After those gates:** the already agreed private-MVP maintenance/release sequence. Home polish stays last. Defer predictive stock, serving scaling, inferred pack sizes/densities, exhaustive snack/waste logging and provider expansion.

## Put-away correction follow-up

The original optional field said “Amount bought” although the transfer command adds the amount remaining after cooking. That could invite re-entry of the original purchase total. The field now explicitly says “Amount remaining to put away”; the footer explains that only the remaining amounts are added. A row explains already-used stock only when the current remainder is below its immutable original purchase amount. No extra read, schema change or mandatory confirmation was added.

The real local browser journey now also cooks600g from200g Pantry plus500g pending purchase, verifies the100g remainder, opens Change, corrects it to80g, confirms Pantry80g after application and reload, then reviews Undo and verifies680g. This tests an actual remaining-stock correction, not correction of the historical purchase total. Initial runs corrected synthetic setup (duplicate manual-item name) and the navigation locator (Shopping is a button). The completed journey then exposed a real pointer-event defect: the nested Undo dialog started the card drag and intercepted confirmation. Plan now excludes dialog events from drag initiation; the test confirms Undo by pointer. The fixture removes its previous bought row before the second purchase, retaining receipt history.

Exact-head CI for the follow-up is linked on PR200. The prior run is historical evidence, not a claim about a newer head. The default CI browser job still skips the two project instances of this local-database-only journey because its local REST/JWT variables are absent; local Chromium, mobile Chromium and WebKit provide that evidence. Synthetic auth does not prove signup, email, recovery or invitation delivery.

## Acceptance boundaries

- All nine acceptance criteria remain pending owner sign-off. Green counts are evidence, not completed product acceptance.
- Pending stock, remainder transfer, current-balance inverse Undo and immutable provenance have HTTP/SQL coverage. Receipts persist; there is no dedicated browsable purchase-history screen.
- Revisioned freezer Done/Undo is tested against real HTTP. The older freezer browser fixture still exercises a fake legacy command; it is not proof of the new freezer tick against a real backend. Manual/leftover completion deliberately infers no ingredients, without a dedicated real-DB browser Done/Undo journey for each type.
- Move/edit/delete guards and historical freezer compatibility have backend evidence, not exhaustive browser or deployed-history upgrade evidence. Security coverage is not an exhaustive role-by-every-new-RPC matrix.
- Put-away Change edits remaining amount/unit/name. Location is inferred/preserved and corrected separately in Pantry. Editing the original purchase total with automatic reconciliation is not implemented. Unknown stock remains a labelled minimum until an explicit current count is provided; incompatible/missing Undo targets require correction.
- No serving scaling, inferred densities/pack sizes, snack/waste/substitution logging or automatic leftover portions. Physical-phone visual acceptance, last-day reachability, hosted authentication/household invitations and authenticated Get Ahead rendering/cache/fallback remain unverified.

### Correction follow-up validation

- `npm ci` with writable temporary cache, format, lint, type-check, all658 tests in90 files and production build passed. Existing large-bundle warning remains.
- Fresh migration replay and all669 pgTAP checks in38 files passed; all11 real local HTTP tests passed. No migration was changed or added by the correction.
- Full browser rerun:56 passed, including corrected-quantity and pointer-confirmed Undo in desktop/mobile Chromium. Supplemental WebKit planner, put-away and extended quantity journey:3 passed.
- Database function lint passed; fresh types match after applying the repository-generated header and formatting. Preflight uses the pinned `supabase-go` binary override because the CLI wrapper's home directory is read-only. Documentation/configuration/secret checks passed.
- PR199 carries the identical acceptance clarification at `20aca462f528faf367047fe5283a97a81163d44d`. PR200 contains both fixes and this evidence. Their descriptions carry exact-head CI links; neither green CI nor preview build is owner acceptance.
