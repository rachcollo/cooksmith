# CS-79 Shopping quantity precision: local preparation

- Date: 2026-11-22
- Branch: `fix/cs-79-shopping-quantity-precision`
- Accepted main and adopted policy merge: `cb16bfd507a6e6b5b8b05ffd5fc831acccefe2c0` (#239)
- Target: `main`, only after separate publication authority
- Status: local implementation; exact-tree review and final check results recorded in the external handoff report. No feature PR, merge or release.

## Authority and admission

Rach approved the separate quantity correction and accepted policy #239. Evie
recovery coordinator selected only recovery session
`6afcd63b-b5f8-8191-8144-97a12829903f` for this local turn. Ordinary, scheduled and
parallel pickup remain frozen; no atomic claim, exclusive fence or historical
worker cessation is asserted. Prior denied actions remain binding.

Fresh pre-edit inventory recorded 242 branches, four open PRs and 484 refs, with
no build lock/claim/receipt refs. The four feature heads were unchanged. CS-79
remains In Review; its declared CS-22 dependency is Done, as are CS-22's declared
CS-20/CS-21 dependencies. Raw Jira link 10011 says CS-25 blocks CS-22, but CS-22's
package and description explicitly put CS-25 downstream. CS-25 comment 10926
identifies the reversed links and intended direction. Independent read-only review
corroborated that reconciliation; no transitive waiver, link edit or status change
was made. CS-25 remains the downstream beta gate.

## Objective and product impact

Keep shopping amounts trustworthy: typing or pasting `0.004` must not turn it
into `4`, and a small nonzero amount must not silently become stored/displayed
zero. This removes correction work without guessing conversions or prior data.

## Changes

- Shopping add, inline and combined edit drafts retain raw text. The existing
  numeric parser runs at submit; incomplete input and numeric underflow retain
  the draft and show readable validation. Exact combined editor values are not
  initialised from rounded presentation values.
- Manual persistence validates the existing `numeric(10,2)` representation.
  Existing exact kg/g and L/ml aliases rescue otherwise unrepresentable values:
  `0.004 kg` becomes `4 g`, `0.004 L` becomes `4 ml`. Ordinary representable input
  retains its unit. Remaining excess precision is rejected instead of silently
  rounded; this includes fractional manual amounts not representable to two
  decimals. Blank/null and explicit zero remain distinct.
- Positive recipe demand below `0.01` after same-meal aggregation uses the existing
  nullable amount with unchanged source evidence. Existing grouping reconstructs
  source demand for display. Formatting never rounds genuinely positive demand
  to zero. No density, measure convention or catalogue entry is added.
- Period projection retains remaining per-contribution amounts separately from
  original source evidence. Mixed tiny and ordinary demand cannot reintroduce
  stock-covered ordinary quantities when the tiny row uses source fallback.
- Current-client create/combined-update adapter boundaries enforce manual
  validation. Household IDs, item IDs, explicit opt-in, overrides and receipt
  provenance retain their existing paths.

## Files and components

ShoppingPage, Shopping quantity precision/schema, plan generation, period/types
projection, purchase formatting, Supabase Shopping adapter, focused unit/component/adapter/browser
regressions and `0050_shopping_quantity_precision.test.sql`. No shared numeric
component redesign, schema, migration, generated types, dependencies or provider
configuration changes.

## Verification

Local preflight and pinned `npm ci` completed. Focused UI/domain/adapter tests
cover typing/paste, incomplete and tiny drafts, ordinary edits, reopen, aliases,
combined overrides, exact source demand, repeated generation and legacy non-repair.
The full local static suite and browser run outcomes are recorded against the
final tree in the external handoff report, not inferred from earlier PR CI.

Real disposable PostgreSQL at a separate local project applied accepted migrations
and passed database lint, 44 pgTAP files / 785 assertions, including precision
reconciliation, source IDs on retry, receipt JSON/undo, explicit overrides and
cross-household denial. Generated types match the committed schema. SQL fixtures
exercise real database functions and RLS; they are not an authenticated browser/API
round-trip. Adapter tests intercept HTTP and UI/browser fixtures use synthetic
repositories; those prove client behaviour, not real persistence.

Initial full-stack startup exhausted disk space while a browser container ran.
Three unrelated Chromium cases failed with zero temporary-space browser errors.
The task stopped its own failed startup, preserved existing volumes/work, and
used sequential lean PostgreSQL and browser execution. No provider settings or
security controls changed. Final results and any remaining limitations accompany
the exact reviewed tree. Hosted auth, real household data, paid processing and
production access were not used.

## Review and release limits

No remote CI or hosted preview exists for this local payload. Publication needs
separate explicit approval, fresh inventory/head/ref checks, remote-tree equality
and exact-head required quality/governance. Product/hosted acceptance and protected
release remain required. Other PRs and their gates are untouched.

This is a current-client correction, not an all-writer server invariant: old or
direct clients can still send decimals that PostgreSQL coerces. Stored legacy zero
is not automatically restored; no rows are backfilled or rewritten. Recipe null
amounts conservatively avoid claiming measured stock coverage. Sources and receipt
JSON retain precision, but arbitrary-precision stock support is outside scope.

Accessibility checks cover labels, associated errors, keyboard/reopen, 320px and
browser axe where exercised. Physical devices and assistive technology remain
manual checks. No credential or real-data fixtures are added. Cost: A$0/month and
A$0/year. Secret scan results are recorded at handoff.

## Rollback and next action

Revert the scoped application correction if necessary; there is no migration or
legacy-data rollback. Do not guess quantities lost by old clients. Review the exact
local payload, then decide separately whether to publish it for GitHub CI. Do not
start another repair or treat this as CS-79 acceptance or Jira Done.
