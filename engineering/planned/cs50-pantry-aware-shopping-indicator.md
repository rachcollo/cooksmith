# Engineering Package — CS-50: Show When Shopping Items May Already Be in the Pantry

## Metadata

- **Milestone:** M11C
- **Title:** Show When Shopping Items May Already Be in the Pantry
- **Jira issue:** CS-50
- **Epic:** Shopping Lists (CS-6)
- **Status:** Planned
- **Branch:** `feat/cs-50-pantry-aware-shopping-indicator`
- **Depends on:** CS-14, CS-21 and CS-22
- **Blocks:** None
- **Package path:** `engineering/planned/cs50-pantry-aware-shopping-indicator.md`

## Product Outcome

While reviewing the household shopping list, a user can see a small **May already have** label when an active pantry item is a strong, explainable match for something on the list. This prompts a quick check before buying without pretending Cooksmith knows the pantry quantity or suitability with certainty.

The feature supports **Reduce food waste**, **Reduce grocery spend**, **Reduce mental load** and **AI works quietly in the background** without requiring AI. It removes the effort of manually cross-checking two screens while protecting household trust: the indicator offers guidance only and never mutates the shopping list or pantry.

## Current Baseline

The implementation agent must verify these statements against the latest remote `main` before this package moves to Ready or product code changes:

- CS-14 provides active household-scoped pantry items and their existing normalised names, quantities, units, storage locations and lifecycle behaviour.
- CS-21 provides one active household shopping list with manual add, edit, complete, restore and remove behaviour.
- CS-22 owns automatic shopping contributions from recipe-linked planned meals and the reconciliation rules that preserve manual user intent.
- Shopping and pantry repositories use authenticated active-household boundaries and RLS.
- Existing matching or normalisation helpers may differ between the two domains; this package does not assume they are interchangeable until inspected.
- Pantry records are not guaranteed to prove usable stock. Missing or stale quantity information means Cooksmith may only suggest that an item should be checked.
- CS-23 covers pantry reconciliation or consumption and CS-24 covers broader pantry intelligence. Neither is part of this indicator.

If the package, Jira or current `main` materially disagree, stop and align the contract before implementation.

## Scope

### Included

- Compare active shopping-list items with active pantry items in the same household.
- Use deterministic, versioned and explainable name matching.
- Show an unobtrusive **May already have** label only for strong matches.
- Apply the same guidance to manual and meal-generated shopping items.
- Refresh the indicator after relevant shopping or pantry mutations.
- Provide progressively disclosed match context sufficient for the user to verify the suggestion.
- Preserve existing shopping and pantry behaviour, authorisation and mobile layout.
- Cover positive, negative, ambiguous and cross-household cases.

### Explicitly Out of Scope

- Automatically removing, suppressing, completing or reducing a shopping item.
- Automatically decrementing, reserving or consuming pantry stock.
- Claiming that the household definitely has enough of an item.
- Quantity sufficiency calculations, unit conversion or package-size reasoning.
- Fuzzy, semantic, embedding, LLM or third-party matching.
- Learning from user choices or persisting household-specific aliases.
- CS-23 pantry reconciliation/consumption and CS-24 broader pantry intelligence.
- Grocery substitutions, retailer data, price comparison or expiry recommendations.
- Changing CS-22 contribution aggregation or provenance.
- New dependencies, providers, background jobs or paid services.

## Functional Requirements

### FR-1 — Match within the active household only

The indicator must compare the current household's active shopping items only with the same household's active pantry items.

**Acceptance criteria**

- [ ] A shopping item is never compared with archived, deleted or inactive pantry records.
- [ ] Pantry data from another household cannot affect match state, labels, counts or error behaviour.
- [ ] An inactive member, unrelated user and unauthenticated caller cannot obtain pantry match results.
- [ ] Switching active household refreshes the shopping list and match state together without showing stale results from the previous household.
- [ ] Client-supplied household or pantry identifiers are not trusted as authorisation.

### FR-2 — Use deterministic strong matching

Initial matching must favour precision over recall so uncertain similarities do not create misleading guidance.

**Acceptance criteria**

- [ ] Exact matches after approved case, whitespace and punctuation normalisation produce a strong match.
- [ ] Approved singular/plural equivalence may produce a match only through a small documented rule set with regression tests.
- [ ] Quantity text, preparation descriptors and units are removed or retained only through explicit documented rules.
- [ ] Substring coincidence alone does not match materially different items, such as “rice” and “rice vinegar”.
- [ ] Brand, variety, form and preparation differences that could affect suitability remain non-matches or ambiguous unless an exact safe rule exists.
- [ ] Matching returns an explicit state such as `match`, `no-match` or `ambiguous`, rather than a hidden confidence number.
- [ ] The same inputs and normalisation version always produce the same result.

