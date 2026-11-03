-- Adds optional film and production credits without changing existing projects.

do $$
begin
  if to_regclass('public.projects') is null then
    raise exception 'Apply and verify 001_create_schema.sql before applying this migration.';
  end if;
end;
$$;

alter table public.projects
  add column if not exists based_on text,
  add column if not exists author text,
  add column if not exists publisher text,
  add column if not exists producer text,
  add column if not exists executive_producers text[] not null default '{}',
  add column if not exists screenplay text,
  add column if not exists production_company text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_executive_producers_array_app_check'
  ) then
    alter table public.projects
      add constraint projects_executive_producers_array_app_check
      check (
        cardinality(executive_producers) <= 100
        and not ('' = any(executive_producers))
      );
  end if;
end;
$$;
