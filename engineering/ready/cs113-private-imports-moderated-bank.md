# Engineering Package CS-113: Make imported recipes private by default and moderate the shared recipe bank

## Metadata

- **Jira issue:** `CS-113`
- **Jira link:** https://smillins.atlassian.net/browse/CS-113
- **Epic:** Administration & Public Content (CS-33)
- **Priority:** Highest
- **Status:** `Planned`
- **Branch:** `feat/cs-113-private-imports-moderated-bank`
- **Depends on:** None
- **Blocks:** None
- **Package path:** `engineering/ready/cs113-private-imports-moderated-bank.md`
- **Source:** Four-reviewer review, 17 November 2026, findings C2, N8, U8 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Publication and Build Gate

This publishes planning documentation only, not implementation approval. Keep this package Planned and exclude it from automated pickup until the following gate is explicitly resolved:

- Confirm whether private imports are household-wide or member-only, and confirm treatment of existing public recipes before implementation. No automatic unpublishing is approved.

## Product Outcome

Recipes a household imports stay private unless an administrator publishes them, and owners can edit, archive and favourite their own imports. The shared bank cannot be written to by any signed-up user.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `imported_recipes_insert_owned` lets any authenticated user insert a `public` row; update is limited to private rows; there is no delete policy (`supabase/migrations/20260718180000_url_recipe_imports.sql:55-61`).
- Import pre-selects Public (`src/routes/RecipesPage.tsx:170, 665-691`).
- Edit and Archive render only for household recipes and private imports cannot be favourited (`src/routes/RecipesPage.tsx:218, 880-889`).
- Admin recipe management exists (CS-93) at `/admin/recipes`.

## Scope

### Included

- RLS change so only administrators can create or update public recipes.
- Import form saves private; visibility choice removed.
- Owner edit, archive and favourite for private imports.
- An admin publish action for a private import, preserving attribution.
- A read-only report of existing public recipes not created by an administrator.

### Explicitly Out of Scope

- Chef profiles and attributed browsing (CS-42).
- Bulk import (CS-43).
- Household-to-household sharing by choice (CS-46).
- Automatic deletion or unpublishing of existing recipes.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] New imports are private to the importing household by default and the form offers no direct publication.
- [ ] Only an application administrator can make a recipe public.
- [ ] Owners can edit, archive and favourite their own imported recipes.
- [ ] RLS denies insert or update of a public recipe by a non-admin, verified by pgTAP.
- [ ] Existing public recipes are preserved and a list of those not created by an administrator is produced for a human decision.
- [ ] Source URL, author and publisher remain visible on every imported recipe.

## Technical Direction

- Additive migration: replace the insert policy with `visibility = 'private'` for non-admins; add admin policies using `has_application_role('admin')`.
- Private imports are currently owner-scoped (`owner_id`), not household-scoped. Keep that unless the product owner chooses household scope (open question).
- Planned meals and favourites that reference an archived import must keep working (`on delete set null` already applies).

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- pgTAP: tenant isolation matrix extended for imported recipes.
- Integration: import, edit, archive, favourite; admin publish.
- Regression: shopping refresh for edited imports.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** Yes: RLS policies and archive support for imported recipes.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- Do existing user-published recipes stay public pending review, or become private to their owner at release?
- Should a private import be visible to the whole household or only the importing member?

## Pull Request

Title: `CS-113: Make imported recipes private by default and moderate the shared recipe bank`
