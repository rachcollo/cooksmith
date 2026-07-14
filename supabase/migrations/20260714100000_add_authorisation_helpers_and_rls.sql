begin;

create function cooksmith.has_application_role(required_role cooksmith.application_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from cooksmith.app_user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create function