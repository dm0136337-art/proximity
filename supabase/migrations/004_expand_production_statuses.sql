-- Adds production statuses without changing existing project records.

begin;

do $$
begin
  if to_regclass('public.projects') is null then
    raise exception 'Apply and verify 001_create_schema.sql before applying this migration.';
  end if;

  if exists (
    select 1
    from public.projects
    where production_status not in (
      'In Development',
      'Pre-Production',
      'In Production',
      'Post-Production',
      'Completed',
      'Released',
      'On Hold'
    )
  ) then
    raise exception 'Existing public.projects.production_status values are unsupported. Inspect existing values before retrying; no rows were changed.';
  end if;
end;
$$;

alter table public.projects
  drop constraint if exists projects_production_status_allowed_check;

alter table public.projects
  add constraint projects_production_status_allowed_check
  check (production_status in (
    'In Development',
    'Pre-Production',
    'In Production',
    'Post-Production',
    'Completed',
    'Released',
    'On Hold'
  ));

commit;
