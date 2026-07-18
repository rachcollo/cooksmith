# CS-28 handover: Lossless Recipe Content Structuring

- **Date:** 2026-07-18
- **Branch:** `work` locally; requested `cs28-lossless-recipe-content-structuring` could not be created from verified remote `main` because no remote/main exists.
- **Target:** `main`
- **Commit:** Pending final local commit.
- **Pull request:** Pending connected PR metadata.
- **Status:** Implemented, validation pending for remote baseline, Docker-backed database validation, hosted preview and CI.

## Objective

Create deterministic backend derivation that preserves multiline recipe source text while producing ordered, reusable ingredient and instruction rows with parser metadata.

## Product impact

- **Product Principles supported:** calm household recipe reuse, source preservation, and trust before convenience.
- **User effort removed:** households can paste or type multiline recipe text without separately normalising every line.
- **Primary next action improved:** recipe detail and future import/planning flows can consume ordered derived rows from one domain contract.
- **Product behaviour changed:** Yes. Saved recipe source now drives deterministic derived child rows with original-line metadata.

## Changes made

Added the pure `recipe-content-v1` derivation module, repository integration, additive database metadata migration and fixture coverage for lossless source preservation, optional normalisation and ordered instruction steps.

## Files and components affected

| File or component                                                            | Purpose                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------- |
| `src/domain/recipes/contentDerivation.ts`                                    | Deterministic parser contract.                     |
| `supabase/migrations/20260718120000_lossless_recipe_content_structuring.sql` | Additive derivation metadata migration.            |
| `src/infrastructure/recipes/supabaseRecipeRepository.ts`                     | Source-driven derived row persistence and mapping. |

## Migrations

`supabase/migrations/20260718120000_lossless_recipe_content_structuring.sql` runs after CS-27 structured recipe authoring. It is additive, backfills existing structured rows with original line text and parser metadata, and must be released to Production only through the protected Production database release workflow after an approved `main` merge.

## Setup instructions

None for application code. Database validation requires the local Supabase/Docker runtime.

## Tests run

| Command or check                                                             | Result                                             | Notes |
| ---------------------------------------------------------------------------- | -------------------------------------------------- | ----- |
| `src/domain/recipes/contentDerivation.ts`                                    | Deterministic parser contract.                     |
| `supabase/migrations/20260718120000_lossless_recipe_content_structuring.sql` | Additive derivation metadata migration.            |
| `src/infrastructure/recipes/supabaseRecipeRepository.ts`                     | Source-driven derived row persistence and mapping. |       |

## Preview or verification instructions

Create or edit a recipe with multiline ingredients and instructions. Confirm original source text is retained, detail rows are ordered, decorative instruction numbering is removed only from derived step text, and ambiguous ingredient lines remain visible without invented quantity/unit metadata.

## Accessibility, security, privacy and cost

- **Accessibility:** no perceptible UI change requiring screenshot; existing recipe views continue to render semantic lists.
- **Security and privacy:** no secrets, production data or service-role credentials used; recipe text is treated as untrusted plain content.
- **Cost impact:** A$0 monthly / A$0 annual.
- **Credential check:** staged content was checked with `git diff --cached --check` before commit; no credential-like values were intentionally added.

## Known limitations

Remote `main`, push, PR verification, CI, hosted preview and Docker-backed database checks remain pending in this checkout. Repository create/update still inherits the existing multi-call Supabase save path; a transactional RPC is recommended for final atomic-save acceptance.

## Deferred work

CS-27 UI redesign, CS-30 URL import, CS-29 Cook With Me mode, shopping-list extraction and LLM parsing remain outside this package.

## Rollback approach

Revert the application commit before release. If the migration has been released to a shared database, do not edit it; add a forward migration that stops consuming the derivation metadata or drops it only after compatibility is reviewed.

## Recommended next milestone

CS-27 must be accepted with this shared contract before CS-20, CS-30 or CS-29 consume the derived recipe content.
