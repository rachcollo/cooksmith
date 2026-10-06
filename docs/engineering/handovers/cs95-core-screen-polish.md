# CS-95 handover: Home and core-screen polish

- Date: 2026-10-06
- Branch: `feat/cs-95-home-cross-app-polish`, targeting `main`
- Baseline: accepted main `fb8e3e2fd5afd452077696fcea4bfa28a27a7517`
- Status: implemented and locally verified; hosted/manual acceptance pending
- Jira: [CS-95](https://smillins.atlassian.net/browse/CS-95)

## Outcome and implementation

Home replaces the foundation placeholder with this week's plan, next planned meal, grouped Shopping progress and useful Pantry/Recipe actions. New households get clear first steps. Independent plan/shopping reads run together, with partial failure and retry states. Shopping totals explicitly cover all dates rather than implying the selected Shopping period. Data is keyed to user and household; late results from a previous household cannot populate the new view.

Get Ahead links appear for future/current linked recipes when its repository is configured, excluding free-text and prepared freezer meals. Home never calls preparation generation or claims enrichment/checklist readiness. Get Ahead itself retains its existing preparing/unavailable behaviour and source validation. Loading Home cannot trigger paid generation.

Pantry suggestions use “Add to Shopping”, larger centred names and wrapping actions. Recipe detail keeps ingredients, instructions, total time, servings and source/author attribution while removing repeated explanations and empty metadata. Original source links accept only HTTP(S) URLs and disclose opening a new tab. Recipe content, notes-storage behaviour and source permissions are unchanged.

Admin appears in the desktop navigation and mobile account menu only after the existing server-authoritative `isAdmin()` result allows it. The shared hook also drives the direct-route guard, clears stale identity/provider results and fails closed on loading/error. No roles, policies or server permissions change. Existing household collaboration and private/public recipe boundaries remain intact.

Mobile improvements address 320px widths, 200% text, wrapping header/account/navigation content, Pantry spacing, 44px actions and duplicate main landmarks. Product principles supported: calm next actions, low household effort, accessible mobile use and private household context.

## Shopping follow-up requested by the owner

After confirming the PR194/195 functionality worked, the owner reported checkbox outlines displaced between Shopping rows after some edits and asked for smaller boxes. Read-only release evidence confirms Production database release run 37408874990 succeeded for accepted main fb8e3e2 and recorded migration 20261006030557. This is a narrow functionality confirmation, not full beta acceptance.

Shopping now uses a 20px mark in normal button flow with a 44px hit target. WebKit reproduced the checkbox leaving its row after edits; a control run restoring the old automatic grid margins fails the same containment assertion. Explicit grid alignment with zero automatic margins fixes it. A separate WebKit inline-select overflow is contained while retaining a 6px focus-outline allowance. The edit regression verifies exact amount/name text, multiple edits and wrapping names, one contained marker per row, completion changes and equivalence to a fresh render. No stale persisted item value was reproduced. Physical-device acceptance remains separate from Linux WebKit evidence.

The owner then explicitly requested removing the shopper maintenance burden. Shopping no longer renders or invokes Refresh recipe amounts. Normal Plan/Recipe save-time reconciliation is unchanged; opening Shopping/Home/Admin never starts repair. Existing Admin provides an explicitly clicked, contract-labelled repair for its current active household, bounded to 100 meals, with updated/skipped/no-op/failure diagnostics, duplicate-click prevention and no automatic network retry. The UI rechecks the existing server-authoritative admin permission before invoking the existing RPC. The RPC retains its original active-household authorisation for old-client compatibility; it does not gain global admin or cross-household access. This is not a new privileged repair API or exclusive new backend admin grant.

Use this operator action only for older persisted contributions after an ingredient-processing release. Normal new imports and plan/recipe saves use the current pipeline. Recipe adapters supply deterministic structure; provider-only enrichment completion is not a trigger for Shopping repair. Manual choices, bought state, deleted source lines and original public recipes retain their existing protections. No recurring/background job, production repair/backfill, provider activation or new security grant is introduced. After an approved processing release, an authorised admin may repair their own active household and inspect skipped/deferred work; repairing other households in bulk would require separately scoped authority. A versioned automatic job would add work claims, resumable revision bookkeeping and concurrency/failure handling without improving the already-reconciled normal lifecycle, so it is not included.

## Scope, dependencies and integration

No database migrations, Edge Functions, dependencies, provider changes or recurring fees. Cost: A$0/month and A$0/year. Rollback is a normal reviewed application revert.

The owner merged PR195 at 03:25 UTC on 6 October; this branch was advanced to that accepted main before final verification. Its Shopping correctness migration is inherited from main, not introduced or altered by CS-95. Its database release and hosted acceptance remain separate from this polish; CS-95 grants no source write permission.

The combined candidate includes PR189–193, accepted PR194/195 and this polish. Recipe detail overlaps PR190: retain its favourite control/status while removing the redundant metadata and adding the original-source link. No feature controls are dropped. Existing combined resolutions for Shopping period, freezer and put-away remain. Other pending feature migrations predate released PR194; release history/dry-run planning remains separate from this no-migration PR.

## Verification

Standalone verification covers the accepted-main version of CS-95. Combined verification covers the pending candidate described above; exact results and remote checks are reported in the PR. Evidence: `/tmp/cooksmith-review/cs95-final-*` and the combined logs named there.

Eight new integration scenarios cover empty/active Home, grouped progress without generation, partial failure/retry, stale household responses, manual/freezer exclusion, server-approved Admin navigation, error/direct-route denial and identity changes. Four additional core-polish browser checks (two scenarios in desktop/mobile Chromium projects) cover Home → Pantry suggestions → Recipe → Admin, 320px reflow, enlarged text, keyboard/Escape focus, source attribution, minimum action size and axe. Existing route/auth regression tests remain. Shopping adds a multi-edit regression in desktop/mobile Chromium, and the six Shopping cases now also run in WebKit in CI. Six Admin-maintenance integration scenarios cover explicit invocation, diagnostics/no-op, network failure and deliberate retry, permission loss, non-admin exclusion, in-flight click deduplication and abandoning a pending action. Three current/older/noisy Shopping-source cases require no maintenance action or automatic repair.

Existing bundle-size warnings are not changed. Automated Chromium/Linux WebKit and fixture repositories do not prove iOS Safari/Firefox, physical devices, screen readers or hosted authenticated acceptance. Local WebKit initially could not launch due to missing shared libraries; isolated Debian runtime libraries under /tmp allowed the real browser tests to run. CI installs supported WebKit dependencies normally. No repository dependency or system configuration was changed for the local workaround.

### Final local results

| Check                      | Standalone CS-95      | Combined pending candidate |
| -------------------------- | --------------------- | -------------------------- |
| Application tests          | 602 passed / 79 files | 628 passed / 86 files      |
| SQL assertions             | 535 passed / 33 files | 652 passed / 37 files      |
| Browser tests              | 40 passed             | 50 passed                  |
| Real HTTP contract tests   | 3 passed              | 4 passed                   |
| Format, lint, types, build | Passed                | Passed                     |
| Generated database types   | Match                 | Match                      |

Both browser suites include six real WebKit Shopping scenarios. A prior combined run sampled the modal's fade-in during axe and failed transient contrast; accessibility checks now await fonts and finite running animations before measuring, with contrast rules retained. Both complete reruns pass. The old-margin control intentionally fails and demonstrates the regression. No unresolved local test failure remains. Exposed-schema database lint is clean; the combined private schema reports two existing PR193 text-to-array initialisation warnings and no errors. Preflight, documentation commands, database configuration, production dependency audit and secret checks passed. Remote exact-head CI is tracked separately in the PR.

## Hosted acceptance still required

On a separately approved preview/staging environment, use synthetic member/admin accounts and a new/active household. Verify Home's links/counts and partial errors, switch account/household without old content, confirm member Admin absence and direct-route denial, verify permitted Admin entry, and open Pantry suggestions/Recipe details on a small phone and with enlarged text. Confirm Home only reads plan/shopping and does not request Get Ahead generation. Preserve permissions and existing recipe content.

No hosted authenticated session was exercised for this handover. No merge, manual deployment, production data/configuration change or paid evaluation occurred. Vercel preview build/public smoke, if available, is reported separately and is not functional acceptance. Wider beta gates remain open independently of this polish.

## CS-100 boundary

CS-100 remains a read-only catalogue assessment, outside this PR. Forty-five existing public recipes are available, but content presence does not establish a reviewed starter set, measuring conventions, dietary coverage or source/image usage. Public maintenance lacks a complete supported workflow and belongs to a separately approved CS-43 scope. Public import can wake enrichment; no publication or paid reprocessing is included here.
