-- Synthetic infrastructure-only seed. Safe to repeat after local resets.
insert into cooksmith.infrastructure_health (key, value)
values ('milestone_3_baseline', 'ready')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
