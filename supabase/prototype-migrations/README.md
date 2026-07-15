# Prototype migration archive

`001_initial_schema.sql` is the unchanged MVP migration formerly stored in the active Supabase migration directory. It remains available for prototype history and reference but is deliberately excluded from the Cooksmith v2 CLI path.

The v2 migration runner reads only `supabase/migrations`. Do not copy prototype schema or policies into v2 migrations. `main` and the existing production database remain untouched.
