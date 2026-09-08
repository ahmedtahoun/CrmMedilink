-- MediLink360 — enable Postgres realtime for the tables the app subscribes to.
-- Bulletproof: creates the publication if missing, skips tables already in it,
-- and never aborts on a per-table error.

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;

  foreach t in array array['clinics', 'calendar_events', 'clinic_comments']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;   -- already a member
      when others then null;             -- ignore anything else (e.g. perms)
    end;
  end loop;
end $$;
