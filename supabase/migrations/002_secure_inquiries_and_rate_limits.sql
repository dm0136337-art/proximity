-- Adds rate limiting and validates status values without changing existing rows.

do $$
begin
  if to_regclass('public.projects') is null or to_regclass('public.inquiries') is null then
    raise exception 'Apply and verify 001_create_schema.sql before applying this migration.';
  end if;
end;
$$;

create table if not exists public.rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  constraint rate_limits_scope_app_check
    check (scope in ('contact', 'admin-login')),
  constraint rate_limits_key_hash_app_check
    check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint rate_limits_request_count_app_check
    check (request_count > 0),
  primary key (scope, key_hash)
);

do $$
declare
  v_column record;
  v_actual_type_matches boolean;
  v_actual_not_null boolean;
begin
  for v_column in
    select * from (values
      ('scope', 'text', true),
      ('key_hash', 'text', true),
      ('window_started_at', 'timestamptz', true),
      ('request_count', 'int4', true)
    ) as expected(column_name, type_name, is_not_null)
  loop
    select a.atttypid = v_column.type_name::regtype, a.attnotnull
      into v_actual_type_matches, v_actual_not_null
    from pg_attribute as a
    where a.attrelid = 'public.rate_limits'::regclass
      and a.attname = v_column.column_name
      and a.attnum > 0
      and not a.attisdropped;

    if not found
      or v_actual_type_matches is distinct from true
      or v_actual_not_null is distinct from v_column.is_not_null
    then
      raise exception 'Incompatible schema: public.rate_limits is missing or has an incompatible %. Expected type % and NOT NULL = %; no automatic repair was attempted.',
        v_column.column_name, v_column.type_name, v_column.is_not_null;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint as c
    join pg_attribute as scope_column
      on scope_column.attrelid = c.conrelid and scope_column.attname = 'scope'
    join pg_attribute as hash_column
      on hash_column.attrelid = c.conrelid and hash_column.attname = 'key_hash'
    where c.conrelid = 'public.rate_limits'::regclass
      and c.contype = 'p'
      and c.conkey = array[scope_column.attnum, hash_column.attnum]::smallint[]
  ) then
    raise exception 'Incompatible schema: public.rate_limits must have a primary key on (scope, key_hash).';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from public.rate_limits
    where scope not in ('contact', 'admin-login')
       or key_hash !~ '^[0-9a-f]{64}$'
       or request_count <= 0
  ) then
    raise exception 'Existing public.rate_limits rows violate the expected scope, hash, or count format. Inspect existing data before retrying; no rows were changed.';
  end if;

  if exists (
    select 1 from public.projects
    where production_status not in (
      'In Development',
      'Pre-Production',
      'In Production',
      'Post-Production',
      'Completed'
    )
  ) then
    raise exception 'Existing public.projects.production_status values are unsupported. Inspect the pre-migration verification query; no existing data was changed.';
  end if;

  if exists (
    select 1 from public.inquiries
    where status not in ('new', 'read', 'responded')
  ) then
    raise exception 'Existing public.inquiries.status values are unsupported. Inspect the pre-migration verification query; no existing data was changed.';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.rate_limits'::regclass
      and conname = 'rate_limits_scope_app_check'
  ) then
    alter table public.rate_limits
      add constraint rate_limits_scope_app_check
      check (scope in ('contact', 'admin-login'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.rate_limits'::regclass
      and conname = 'rate_limits_key_hash_app_check'
  ) then
    alter table public.rate_limits
      add constraint rate_limits_key_hash_app_check
      check (key_hash ~ '^[0-9a-f]{64}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.rate_limits'::regclass
      and conname = 'rate_limits_request_count_app_check'
  ) then
    alter table public.rate_limits
      add constraint rate_limits_request_count_app_check
      check (request_count > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_production_status_allowed_check'
  ) then
    alter table public.projects
      add constraint projects_production_status_allowed_check
      check (production_status in (
        'In Development',
        'Pre-Production',
        'In Production',
        'Post-Production',
        'Completed'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.inquiries'::regclass
      and conname = 'inquiries_status_allowed_check'
  ) then
    alter table public.inquiries
      add constraint inquiries_status_allowed_check
      check (status in ('new', 'read', 'responded'));
  end if;
end;
$$;

create index if not exists rate_limits_window_started_at_app_idx
  on public.rate_limits (window_started_at);

alter table public.rate_limits enable row level security;

do $$
declare
  v_policy record;
begin
  for v_policy in
    select n.nspname, c.relname, p.polname
    from pg_policy as p
    join pg_class as c on c.oid = p.polrelid
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'rate_limits'
      and (
        0::oid = any(p.polroles)
        or exists (
          select 1 from unnest(p.polroles) as policy_role(role_oid)
          join pg_roles as r on r.oid = policy_role.role_oid
          where r.rolname in ('anon', 'authenticated')
        )
      )
  loop
    execute format('drop policy %I on %I.%I', v_policy.polname, v_policy.nspname, v_policy.relname);
  end loop;
end;
$$;

revoke all on table public.rate_limits from public, anon, authenticated;
grant all on table public.rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_allowed boolean;
begin
  if p_scope is null
    or p_key_hash is null
    or p_max_requests is null
    or p_window_seconds is null
    or p_scope not in ('contact', 'admin-login')
    or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_max_requests < 1
    or p_max_requests > 100
    or p_window_seconds < 1
    or p_window_seconds > 86400
  then
    raise exception 'Invalid rate limit parameters.';
  end if;

  insert into public.rate_limits as limits (
    scope,
    key_hash,
    window_started_at,
    request_count
  )
  values (p_scope, p_key_hash, v_now, 1)
  on conflict (scope, key_hash) do update
  set
    window_started_at = case
      when limits.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
        then v_now
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
        then 1
      when limits.request_count >= p_max_requests
        then p_max_requests + 1
      else limits.request_count + 1
    end
  returning request_count <= p_max_requests into v_allowed;

  return v_allowed;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;

notify pgrst, 'reload schema';
