-- Stale application snapshots are conflicts, not retryable serialization failures.
-- PostgREST 14 retries SQLSTATE 40001; PT409 returns a bounded HTTP 409 instead.
-- Preserve the existing body, guards, permissions and concurrent-edit rejection.
do $http_conflict$
declare definition text; old_code text := $old$errcode='40001'$old$;
begin
  definition := pg_get_functiondef('cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb)'::regprocedure);
  if (length(definition) - length(replace(definition, old_code, ''))) / length(old_code) <> 3 then
    raise exception 'Expected 3 stale snapshot guards in cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb)';
  end if;
  execute replace(definition, old_code, $new$errcode='PT409'$new$);
end;
$http_conflict$;
