# CS-28 completion report: Lossless Recipe Content Structuring

- **Date:** 2026-07-18
- **Branch:** `work` locally; requested branch `cs28-lossless-recipe-content-structuring` could not be created from remote `main` because this checkout has no configured `main` or Git remote.
- **Target:** `main`
- **Baseline:** Local `work` commit only; remote `main` could not be verified because no Git remote is configured in this checkout.
- **Status:** Implemented, validation pending for remote baseline, push/PR, Docker-backed database validation, hosted preview, and CI.

## Scope delivered

CS-28 adds a deterministic recipe-content derivation boundary that treats user-entered source text as authoritative while producing ordered reusable ingredient and instruction records.

Implemented scope:

- pure `recipe-content-v1` derivation for multiline ingredient and instruction source;
- ordered non-empty logical-line splitting with CRLF/LF handling;
- original trimmed line preservation on every derived ingredient and step;
- optional ingredient quantity and unit recognition for common quantities, vulgar fractions, slash fractions, decimals, and ranges;
- display-only handling for ambiguous ingredients without inventing missing normalised fields;
- instruction numbering/bullet decoration removal in derived display text only;
- repository integration so create and update flows derive structured rows from the source fields instead of relying on UI-specific parsing;
- additive database migration for parser version, derivation status, derived timestamp, original line text, constraints, indexes, comments, and deterministic backfill of existing structured rows;
- generated database type metadata updated for the new columns;
- unit and pgTAP coverage for parser behaviour and database derivation metadata.

## Product Principles supported

- Removes invisible work by turning household recipe text into reusable ordered content without extra user effort.
- Keeps the experience calm by accepting ambiguous family-recipe lines as valid display content.
- Protects trust by preserving source text as authoritative and keeping household RLS on derived child rows.

## Files changed

| File                                                                         | Purpose                                                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/domain/recipes/contentDerivation.ts`                                    | Pure deterministic CS-28 derivation contract and parser version.                                   |
| `src/domain/recipes/types.ts`                                                | Recipe aggregate metadata for original line text, parser version, and derivation status.           |
| `src/infrastructure/recipes/supabaseRecipeRepository.ts`                     | Repository mapping and source-driven derived-row replacement.                                      |
| `src/infrastructure/database/generated/database.types.ts`                    | Generated database type metadata for derivation columns.                                           |
| `supabase/migrations/20260718120000_lossless_recipe_content_structuring.sql` | Additive schema, constraints, indexes, comments, and backfill.                                     |
| `supabase/tests/0012_recipe_library.test.sql`                                | pgTAP coverage for derivation metadata columns and status constraints.                             |
| `tests/unit/recipeContentDerivation.test.ts`                                 | Fixture-style parser tests for preservation, quantities, ambiguity, instructions, and determinism. |
| `tests/integration/recipes.test.tsx`                                         | Integration fixtures updated for CS-28 recipe aggregate metadata.                                  |
| `tests/renderApp.tsx`                                                        | Shared test repository fixtures updated for CS-28 recipe aggregate metadata.                       |

## Validation evidence

See the handover for the final command list. At the time of implementation, focused `npm run test -- recipeContentDerivation recipeSchemas` and `npm run typecheck` passed with the managed npm `http-proxy` environment warning.

## GitHub, CI, and hosted preview

Remote baseline, push, GitHub Actions, Vercel preview, and hosted smoke tests are pending because this checkout has no configured Git remote or local `main` branch.

## Security, privacy, production, and cost

- No production database, hosted project, real customer data, secrets, or service-role credentials were accessed.
- The migration is additive and does not deploy Production by itself; Production database release must use the protected workflow after merge of an approved `main` SHA.
- Derived rows remain household-scoped through the existing child-table RLS policies.
- Cost impact: A$0 monthly / A$0 annual. No paid services or dependencies were added.

## Known limitations and follow-up

- The repository still performs parent save and child replacement as separate authenticated Supabase calls inherited from CS-19/CS-27. A transactional database function is recommended before final acceptance of the atomic-save acceptance criterion.
- Docker-backed local database reset, lint, pgTAP, and generated type regeneration could not be completed unless the local Supabase runtime is available.
- Hosted preview smoke testing and CI remain pending.
