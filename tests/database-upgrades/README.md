# Migration upgrade fixtures

These SQL fixtures are separate from the ordinary pgTAP suite because they require a schema at a particular migration boundary. Use only a disposable local database with synthetic `supabase/seed.sql` data.

For CS-79, apply baseline migrations before `20261004104415`, load the seed, then `cs79-before.sql`. Apply `20261004104415_shopping_ingredient_identity.sql`, then run `cs79-after.test.sql` with pgTAP. Five assertions cover consolidation, incompatible units, source preservation, manual state and existing Pantry aliases. Recreate the disposable database afterward before running ordinary suites.

For the purchase-total follow-up, apply all migrations before `20261004115348`, load the seed and `cs79-purchases-before.sql`, then apply `20261004115348_shopping_purchase_groups.sql`. Run `cs79-purchases-after.test.sql` with pgTAP. Six assertions check old IDs, manual adjustment protection, equivalent tsp/mL consolidation with bought state, and source provenance. Recreate the disposable database afterward.
