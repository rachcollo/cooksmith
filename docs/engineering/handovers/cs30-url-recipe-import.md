# CS-30 Handover — URL Recipe Import

## Review outcome

Review the import journey from URL entry through editable draft and explicit save. Public must be selected by default; switching to Private must be clear and must persist an owner-only recipe. Confirm author attribution is separate from publisher and source URL.

## Changed surfaces

- `src/routes/RecipesPage.tsx` — import, review, visibility and attribution UX.
- Recipe domain and repository — import contracts and persistence mapping.
- `supabase/functions/import-recipe` — secure fetch boundary and JSON-LD extraction.
- `supabase/migrations/20260718180000_url_recipe_imports.sql` — recipe store, duplicate indexes and RLS.
- Database, unit and integration tests — visibility, extraction, URL blocking and review/save evidence.

## Hosted preview checks

1. Use a synthetic account and open Recipe Library on mobile and desktop.
2. Import supported pages from two lawful sources; confirm ordered content, author and source.
3. Confirm the draft is not visible before Save.
4. Confirm Public is initially selected and is visible to a second unrelated authenticated account after save.
5. Import another URL as Private and confirm a second account, including a same-household member, cannot see it.
6. Repeat the public URL and confirm the canonical recipe is reused.
7. Try localhost, a private IP, credential-bearing URL, redirect loop, non-HTML page, oversized response and unsupported page.
8. Verify keyboard focus, radio labels, discard behaviour, 320 px layout and an axe scan.

## Deployment sequence

The PR does not deploy Production. After merge, release the exact approved `main` SHA through the protected Production database workflow, then deploy `import-recipe` to the matching environment. Do not enable the UI against an environment missing either component.

Rollback before Production is branch/PR reversion. After a shared migration, preserve history and use a forward fix; the import action and Edge Function can be disabled independently while existing data remains intact.
