# CS-102 handover: measured food through the household loop

- **Date:** 2026-10-07
- **Branch:** `feat/cs-102-quantity-loop`
- **Target/baseline:** `main`, `3e3c53b496912d27b746098b5600db60aad701a4`
- **Package:** `engineering/ready/cs102-quantity-loop.md`
- **Status:** Local implementation and verification; external publication awaiting explicit approval. No merge, deployment, production write or paid evaluation.
- **Package commit:** `92164ab`, pushed to `docs/cs-102-quantity-loop-package`. Draft PR creation was rejected by automatic approval review: the available user instruction prohibits PRs and later authority could not be verified. No PR was created; no workaround attempted. Implementation has not been pushed.

## Objective and product impact

Buy the shortfall, put actual groceries away once, then mark a meal Done once. Undo returns the recorded food rather than recalculating a changed recipe. The owner-approved low-input contract uses shared ingredient recognition, prefilled quantities and one batch confirmation. Unknown quantities do not create mandatory forms or a household stocktake. This supports saving time, mental load, food waste and grocery spend.

## Implemented behaviour

- Shopping uses one household-scoped database snapshot of retained demand, Pantry and purchases. It allocates known compatible balances once, in meal date/type/id order, before projecting the chosen period. Historical plans before the active week do not reserve current stock. Manual entries and explicit overrides remain user intent. Purchased amounts remain history.
- Buying stores actual confirmed measures and immutable source provenance. Pending purchases cover demand once. Their recorded usage follows them through cooking before put-away: only the remainder is transferred. Source refresh cannot offer the same purchase through the legacy availability-only route again.
- Put-away recognises existing Pantry items and preselects ordinary rows without opening text fields. Change is optional. Known metrics and counts are summed exactly. An unknown previous Pantry total becomes a clearly labelled lower bound after a measured receipt, not an invented total. Mixed measured/unmeasured purchases preserve a known minimum. Optional current-count edits can clear uncertainty; availability toggles and partial adjustments preserve it.
- Plan has one Done/Undo button and a secondary menu. Empty photo placeholders are removed; useful images remain. Keyboard drag alternatives, Escape/focus handling and labelled touch targets remain. At enlarged text, the narrow layout moves controls below the title; a minimum title width is tested alongside overflow. Known recipe usage is deducted from Pantry first, then pending purchases. Unknown ingredients record an untracked note without blocking Done. Manual meals infer no consumption. Freezer meals consume reserved portions, without raw ingredient deductions.
- Completion, stock effects and operation receipt commit atomically. Exact request retries return the existing receipt. Expected plan/stock/recipe versions reject stale changes. Undo resolves immutable effects to their current holder, including Pantry after put-away, and adds the inverse delta. Later stock changes require review. Moves do not consume again; completed source changes require Undo; deletion retains receipts without restoring food.
- Existing consumed freezer plans are synchronised without another deduction. New legacy consume/undo commands return a refresh conflict, while exact historical operation retries remain valid.

## Key implementation locations

| Area                                   | Files                                                                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and exact quantities          | `src/domain/recipes/ingredientStructure.ts`, `src/domain/pantry/stockQuantities.ts`                                                                       |
| Demand allocation                      | `src/domain/shopping/stockAllocation.ts`, `src/domain/shopping/period.ts`, `src/infrastructure/shopping/supabaseShoppingRepository.ts`                    |
| Put-away                               | `src/domain/shopping/putAway.ts`, `src/routes/shopping/ShoppingPutAway.tsx`                                                                               |
| Completion                             | `src/domain/meal-plans/completion.ts`, `src/routes/meal-plans/MealCompletionAction.tsx`, `src/infrastructure/meal-plans/supabasePlannedMealRepository.ts` |
| Compact Plan and honest Pantry amounts | `src/routes/PlanPage.tsx`, `src/routes/PantryPage.tsx`                                                                                                    |
| Backend lifecycle                      | The three migrations listed below; pgTAP0045 and `scripts/http/quantity-loop.test.mjs`                                                                    |
| Browser-to-database journey            | `tests/e2e/quantity-loop.spec.ts` and its local-only fixture                                                                                              |

The ingredient grammar correction preserves the existing v1 structure schema and original text. Recipe consumers re-derive the display projection; no public recipe data is rewritten.

## Migrations and release

Apply in timestamp order, under the existing owner-approved maintenance/release workflow:

1. `20261007105512_quantity_loop.sql`
2. `20261007112305_measured_purchase_transfer.sql`
3. `20261007114403_stock_lifecycle_commands.sql`

Edge Functions: none. Incremental provider cost: A$0/month and A$0/year. Balances remain authoritative; narrowly scoped immutable operation receipts are not a replacement event-sourcing architecture. Active household members can SELECT receipts but cannot write them directly. Anonymous and foreign-household operations are denied. Security-definer commands have empty search paths, explicit grants and caller-derived identity. Public recipe mutation authority is unchanged.

Release is maintenance → approved merge → protected Production database release at the exact approved main SHA, checking migration history/pending set and dry-run → Edge only if required → reopen. No extra staging or zero-downtime gate is introduced. Hosted release is not authorised here. Preserve balances and receipts if reverting the UI; do not re-enable an old independent freezer consumption path. Released migration corrections must be forward fixes.

## Verification and action counts

The local evidence directory is `/workspace/cooksmith-review/cs102`. PostgreSQL17/PostgREST14.5 contain synthetic data only. No real household data, auth email or AI/provider evaluation is used. The real-repository browser fixture injects only a short-lived synthetic local token at runtime; it rejects hosted endpoints.

| Synthetic journey                             | Required food-entry actions                                       | Exceptions                                                            |
| --------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| 200g already owned, buy400g, cook600g         | Buy1; open put-away1; batch confirm1; Done1; Undo1; text entries0 | 0                                                                     |
| Unknown recipe amount after the known journey | Done1; Undo1; extra confirmation0                                 | 1 ingredient reported untracked; no fabricated stock change           |
| 600g +400g generated demand, 500g on hand     | Automatically shows500g shortfall before purchase                 | No stock allocated twice                                              |
| Cook before put-away; Undo after transfer     | Transfer remainder; review changed holder once before Undo        | Current Pantry receives recorded amount only                          |
| Legacy identity corpus                        | 9 of9 names recognised without mandatory text editing             | Grammar/product distinctions retained; not a real-user exception rate |

The browser journey checks actual database quantities and completion state, not just a toast. It covers mobile320px,200% text, keyboard menu focus and axe. Full evidence counts and commands are recorded in the accompanying CS102 verification report.

## Limitations and smallest remaining release scope

1. Obtain explicit authority to publish the package/implementation draft PRs and update Jira; then run exact-head CI. Automatic approval review blocked PR creation. Keep the story out of Done.
2. Review the draft implementation and the required three-migration release as one quantity-loop change. Do not deploy partial UI/RPC combinations.
3. Retain hosted/manual release checks for email delivery and reset templates, cross-browser auth recovery, household invitation/onboarding, and authenticated Get Ahead rendering/cache/fallback. Public deployment smoke and historical acceptance scores are not functional proof. These were not newly established by this local change.
4. Obtain owner visual acceptance and a physical-phone check of the compact Plan flow. Browser emulation is evidence, not a physical-device claim.

No automatic serving scaling, density/pack-size guesses, snack/waste/substitution logging, Home redesign or provider expansion. These are outside this change. Optional Pantry corrections remain the way to reconcile real-world drift. Home polish stays last.
