-- Adds an optional YouTube trailer URL without changing existing projects.

do $$
begin
  if to_regclass('public.projects') is null then
    raise exception 'Apply and verify 001_create_schema.sql before applying this migration.';
  end if;
end;
$$;

alter table public.projects
  add column if not exists youtube_trailer_url text;

notify pgrst, 'reload schema';
