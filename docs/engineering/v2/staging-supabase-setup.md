# Supabase staging setup

## Purpose and cost

Use one free Supabase project for Cooksmith v2 Preview/Staging. It contains synthetic or controlled test data only. Production requires a separate future project and release approval. A measured free-tier limitation must be documented before any tier change or recurring cost is approved.

Choose an Australian region where the current Supabase plan offers one. Record any unavoidable cross-border processing before friend testing.

## Access and secrets

- Restrict project-owner access to the smallest practical contributor group.
- Store the project password, access token and secret/service-role values only in approved password and secret stores.
- Never put a service-role value in Vercel frontend variables, `.env.example`, screenshots or logs.
- Do not use a real household identity, email or meal record in staging.

## Manual provisioning

1. Create a new free Supabase project clearly named as Cooksmith v2 staging.
2. Record its project reference as staging, never Production.
3. From a trusted developer machine, authenticate the repository-pinned CLI using a securely supplied access token.
4. Link only for the explicit staging migration operation and verify the displayed project reference before proceeding.
5. Apply committed migrations using the documented Supabase staging process after local and CI validation.
6. Apply only approved synthetic staging seeds. The local `seed.sql` must not be pushed automatically to an existing shared project without review.
7. Remove local link metadata before switching tasks if there is any risk of targeting the wrong project.

Repository package scripts deliberately do not link or push to hosted databases.

## Vercel Preview configuration

Configure these Preview-only values in Vercel:

- `VITE_APP_ENV=preview`
- `VITE_SUPABASE_URL` set to the staging project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` set to the staging publishable key
- `COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS` set to the future Production project reference deny-list

The deny-list is build-only and must not use the `VITE_` prefix. Verify that the staging URL's project reference differs from every denied Production reference. A preview build fails closed when it is labelled incorrectly, uses a local URL, omits the deny-list or matches Production.

## Verification and clean-up

1. Confirm the Vercel deployment is a Preview, not Production deployment.
2. Confirm the application reports the preview environment.
3. Confirm the staging project reference is not in the Production deny-list.
4. Run smoke tests using synthetic data only.
5. Reset staging only through an approved, explicit process. Never run a destructive reset against Production.
6. Pause or remove unused staging resources if free-tier project limits require it, after confirming no active preview depends on them.

## Free-tier limitations

Free projects may pause after inactivity and have storage, database and email limits. Treat those as expected staging constraints. Do not copy Production data or upgrade a tier merely to keep a preview continuously awake.
