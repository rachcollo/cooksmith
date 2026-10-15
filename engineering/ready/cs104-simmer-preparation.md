# CS-104 — Preserve simmer preparation through household orchestration

- **Jira issue:** [CS-104](https://smillins.atlassian.net/browse/CS-104)
- **Status:** Ready
- **Branch:** `fix/cs-104-simmer-preparation`
- **Baseline:** `main`, `d8d87c0628165eea27927e5a07daa77a2f4b07de`
- **Depends on:** CS-103 deployed adapters; existing recipe and weekly validation
- **Blocks:** full-chain supported-model acceptance for simmered components

## Outcome and scope

A valid source-linked simmered sauce for tomorrow reaches weekly preparation instead of being discarded with a misleading timing warning. Reuse the existing weekly planner safe-action contract in the household Edge wrapper. Preserve all storage, membership, source and model validation. No new action is added to the domain contract, no model/profile change, no schema migration, and no recipe re-enrichment is required.

## Acceptance criteria

- The actual household request handler forwards a simmer component with its recipe/ingredient/step/storage provenance and returns the worker's plan.
- Unsupported actions and expired storage windows remain excluded before worker invocation.
- Unrelated households remain rejected before recipe loading.
- Regression fails with the former action omission and passes with the shared contract.
- Existing unit/integration, lint, types and build checks pass; hosted deployment remains a separate owner action.

## Release and cost

Migrations: none. Edge Functions changed: get-weekly-preparation-plan only. Shared domain code is already in the Edge bundle. After owner merge, release the approved SHA through the protected production Edge workflow; a frontend preview alone cannot validate this server change. Reuse the retained synthetic sauce enrichment, schedule within its48-hour lead window, and verify model-backed generation, persistence, mobile rendering and cached reopening. Do not backfill the catalogue.

Fixed incremental monthly/annual cost A$0; no paid calls for implementation. Hosted model requests remain within the existing owner-approved A$2 total cap. Model activation and evaluation still require fresh acceptance; this correction does not itself activate Luna.
