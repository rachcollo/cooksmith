# CS-103 — Luna useful small preparation

- **Jira issue:** [CS-103](https://smillins.atlassian.net/browse/CS-103)
- **Status:** Ready
- **Branch:** `fix/cs-103-luna-prep-quality`
- **Baseline:** main `f9e76c3f47e1f893545540f25f6dc02d7b4dd3fc`

## Outcome and scope

Correct ambiguity about useful small preparation in the approved Luna prompt without changing food safety, quality thresholds or the evaluation corpus. Keep households out of manual recipe review. No prompt editor (CS-108), bulk Pantry (CS-109), catalogue backfill, activation or paid evaluation.

## Acceptance criteria

- [ ] Clarify small source-backed prep versus trivial handling, realistic grouping with shared setup, canonical prep action versus later serving, and remaining useful meal coverage. Keep no-filler, eligibility, hygiene and storage constraints.
- [ ] Scope prompt additions to Luna; retain legacy requests and low reasoning/token limits.
- [ ] Use distinct weekly profile `weekly-preparation-strategy-v13-luna-low-v2`; old v1 evidence/cache cannot be treated as v2.
- [ ] Forward migration updates only the guarded admin command target, not live settings. Explicit owner action remains required; previous profile is audited and stale smoke cleared.
- [ ] Offline failed-case regressions prove useful grouped decisions pass unchanged validation while empty/omitted coverage remains below quality requirements; keep unsafe and invalid-duration rejection.
- [ ] Diagnose recipe coverage separately, without changing its gate or triggering reprocessing. Record local/CI evidence separately from unperformed hosted model quality.

## Release and cost

New forward migration plus shared/weekly Edge code. Protected Production database and Edge releases must use the exact owner-approved merged main SHA, with database dry-run/history verification. This PR does not deploy Production. Existing released migrations stay immutable. No dependencies or fixed cost increase (A$0/month and A$0/year). No paid calls in implementation; prior total A$0.016612 of A$2 remains. A new bounded hosted run requires the coordinated release/profile transition; no automatic retry or acceptance.
