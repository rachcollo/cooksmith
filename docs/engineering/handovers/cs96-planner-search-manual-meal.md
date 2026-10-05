# CS-96 — Planner search and manual meals

Baseline: main `b2fb576ebce250e325df297670d62df18c523339`. Branch: `feat/cs-96-planner-search-manual-meal`. No migrations, Edge Function changes, dependencies or provider costs.

The planner's dropdown is replaced with a labelled combobox over visible recipes, including household/private/public source context. Typing clears the prior choice; choosing a recipe or the explicit Add manual option enables Save. Arrow keys/Enter select, Escape dismisses results, and a loading/failed recipe fetch still permits deliberate manual meals. Manual entries remain editable/removable and are labelled; they reconcile with zero recipe ingredients. Result lists are bounded to eight; typing narrows a larger library.

A household-keyed route prevents late recipe results/open editors leaking into a new household. A synchronous submit lock blocks duplicate requests. If meal saving succeeds but Shopping reconciliation fails, retry updates that same meal instead of creating another. Existing server membership/RLS and recipe source guards remain authoritative; no service credentials or new authority are used.

Validation includes full static checks; existing planner generate/move/edit/delete/replace and Shopping tests; explicit failed-search/manual, household-switch and in-flight/retry tests; and desktop/mobile Chromium at 320px with keyboard and axe. Exact final CI/evidence counts are recorded on the PR. Initial fixture defects (non-UUID browser recipe and incorrect mock refresh signature) were corrected without weakening production validation. Physical Safari/VoiceOver and hosted authenticated acceptance remain unverified.

Review: search/select a recipe, confirm Shopping contribution; type an unmatched meal and explicitly Add it, edit/remove it and confirm no ingredients; switch households with an open editor; retry a failed reconciliation. This PR is not permission to merge or deploy. Keep CS-80 on its own accepted-main baseline; no dependency on this unmerged branch is needed. The owner's remaining pre-MVP scope is unchanged.
