-- MediLink360 — enable Postgres realtime for the tables the app subscribes to.
-- Safe to re-run; each add is guarded.

do $$
declare t text;
begin
  foreach t in array array['clinics','calendar_events','clinic_comments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