### FR-3 — Present guidance without overstating certainty

A strong pantry match adds a small **May already have** label to the shopping item.

**Acceptance criteria**

- [ ] The visible wording is exactly **May already have** unless product review approves a clearer equivalent.
- [ ] The label does not state “In pantry”, “Enough in pantry” or another definitive claim.
- [ ] No-match and ambiguous results add no label or unnecessary placeholder.
- [ ] The label is textually available to screen readers and does not rely on colour or an icon.
- [ ] The shopping item's primary name, quantity, source and completion state remain visually dominant.
- [ ] The label does not obstruct edit, complete, restore or remove actions.

### FR-4 — Let the user verify the suggestion

The user must be able to inspect why Cooksmith suggested a pantry check without navigating through a complex workflow.

**Acceptance criteria**

- [ ] Activating or focusing the guidance reveals the matched pantry item name and available quantity/unit only when those fields are already present and authorised.
- [ ] Missing quantity is described honestly, without inventing “1” or implying sufficient stock.
- [ ] Multiple strong pantry candidates are disclosed without selecting an arbitrary quantity as authoritative.
- [ ] Match detail is progressively disclosed and does not permanently expand every shopping row on mobile.
- [ ] Closing the detail returns focus predictably to the initiating control.
- [ ] Match context does not expose private notes or unrelated pantry metadata.

### FR-5 — Preserve all shopping and pantry state

The feature is read-only guidance.

**Acceptance criteria**

- [ ] Rendering, opening or dismissing the label never writes to shopping or pantry records.
- [ ] A match never changes shopping quantity, unit, completion, suppression, provenance, category or position.
- [ ] A match never changes pantry quantity, unit, lifecycle or storage location.
- [ ] Manual and CS-22-generated shopping items remain editable, completable, restorable and removable through existing behaviour.
- [ ] Removing or editing one record triggers only the existing domain mutation plus match refresh; no extra reconciliation is inferred.
- [ ] Failure to calculate matches does not block loading or using the shopping list.

### FR-6 — Refresh after relevant changes

Match state must follow authoritative pantry and shopping data without requiring a page reload.

**Acceptance criteria**

- [ ] Adding, editing, archiving, restoring or removing a pantry item refreshes affected indicators.
- [ ] Adding, editing, completing, restoring or removing a shopping item refreshes its indicator as applicable.
- [ ] CS-22 meal-driven add, recipe swap and meal removal reconciliation refreshes generated-item indicators.
- [ ] A failed mutation retains the last confirmed UI state and does not fabricate a new match.
- [ ] Concurrent changes resolve to the newest authoritative read according to existing cache/query conventions.
- [ ] Refresh is bounded and does not introduce one pantry request per shopping row.

### FR-7 — Degrade safely

Pantry matching is helpful enhancement, not a prerequisite for shopping-list use.

**Acceptance criteria**

- [ ] While match data loads, shopping items remain visible and usable without a misleading placeholder label.
- [ ] A matching-query failure leaves the shopping list usable and exposes a calm non-blocking recovery message only when useful.
- [ ] Retry does not duplicate rows, labels or announcements.
- [ ] Empty pantry and empty shopping-list states remain correct.
- [ ] No-match is distinguishable internally from matching unavailable, while both avoid false guidance.

## UX and Interaction Requirements

- Keep the shopping item name and quantity as the primary content.
- Use a quiet secondary badge or text treatment that fits the compact mobile row.
- If the label opens detail, use an existing accessible popover, disclosure or dialog pattern appropriate to mobile; do not create a hover-only tooltip.
- Maintain at least a 44 by 44 CSS-pixel target for any interactive disclosure control.
- Do not add a confirmation, mandatory pantry check or extra field to shopping quick-add.
- Announce match availability at most once when a row meaningfully changes; avoid repeated live-region noise during list refresh.
- Preserve visible focus, keyboard order, reduced-motion preferences and layouts without horizontal overflow at 320 CSS pixels.
- Completed shopping items may retain the label if existing completed-row design can present it calmly; do not alter completion semantics solely for this feature.

## Data and Domain Requirements

