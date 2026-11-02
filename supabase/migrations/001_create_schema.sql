-- Creates and validates the application schema without modifying existing rows.

do $$
begin
  if to_regprocedure('pg_catalog.gen_random_uuid()') is null then
    raise exception 'gen_random_uuid() is unavailable; enable UUID generation before applying this migration.';
  end if;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  synopsis text not null,
  genre text not null,
  poster_url text,
  director text not null,
  "cast" jsonb default '[]'::jsonb,
  production_crew jsonb default '[]'::jsonb,
  promotional_images jsonb default '[]'::jsonb,
  production_start_date date,
  expected_release_date date,
  production_status text not null default 'In Development',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone_number text not null,
  email text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

do $$
declare
  v_table text;
  v_column text;
  v_type text;
  v_not_null boolean;
  v_type_matches boolean;
  v_actual_not_null boolean;
begin
  for v_table, v_column, v_type, v_not_null in
    select * from (values
      ('projects', 'id', 'uuid', true),
      ('projects', 'title', 'text', true),
      ('projects', 'slug', 'text', true),
      ('projects', 'synopsis', 'text', true),
      ('projects', 'genre', 'text', true),
      ('projects', 'poster_url', 'text', false),
      ('projects', 'director', 'text', true),
      ('projects', 'cast', 'jsonb', false),
      ('projects', 'production_crew', 'jsonb', false),
      ('projects', 'promotional_images', 'jsonb', false),
      ('projects', 'production_start_date', 'date', false),
      ('projects', 'expected_release_date', 'date', false),
      ('projects', 'production_status', 'text', true),
      ('projects', 'is_published', 'boolean', true),
      ('projects', 'created_at', 'timestamptz', true),
      ('projects', 'updated_at', 'timestamptz', true),
      ('inquiries', 'id', 'uuid', true),
      ('inquiries', 'first_name', 'text', true),
      ('inquiries', 'last_name', 'text', true),
      ('inquiries', 'phone_number', 'text', true),
      ('inquiries', 'email', 'text', true),
      ('inquiries', 'message', 'text', true),
      ('inquiries', 'status', 'text', true),
      ('inquiries', 'created_at', 'timestamptz', true)
    ) as expected(table_name, column_name, type_name, is_not_null)
  loop
    select a.atttypid = v_type::regtype, a.attnotnull
      into v_type_matches, v_actual_not_null
    from pg_attribute as a
    where a.attrelid = format('public.%I', v_table)::regclass
      and a.attname = v_column
      and a.attnum > 0
      and not a.attisdropped;

    if not found
      or v_type_matches is distinct from true
      or v_actual_not_null is distinct from v_not_null
    then
      raise exception 'Incompatible schema: public.% is missing or has an incompatible %. Expected type % and NOT NULL = %; no automatic repair was attempted.',
        v_table, v_column, v_type, v_not_null;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint as c
    join pg_attribute as a
      on a.attrelid = c.conrelid and a.attname = 'id' and a.attnum = any(c.conkey)
    where c.conrelid = 'public.projects'::regclass
      and c.contype = 'p'
      and cardinality(c.conkey) = 1
  ) or not exists (
    select 1
    from pg_constraint as c
    join pg_attribute as a
      on a.attrelid = c.conrelid and a.attname = 'id' and a.attnum = any(c.conkey)
    where c.conrelid = 'public.inquiries'::regclass
      and c.contype = 'p'
      and cardinality(c.conkey) = 1
  ) then
    raise exception 'Incompatible schema: both public tables must have a single-column primary key on id.';
  end if;

  if not exists (
    select 1
    from pg_attribute as a
    join pg_attrdef as d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = 'public.projects'::regclass
      and a.attname = 'id'
      and pg_get_expr(d.adbin, d.adrelid) ~ '(gen_random_uuid|uuid_generate_v[124])'
  ) or not exists (
    select 1
    from pg_attribute as a
    join pg_attrdef as d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = 'public.inquiries'::regclass
      and a.attname = 'id'
      and pg_get_expr(d.adbin, d.adrelid) ~ '(gen_random_uuid|uuid_generate_v[124])'
  ) then
    raise exception 'Incompatible schema: public.projects.id and public.inquiries.id must have a UUID-generating default.';
  end if;

  if not exists (
    select 1
    from pg_attribute as a
    join pg_attrdef as d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = 'public.projects'::regclass and a.attname = 'created_at'
  ) or not exists (
    select 1
    from pg_attribute as a
    join pg_attrdef as d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = 'public.inquiries'::regclass and a.attname = 'created_at'
  ) or not exists (
    select 1
    from pg_attribute as a
    join pg_attrdef as d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = 'public.projects'::regclass and a.attname = 'updated_at'
  ) then
    raise exception 'Incompatible schema: created_at and projects.updated_at must have defaults.';
  end if;
