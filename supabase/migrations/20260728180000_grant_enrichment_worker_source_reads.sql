-- Allow the enrichment activation RPC, which runs as its caller, to verify that
-- the source recipe still exists before activating derived metadata.
grant select on table cooksmith.household_recipes to service_role;
grant select on table cooksmith.imported_recipes to service_role;