- Define a shared, framework-independent normalisation result that preserves original display text and records the matching-version identifier.
- Prefer matching at a typed application/query boundary that receives already-authorised shopping and pantry records.
- Do not copy all pantry data into client-global state or persist derived match results unless a measured performance need and invalidation design justify it.
- If matching is performed server-side, derive the active user and household authoritatively and return only the minimum matched fields needed for guidance.
- If matching is performed client-side over separately authorised reads, verify both datasets use the same active-household boundary and cannot leak across cache keys.
- Use set-based comparison or a precomputed in-memory index for the loaded household; do not query once per shopping item.
- Treat quantity as display context only. Do not compare sufficiency or convert units.
- Ambiguous matches must be represented explicitly and must not render the label.
- Matching changes that could alter prior results require a version change and regression fixtures.
- A database migration is not expected. If implementation proposes stored aliases, trigram indexes, derived columns or functions, stop for explicit scope review rather than silently expanding the package.

## Technical Direction

- Reuse existing pantry and shopping query/cache conventions.
- Extract the smallest deterministic matcher into the domain layer with table-driven tests.
- Keep normalisation conservative: Unicode/case normalisation, trim/collapse whitespace and explicitly approved punctuation or plural rules only.
- Maintain a documented list of descriptors, units or tokens only when removing them cannot create unsafe equivalence.
- Prefer false negatives to false positives in the first release.
- Return matched pantry identifiers and safe display context, not a boolean detached from its evidence.
- Memoise or index comparisons by normalised name within the current authorised dataset if needed; avoid speculative caching infrastructure.
- Keep matching failures isolated from core shopping queries where the architecture permits.
- Do not add fuzzy-search, NLP, date, state-management or notification dependencies.

## Implementation Guidance

1. Confirm CS-14, CS-21 and CS-22 are Done, merged and released as required.
2. Confirm Jira has moved CS-50 to Ready and add `codex-ready` only after dependency and package review.
3. Move this package from `engineering/planned/` to `engineering/ready/` and update the engineering index.
4. Inspect pantry/shopping schemas, repositories, query keys, normalisation helpers, row components and tests.
5. Write a reviewed matching decision table covering strong, no-match and ambiguous examples before implementation.
6. Implement the pure matcher and authorised set-based match query/application service.
7. Add the label and progressively disclosed evidence without changing shopping mutations.
8. Add refresh invalidation for pantry, manual-shopping and CS-22 reconciliation changes.
9. Run the complete mandatory validation suite.
10. Validate the hosted Preview journeys below using two synthetic households.

## Matching Decision Table Required Before Build

At minimum, implementation fixtures must settle these examples using actual Cooksmith ingredient/pantry conventions:

| Shopping text | Pantry text | Expected initial state | Reason |
|---|---|---|---|
| Milk | milk | Match | Case-only difference |
| Brown onions | brown onion | Match only if approved plural rule is exact | Conservative singular/plural |
| Rice | rice vinegar | No match | Different ingredient |
| Coconut milk | coconut cream | No match | Different product |
| Diced tomatoes | tomatoes | Ambiguous | Form may matter |
| 2 x 400 g tomatoes | tomatoes | Match only if quantity/package stripping is proven safe | Quantity is not identity |
| Chicken stock | chicken stock cubes | Ambiguous | Form and use may differ |
| Plain flour | self-raising flour | No match | Functionally different |
| Extra virgin olive oil | olive oil | Ambiguous | Variety difference |
| Garlic cloves | garlic | Ambiguous until an approved equivalence exists | Unit/form difference |

The product owner may refine this table before Ready. The build agent must not loosen ambiguous cases merely to increase label frequency.

## Security and Privacy

- Require authentication and active household membership for all underlying reads.
- Key caches and derived match state by active household; clear or invalidate on household switch.
- Reject forged shopping-list, shopping-item, pantry-item and household identifiers at authoritative boundaries.
- Preserve existing RLS and least-privilege grants.
- Do not return pantry notes, cost, ownership metadata or unrelated items in match responses.
- Do not log household inventory, recipe ingredients, shopping contents, user identities or raw query payloads.
- Use synthetic, clearly separate household fixtures for security evidence.
- Add negative tests proving another household's exact-name pantry item cannot create a label or observable count/timing response.

## Accessibility

- **May already have** is exposed as meaningful text associated with the correct shopping item.
- Any disclosure control has a contextual accessible name such as “Check pantry match for milk”.
- The label and match state do not rely on colour, position or an icon.
- Keyboard users can open and close details, and focus returns predictably.
- Screen readers receive a concise update only when match state changes.
- Zoom, text resizing and 320 CSS-pixel layouts do not clip the label or shopping controls.
- Automated axe tests supplement manual keyboard and screen-reader validation.

## Test Plan

### Unit tests

- Case, whitespace, punctuation and approved plural normalisation.
- Exact matches and conservative negative/ambiguous decision-table cases.
- Stable matching-version output.
- Multiple pantry candidates.
- Missing quantity/unit display context.
- Archived/inactive pantry records excluded before matching.
- Deterministic results independent of input order.