end;
$$;

do $$
declare
  v_slug_attnum smallint;
begin
  select attnum into v_slug_attnum
  from pg_attribute
  where attrelid = 'public.projects'::regclass
    and attname = 'slug'
    and attnum > 0
    and not attisdropped;

  if not exists (
    select 1
    from pg_index
    where indrelid = 'public.projects'::regclass
      and indisunique
      and indisvalid
      and indpred is null
      and indexprs is null
      and indnkeyatts = 1
      and indkey[0] = v_slug_attnum
  ) then
    if to_regclass('public.projects_slug_app_uidx') is not null then
      raise exception 'Index name public.projects_slug_app_uidx already exists but is not a valid single-column unique index on slug.';
    end if;
    create unique index projects_slug_app_uidx on public.projects (slug);
  end if;
end;
$$;

create index if not exists projects_created_at_app_idx on public.projects (created_at desc);
create index if not exists projects_published_created_at_app_idx
  on public.projects (created_at desc)
  where is_published = true;
create index if not exists inquiries_created_at_app_idx on public.inquiries (created_at desc);

create or replace function public.is_valid_project_string_array(
  p_value jsonb,
  p_max_items integer,
  p_min_length integer,
  p_max_length integer
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_item jsonb;
  v_text text;
begin
  if p_value is null
    or p_max_items is null
    or p_min_length is null
    or p_max_length is null
    or p_max_items < 0
    or p_min_length < 0
    or p_max_length < p_min_length
    or pg_catalog.jsonb_typeof(p_value) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_value) > p_max_items
  then
    return false;
  end if;

  for v_item in
    select item.value from pg_catalog.jsonb_array_elements(p_value) as item(value)
  loop
    if pg_catalog.jsonb_typeof(v_item) is distinct from 'string' then
      return false;
    end if;

    v_text := v_item #>> '{}';
    if pg_catalog.char_length(v_text) < p_min_length
      or pg_catalog.char_length(v_text) > p_max_length
      or (p_min_length > 0 and pg_catalog.btrim(v_text) = '')
    then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

do $$
begin
  if exists (
    select 1 from public.projects
    where ("cast" is not null and not public.is_valid_project_string_array("cast", 100, 1, 200))
       or (production_crew is not null and not public.is_valid_project_string_array(production_crew, 100, 1, 200))
       or (promotional_images is not null and not public.is_valid_project_string_array(promotional_images, 20, 0, 2048))
  ) then
    raise exception 'Existing project JSONB values do not match the application string-array contract. Inspect the pre-migration verification query; no existing data was changed.';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_cast_array_app_check'
  ) then
    alter table public.projects
      add constraint projects_cast_array_app_check
      check ("cast" is null or public.is_valid_project_string_array("cast", 100, 1, 200));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_production_crew_array_app_check'
  ) then
    alter table public.projects
      add constraint projects_production_crew_array_app_check
      check (production_crew is null or public.is_valid_project_string_array(production_crew, 100, 1, 200));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_promotional_images_array_app_check'
  ) then
    alter table public.projects
      add constraint projects_promotional_images_array_app_check
      check (promotional_images is null or public.is_valid_project_string_array(promotional_images, 20, 0, 2048));
  end if;
end;
$$;

revoke all on function public.is_valid_project_string_array(jsonb, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.is_valid_project_string_array(jsonb, integer, integer, integer)
  to service_role;

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_projects_updated_at();

alter table public.projects enable row level security;
alter table public.inquiries enable row level security;

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
      and c.relname in ('projects', 'inquiries')
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

create policy "Public can read published projects"
on public.projects
for select
to anon, authenticated
using (is_published = true);

revoke all on table public.projects from public, anon, authenticated;
grant select on table public.projects to anon, authenticated;
grant all on table public.projects to service_role;

revoke all on table public.inquiries from public, anon, authenticated;
grant all on table public.inquiries to service_role;

revoke all on function public.set_projects_updated_at() from public, anon, authenticated;
grant execute on function public.set_projects_updated_at() to service_role;
