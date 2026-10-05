# CS-79: Amount-first shopping rows

## Status and baseline

Implemented, manual validation pending. Baseline: current main `8592a4ff454aa3ced94106c7aabce48607d24a88` (merged PR186). Branch: `fix/cs-79-oil-purchase-display`. This separate correction addresses the owner's request for smaller shopping text with the amount at the start of the line. It does **not** claim to resolve the reported remaining oil split.

## Change and scope

Shopping now renders amount then product in one wrapping sentence, using 0.9375rem (15px at the default root size) instead of the previous 1.05rem product text. Existing 44px controls, approximate labels, mixed-unit labels, pantry hint, editing and completion remain usable. This supports calm mobile shopping and removes the need to scan two separate lines for a quantity.

Only ShoppingPage markup and shopping-copy CSS change. No domain identity, conversion, persistence, migration, generated type, dependency, Edge Function or provider change. Cost A$0/month and A$0/year. Rollback: revert this presentation change.

## Oil investigation: evidence and remaining blocker

Six synthetic persisted-row probes use the actual domain projection:

| Saved inputs                                              | Current result         |
| --------------------------------------------------------- | ---------------------- |
| Same extra virgin olive oil, 60 ml plus 2 unspecified tsp | One row: 60 ml + 2 tsp |
| Same product, 60 ml plus 2 AU tsp                         | One row: 70 ml         |
| Olive oil and extra virgin olive oil                      | Two product rows       |
| Same product with a manual addition, no opt-in            | Two rows               |
| Same product with manual opt-in                           | One row: 70 ml         |
| Old quantity-bearing labels, no regional convention       | One row: 60 ml + 2 tsp |

The identity/manual-choice rules, rather than unit compatibility, determine whether separate rows exist. `purchaseGroups.ts` handles the projection; `purchaseMeasures.ts` handles conversion. `supabaseShoppingRepository.ts` reads the stored manual/opt-in/convention flags and contribution quantities. Legacy conventions default unknown; source-host resolution runs during plan generation, not list reads. No unsupported regional convention is inferred on old rows.

Three owner-supplied screenshots were prepared through Library's current materialisation route, but every download failed, including one bounded retry. No readable image pixels were obtained or visually inspected. Exact row names and manual origin remain unconfirmed. Therefore no image-dependent root-cause claim or change to product-grade/manual-isolation policy is justified. Synthetic screenshots inspected below are separate evidence, not substitutes for the owner's attachments. No real household data was read or copied into this repository.

## Validation

- Local preflight, format, formatting check, lint, strict types, app tests and build: see final PR evidence for completed results.
- Existing Playwright suite: 24 passed, desktop and Pixel 7, including 320px shopping, edit/completion, manual measuring settings and axe checks. Synthetic 320px and Pixel 7 screenshots visually inspected; text wraps without horizontal overflow.
- Six actual-domain diagnostic cases above recorded locally. Existing unit coverage already exercises these distinctions; no new test asserting trivial CSS implementation was added.
- Documentation command audit, secret scan, dependency audit and whitespace checks run; final outcomes recorded in PR.
- No local database reset needed for this presentation-only diff. Full unchanged database gates still run in CI.
- Browser-verification skill applied. Its agent-browser CLI is unavailable; repository Playwright provided browser verification.

## Hosted and manual acceptance

Use a designated disposable preview household: view known and mixed-unit purchases, check amount-before-name at 320px and a normal phone width, edit and mark bought, and open the pantry hint. Expected: readable wrapping and usable controls, with totals unchanged. Hosted authenticated preview, physical-device and assistive-technology checks remain unperformed. Public preview smoke is not authenticated functional evidence.

The oil report remains open until the exact saved-row labels/origins can be inspected or reproduced. Keep this PR draft; do not merge, deploy or mark CS-79 complete based on this handover. GitHub head, CI and preview facts belong in the final PR evidence. No production configuration/data, Jira or paid evaluation was changed.