### Component tests

- Label shown for a strong match and absent for no-match/ambiguous.
- Accessible association with the correct shopping item.
- Match detail shows only approved context.
- Missing quantity language remains uncertain.
- Existing edit, complete, restore and remove controls remain functional.
- Loading and matching failure leave the row usable.
- Keyboard focus and live-region behaviour.

### Integration tests

- Manual shopping item matches active pantry data.
- CS-22-generated shopping item uses the same matching path.
- Pantry add/edit/archive/restore/remove refreshes indicators.
- Shopping add/edit/remove and CS-22 reconciliation refresh indicators.
- Household switch clears prior match state.
- Query failure does not block shopping actions.
- No N+1 pantry reads for a multi-item list.

### Database and RLS tests, if a server/database query changes

- Owner and active-member authorised reads.
- Inactive member, unrelated user and unauthenticated denial.
- Forged household/list/item identifiers.
- Exact-name cross-household pantry record has no effect.
- Grants, RLS, generated-type freshness and migration safety if applicable.

### End-to-end and responsive tests

- Strong match label on a manual item.
- Strong match label on a generated item.
- Ambiguous and unrelated items remain unlabelled.
- Inspect match context and continue normal shopping actions.
- Pantry mutation updates the shopping screen without refresh.
- Switch between two synthetic households without leakage.
- Keyboard-only operation, axe scan and no overflow at 320, 375 and desktop widths.

### Hosted Preview validation

Using two synthetic households with deliberately overlapping item names:

1. Open the exact Vercel Preview URL on mobile and desktop.
2. Add “Milk” to Household A's pantry and shopping list; confirm **May already have**.
3. Inspect the match and confirm only approved name/quantity context appears.
4. Add ambiguous examples and verify they receive no label.
5. Verify manual and CS-22-generated items behave consistently.
6. Edit, archive, restore and remove the pantry match; confirm indicators refresh.
7. Complete, restore, edit and remove shopping items normally.
8. Switch to Household B and prove Household A's exact-name pantry item creates no label.
9. Verify keyboard focus, screen-reader announcement, zoom/text resize and no mobile overflow.

Record the Preview URL, browser/device, synthetic scenarios and actual results in the PR. Do not claim this validation before it occurs.

## Quality Gates

- [ ] `npm run preflight` passes.
- [ ] `npm ci` completes.
- [ ] `npm run format` and `npm run format:check` pass.
- [ ] `npm run docs:commands:check` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Relevant Playwright, responsive and axe suites pass.
- [ ] Database reset, lint, pgTAP, RLS and generated-type freshness pass if the database boundary changes.
- [ ] No secrets, credentials, real household data or environment files are committed.
- [ ] Hosted Preview is manually validated.
- [ ] GitHub Actions and Vercel checks pass on the exact PR head.
- [ ] Jira contains the package path, PR, Preview evidence and current status.

## Definition of Done

- [ ] Deterministic strong matches show **May already have**.
- [ ] No-match and ambiguous items remain unlabelled.
- [ ] Guidance is read-only and never mutates shopping or pantry state.
- [ ] Manual and CS-22-generated items share one matching contract.
- [ ] Refresh, failure and household-switch behaviour are protected by tests.
- [ ] Cross-household pantry data cannot influence match output.
- [ ] No migration or Edge Function release is required, or any later approved impact is explicitly declared and released.
- [ ] Hosted Preview mobile, desktop, keyboard and available assistive-technology evidence is recorded.
- [ ] PR checks and review pass.
- [ ] Completion report and handover record actual evidence and baseline SHA.
- [ ] Jira moves through In Review, Testing and Done at the corresponding delivery events.
- [ ] The package moves to `engineering/completed/` after merge and release verification.

## Release, Rollback and Cost

- **Expected migration impact:** None.
- **Expected Edge Function impact:** None.
- **Production deployment:** Merging implementation to `main` deploys the private MVP application. No Production database release is expected.
- **Rollback:** Revert or disable the derived label/query path. Because the feature writes no match state, rollback does not require data repair.
- **Dependencies:** No new dependency is expected.
- **Recurring cost:** A$0 per month / A$0 per year.

## PR Requirements

PR title: `[CS-50] M11C — Show When Shopping Items May Already Be in the Pantry`

Include the Jira issue, package path, supported Product Principles, user effort removed, matching decision table, migration and Edge Function declarations, privacy/RLS notes, accessibility evidence, automated checks, hosted Preview results, screenshots or recording, limitations, rollback approach and cost impact.
