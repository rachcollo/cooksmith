# Migration upgrade fixtures

These SQL fixtures are separate from the ordinary pgTAP suite because they require a schema at a particular migration boundary. Use only a disposable local database with synthetic `supabase/seed.sql` data.

For CS-79, apply baseline migrations before `20261004104415`, load the seed, then `cs79-before.sql`. Apply `20261004104415_shopping_ingredient_identity.sql`, then run `cs79-after.test.sql` with pgTAP. Five assertions cover consolidation, incompatible units, source preservation, manual state and existing Pantry aliases. Recreate the disposable database afterward before running ordinary suites.
