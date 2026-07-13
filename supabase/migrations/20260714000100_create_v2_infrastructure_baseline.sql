begin;

create schema if not exists cooksmith;

comment on schema cooksmith is
  'Cooksmith v2 application schema, isolated from prototype public tables.';

create table cooksmith.infrastructure_health (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  constraint infrastructure_health_key_not_blank check (length(btrim(key)) > 0),
  constraint infrastructure_health_value_not_blank check (length(btrim(value)) > 0)
);

comment on table cooksmith.infrastructure_health is
  'Local migration and seed workflow marker. Not a product-domain table.';

revoke all on schema cooksmith from public, anon, authenticated;
revoke all on table cooksmith.infrastructure_health from public, anon, authenticated;

commit;
