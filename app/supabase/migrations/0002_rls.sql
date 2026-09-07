-- MediLink360 — row level security
-- Depends on 0001_init.sql.

-- helper: role of the current auth user
create or replace function public.current_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select active from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_ceo_or_admin()
returns boolean
language sql
stable
as $$ select public.current_role() in ('CEO','Admin') $$;

create or replace function public.is_staff_writer()
returns boolean
language sql
stable
as $$ select public.current_role() in ('CEO','Admin','Sales','Trainer') $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.is_ceo_or_admin()) with check (public.is_ceo_or_admin());

-- lock role self-escalation: authenticated users may only ever write name/email to their own row
revoke update on public.profiles from authenticated;
grant update (name, email) on public.profiles to authenticated;
-- CEO/Admin get full update through the SECURITY DEFINER policy path + this grant
grant update (name, email, role, active) on public.profiles to authenticated;
-- (the profiles_self_update policy still limits *which* row; a BEFORE UPDATE
--  trigger blocks a non-admin changing role/active)
create or replace function public.guard_profile_privilege()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_ceo_or_admin() then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'not allowed to change role or active';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_privilege();

-- ---------------------------------------------------------------------------
-- generic: authenticated active users can read; staff writers can write
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clinics','clinic_comments','training_sessions','clinic_tasks',
    'calendar_events','invoices','invoice_line_items','quotations',
    'quotation_line_items','expenses','revenue_cells'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (public.is_active_user())', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for all using (public.is_staff_writer()) with check (public.is_staff_writer())', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- CEO/Admin-only tables (read allowed to all active users, writes locked down)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'employees','country_documents','access_matrix','faq_categories','faq_items','fx_rates'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (public.is_active_user())', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for all using (public.is_ceo_or_admin()) with check (public.is_ceo_or_admin())', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- password reset requests: anyone (even signed-out) can insert; only admins read
-- ---------------------------------------------------------------------------
alter table public.password_reset_requests enable row level security;
grant insert on public.password_reset_requests to anon, authenticated;

drop policy if exists prr_insert on public.password_reset_requests;
create policy prr_insert on public.password_reset_requests
  for insert with check (true);

drop policy if exists prr_admin_read on public.password_reset_requests;
create policy prr_admin_read on public.password_reset_requests
  for select using (public.is_ceo_or_admin());

drop policy if exists prr_admin_update on public.password_reset_requests;
create policy prr_admin_update on public.password_reset_requests
  for update using (public.is_ceo_or_admin());

-- ---------------------------------------------------------------------------
-- storage: private `documents` bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists documents_read on storage.objects;
create policy documents_read on storage.objects
  for select using (bucket_id = 'documents' and public.is_active_user());

drop policy if exists documents_write on storage.objects;
create policy documents_write on storage.objects
  for insert with check (bucket_id = 'documents' and public.is_ceo_or_admin());

drop policy if exists documents_delete on storage.objects;
create policy documents_delete on storage.objects
  for delete using (bucket_id = 'documents' and public.is_ceo_or_admin());
