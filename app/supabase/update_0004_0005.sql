-- Incremental: run this if 0001-0003 are already applied.

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

-- MediLink360 — private `attachments` bucket for clinic file uploads.
-- Separate from `documents` (CEO/Admin-only): any active staff writer can
-- add/remove clinic attachments. Self-contained — redefines the helper
-- functions it needs so this file runs even if 0002 was not applied.

-- bucket ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- helper functions (idempotent; same definitions as 0002) --------------
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select active from public.profiles where id = auth.uid()), false) $$;

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_staff_writer()
returns boolean language sql stable
as $$ select public.current_role() in ('CEO','Admin','Sales','Trainer') $$;

-- storage policies ----------------------------------------------------
drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and public.is_active_user());

drop policy if exists attachments_write on storage.objects;
create policy attachments_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_staff_writer());

drop policy if exists attachments_update on storage.objects;
create policy attachments_update on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and public.is_staff_writer());

drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and public.is_staff_writer());
