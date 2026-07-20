# CS-38 Week Plan Generation — Handover

- **Date:** 2026-07-20
- **Branch:** `feat/cs-38-week-plan-generation`
- **Target:** `main`
- **Baseline:** `b8e85433b32959488e32113abb04f68f6a5c9899`
- **Status:** Ready for review; hosted validation pending

## Reviewer outcome

Verify the same **Plan my week** review opens from Recipes and Plan; each run reshuffles recipes; search permits repeated meals; review rows can be reordered and replaced individually; Plan can replace one existing dinner; partial weeks preserve occupied dinners; and Apply updates Planner plus Shopping only after review.

## Preview checklist

- From Recipes, propose the current household-local week, cancel and confirm no writes.
- From a partially planned visible week in Plan, replace or remove one proposal and Apply; confirm occupied days remain unchanged.
- On a full week, choose **Plan next week** and confirm Cooksmith does not silently skip another full week.
- Start **Replace this week**, cancel its confirmation, then confirm replacement and verify only the selected week's dinners change.
- Exercise too few recipes and an uncertain/recoverable failure with synthetic data.
- Check 320px and desktop layouts, keyboard focus/return, accessible names and representative screen-reader announcements.

## Release and recovery

No migration or Edge Function release is required. Merge only after required CI and hosted Preview checks pass. To roll back, revert the application commit; existing planned meals and Shopping contributions remain ordinary records. A failed Apply can be retried because the flow re-reads the selected week and CS-22 reconciliation is idempotent.

## Deferred work

Paid AI, preference modelling, pantry consumption, retailer ordering, nutrition optimisation and multi-week generation remain outside CS-38.
