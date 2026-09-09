-- MediLink360 full setup — paste into the Supabase SQL editor and Run (fresh project only).
-- migrations 0001..0008 in order.

------------------------------ migrations/0001_init.sql ------------------------------
-- MediLink360 — core schema
-- Run in the Supabase SQL editor (or via `supabase db push`) in order: 0001 -> 0002 -> 0003.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  role        text not null default 'Sales' check (role in ('CEO','Admin','Sales','Trainer')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- auto-create a profile row when an auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'Sales')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- employees: HR directory (also feeds trainer/closer dropdowns)
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text,
  phone            text,
  country          text not null default 'Egypt',
  department       text,
  position         text,
  employment_type  text,
  status           text not null default 'active' check (status in ('active','inactive','left')),
  start_date       date,
  manager          text,
  base_salary      numeric,
  currency         text default 'USD',
  commission_rate  numeric,
  allowance        numeric,
  notes            text,
  documents        jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clinics: the pipeline record (providers are clinics with is_provider = true
-- that have not yet entered the sales pipeline)
-- ---------------------------------------------------------------------------
create table if not exists public.clinics (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  cat              text not null default 'General',
  pri              text not null default 'Medium' check (pri in ('High','Medium','Low')),
  area             text,
  street           text,
  maps_link        text,
  contact          text,
  phone            text,
  email            text,
  website          text,
  healthcare_type  text,
  business_type    text,
  medical_cats     text[] not null default '{}',
  segment          text,
  ownership        text,
  chain_name       text,
  current_system   text,
  closer           text,
  trainer          text,
  market           text not null default 'egypt' check (market in ('egypt','dubai','ksa','qatar')),
  cs               text not null default 'lead'
                     check (cs in ('lead','followup','proposal','commission','signed')),
  ts               text check (ts in ('handoff','scheduled','reception','followup','live')),
  cs_date          date,
  ai_score         int not null default 0,
  mrr              numeric not null default 0,
  mrr_usd          numeric not null default 0,
  overdue          boolean not null default false,
  trial_from       date,
  trial_to         date,
  sub_from         date,
  sub_to           date,
  sub_status       text not null default 'active' check (sub_status in ('active','trial','expired','inactive')),
  sub_reason       text,
  board_order      int not null default 0,
  is_provider      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists clinics_market_idx on public.clinics (market);
create index if not exists clinics_cs_idx on public.clinics (cs);

create table if not exists public.clinic_comments (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  author      text not null default '',
  author_id   uuid references public.profiles (id) on delete set null,
  text        text not null,
  type        text not null default 'Note',
  created_at  timestamptz not null default now()
);
create index if not exists clinic_comments_clinic_idx on public.clinic_comments (clinic_id);

create table if not exists public.training_sessions (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  type        text not null default 'Reception Training',
  date        date,
  time        text,
  duration    text,
  mode        text,
  trainer     text,
  attendees   text,
  notes       text,
  status      text not null default 'Scheduled' check (status in ('Scheduled','Completed','Cancelled')),
  created_at  timestamptz not null default now()
);
create index if not exists training_sessions_clinic_idx on public.training_sessions (clinic_id);

create table if not exists public.clinic_tasks (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  title       text not null,
  due         date,
  done        boolean not null default false,
  owner       text,
  created_at  timestamptz not null default now()
);
create index if not exists clinic_tasks_clinic_idx on public.clinic_tasks (clinic_id);

-- ---------------------------------------------------------------------------
-- calendar
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  type        text not null default 'Task' check (type in ('Task','Meeting','Follow-up','Reminder')),
  priority    text not null default 'Medium' check (priority in ('High','Medium','Low')),
  clinic_id   uuid references public.clinics (id) on delete set null,
  date        date not null,
  time        text,
  notes       text,
  done        boolean not null default false,
  market      text not null default 'egypt' check (market in ('egypt','dubai','ksa','qatar')),
  owner       text not null default 'trainer',
  booking_id  text unique,
  created_at  timestamptz not null default now()
);
create index if not exists calendar_events_date_idx on public.calendar_events (date);

-- ---------------------------------------------------------------------------
-- finance
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid references public.clinics (id) on delete set null,
  reference    text,
  issue_date   date,
  due_date     date,
  status       text not null default 'Draft' check (status in ('Draft','Sent','Paid','Overdue')),
  discount_pct numeric not null default 0,
  tax_pct      numeric not null default 0,
  notes        text,
  market       text not null default 'egypt' check (market in ('egypt','dubai','ksa','qatar')),
  created_at   timestamptz not null default now()
);

create table if not exists public.invoice_line_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  description text not null default '',
  qty         numeric not null default 1,
  unit_price  numeric not null default 0,
  sort        int not null default 0
);

create table if not exists public.quotations (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid references public.clinics (id) on delete set null,
  reference    text,
  issue_date   date,
  valid_until  date,
  status       text not null default 'Draft' check (status in ('Draft','Sent','Accepted','Declined')),
  discount_pct numeric not null default 0,
  tax_pct      numeric not null default 0,
  notes        text,
  market       text not null default 'egypt' check (market in ('egypt','dubai','ksa','qatar')),
  created_at   timestamptz not null default now()
);

create table if not exists public.quotation_line_items (
  id            uuid primary key default gen_random_uuid(),
  quotation_id  uuid not null references public.quotations (id) on delete cascade,
  description   text not null default '',
  qty           numeric not null default 1,
  unit_price    numeric not null default 0,
  sort          int not null default 0
);

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  description text not null,
  category    text not null default 'Other',
  vendor      text,
  date        date,
  amount      numeric not null default 0,
  notes       text,
  market      text not null default 'egypt' check (market in ('egypt','dubai','ksa','qatar')),
  created_at  timestamptz not null default now()
);

-- editable revenue-by-clinic-by-month grid (Finance > Overview)
create table if not exists public.revenue_cells (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  market     text not null check (market in ('egypt','dubai','ksa','qatar')),
  year       int not null,
  month      int not null check (month between 1 and 12),
  amount     numeric not null default 0,
  unique (clinic_id, year, month)
);

-- ---------------------------------------------------------------------------
-- documents (metadata; files live in the private `documents` storage bucket)
-- ---------------------------------------------------------------------------
create table if not exists public.country_documents (
  id            uuid primary key default gen_random_uuid(),
  country       text not null,
  name          text not null,
  storage_path  text not null,
  uploaded_at   timestamptz not null default now(),
  uploaded_by   uuid references public.profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- access matrix (role-group x module booleans, CEO toggles it)
-- ---------------------------------------------------------------------------
create table if not exists public.access_matrix (
  role_key    text not null check (role_key in ('marketing','operations','trainerSales','reception')),
  module_key  text not null check (module_key in ('ceo','providers','closer','trainer','documents','hr','faq')),
  allowed     boolean not null default false,
  primary key (role_key, module_key)
);

-- ---------------------------------------------------------------------------
-- FAQ
-- ---------------------------------------------------------------------------
create table if not exists public.faq_categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  sort  int not null default 0
);
create table if not exists public.faq_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.faq_categories (id) on delete cascade,
  q            text not null,
  a            text not null,
  sort         int not null default 0
);

-- ---------------------------------------------------------------------------
-- fx rates (CEO-editable, USD per 1 unit of local currency)
-- ---------------------------------------------------------------------------
create table if not exists public.fx_rates (
  market       text primary key check (market in ('egypt','dubai','ksa','qatar')),
  usd_per_unit numeric not null
);

-- ---------------------------------------------------------------------------
-- password reset requests (prototype's "forgot password" -> admin actions it)
-- ---------------------------------------------------------------------------
create table if not exists public.password_reset_requests (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists clinics_touch on public.clinics;
create trigger clinics_touch before update on public.clinics
  for each row execute function public.touch_updated_at();

drop trigger if exists employees_touch on public.employees;
create trigger employees_touch before update on public.employees
  for each row execute function public.touch_updated_at();

------------------------------ migrations/0002_rls.sql ------------------------------
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

------------------------------ migrations/0003_seed.sql ------------------------------
-- MediLink360 — demo seed data (ported from MediLink360 Pitch.dc.html state).
-- Safe to skip in production; gives the board content on first login.
-- Auth users are NOT seeded here — create them in Supabase Auth (see README),
-- the on_auth_user_created trigger fills public.profiles.

-- fx rates ------------------------------------------------------------------
insert into public.fx_rates (market, usd_per_unit) values
  ('egypt', 0.021), ('dubai', 0.272), ('ksa', 0.267), ('qatar', 0.275)
on conflict (market) do nothing;

-- access matrix defaults --------------------------------------------------
insert into public.access_matrix (role_key, module_key, allowed) values
  ('marketing','ceo',false),('marketing','providers',false),('marketing','closer',false),
  ('marketing','trainer',false),('marketing','documents',true),('marketing','hr',false),('marketing','faq',true),
  ('operations','ceo',false),('operations','providers',true),('operations','closer',true),
  ('operations','trainer',true),('operations','documents',true),('operations','hr',false),('operations','faq',true),
  ('trainerSales','ceo',false),('trainerSales','providers',false),('trainerSales','closer',true),
  ('trainerSales','trainer',true),('trainerSales','documents',false),('trainerSales','hr',false),('trainerSales','faq',true),
  ('reception','ceo',false),('reception','providers',true),('reception','closer',false),
  ('reception','trainer',false),('reception','documents',false),('reception','hr',false),('reception','faq',true)
on conflict (role_key, module_key) do nothing;

-- employees ---------------------------------------------------------------
insert into public.employees (name, email, phone, country, department, position, employment_type, status, start_date, currency)
values
  ('Ahmed',   'ahmed@medilink360.com',   '01011112222', 'Egypt', 'Sales',    'Sales',   'Full-time', 'active', '2025-09-01', 'USD'),
  ('Mona',    'mona@medilink360.com',    '01011112223', 'Egypt', 'Sales',    'Sales',   'Full-time', 'active', '2025-10-01', 'USD'),
  ('Layla',   'layla@medilink360.com',   '0501112223',  'UAE',   'Sales',    'Sales',   'Full-time', 'active', '2025-11-01', 'AED'),
  ('Nourhan', 'nourhan@medilink360.com', '01011112224', 'Egypt', 'Training', 'Trainer', 'Full-time', 'active', '2025-09-15', 'USD'),
  ('Youssef', 'youssef@medilink360.com', '01011112225', 'Egypt', 'Training', 'Trainer', 'Full-time', 'active', '2025-10-15', 'USD'),
  ('Omar',    'omar@medilink360.com',    '0501112224',  'UAE',   'Training', 'Trainer', 'Full-time', 'active', '2025-11-15', 'AED'),
  ('Fatima',  'fatima@medilink360.com',  '0501112225',  'UAE',   'Training', 'Trainer', 'Full-time', 'active', '2025-12-01', 'AED')
on conflict do nothing;

-- clinics ---------------------------------------------------------------
insert into public.clinics
  (name, cat, pri, area, contact, phone, closer, trainer, market, cs, ts, ai_score, mrr, overdue,
   trial_from, trial_to, sub_status, sub_reason, board_order)
values
  ('Cairo Family Clinic','General','Medium','Nasr City','Dr. Hoda Salem','01012345671','Ahmed',NULL,'egypt','lead',NULL,62,210,false,NULL,NULL,'active','',1),
  ('NewLife Pediatric Clinic','Pediatrics','Low','Maadi','Dr. Sara Nabil','01012345672','Ahmed',NULL,'egypt','lead',NULL,48,180,false,NULL,NULL,'active','',2),
  ('Dr. Samir Dental Center','Dental','High','Heliopolis','Dr. Samir Fahmy','01012345673','Ahmed',NULL,'egypt','followup',NULL,81,320,false,NULL,NULL,'active','',3),
  ('Al Shifa Polyclinic','Polyclinic','High','Giza','Dr. Khaled Adel','01012345674','Ahmed','Nourhan','egypt','signed','scheduled',88,420,true,'2026-06-27','2026-07-11','active','',4),
  ('Nile Skin Clinic','Dermatology','Medium','Zamalek','Dr. Rana Wagdy','01012345675','Mona',NULL,'egypt','followup',NULL,70,260,false,NULL,NULL,'active','',5),
  ('Smile Ortho Cairo','Dental','Medium','6th October','Dr. Tarek Nour','01012345676','Mona',NULL,'egypt','proposal',NULL,74,300,false,NULL,NULL,'active','',6),
  ('Cairo Heart Center','Cardiology','High','Dokki','Dr. Amr Hassan','01012345677','Mona',NULL,'egypt','lead',NULL,79,380,false,NULL,NULL,'active','',7),
  ('Green Valley Clinic','General','Low','Shubra','Dr. Nadia Fouad','01012345678','Ahmed',NULL,'egypt','lead',NULL,41,160,false,NULL,NULL,'active','',8),
  ('El Nour Eye Center','Ophthalmology','High','Nasr City','Dr. Yasser Kamal','01012345679','Ahmed','Youssef','egypt','signed','reception',90,360,false,'2026-05-20','2026-06-03','inactive','Clinic decided to stay with their existing paper-based system after the trial',9),
  ('Sakkara Medical','Polyclinic','Medium','Haram','Dr. Mostafa Zaki','01012345680','Ahmed','Nourhan','egypt','signed','live',85,400,false,'2026-05-01','2026-05-15','active','',10),
  ('Marina Health Clinic','General','High','Dubai Marina','Dr. Sana Malik','0501234561','Layla',NULL,'dubai','lead',NULL,83,520,false,NULL,NULL,'active','',1),
  ('Jumeirah Dental','Dental','Medium','Jumeirah','Dr. Omar Sheikh','0501234562','Layla',NULL,'dubai','lead',NULL,69,480,false,NULL,NULL,'active','',2),
  ('Deira Family Medical','Polyclinic','High','Deira','Dr. Aisha Karim','0501234563','Layla','Omar','dubai','signed','scheduled',87,640,true,'2026-06-26','2026-07-10','active','',3),
  ('Palm Pediatrics','Pediatrics','Low','Palm Jumeirah','Dr. Reem Ali','0501234564','Layla',NULL,'dubai','lead',NULL,52,500,false,NULL,NULL,'active','',4),
  ('Downtown Derma','Dermatology','Medium','Downtown','Dr. Hana Yousef','0501234565','Layla',NULL,'dubai','signed',NULL,72,560,false,'2026-07-01','2026-07-15','active','',5),
  ('Al Barsha Polyclinic','Polyclinic','High','Al Barsha','Dr. Faisal Noor','0501234566','Layla','Fatima','dubai','signed','followup',91,700,false,'2026-06-01','2026-06-15','active','',6)
on conflict do nothing;

-- one seed comment (matches the prototype)
insert into public.clinic_comments (clinic_id, author, text, type, created_at)
select id, 'Ahmed', 'Booked a visit for Thursday morning.', 'Note', now() - interval '1 day'
from public.clinics where name = 'NewLife Pediatric Clinic'
on conflict do nothing;

-- FAQ -----------------------------------------------------------------
with c as (
  insert into public.faq_categories (name, sort) values
    ('Company', 0), ('Sales', 1), ('Implementation', 2)
  returning id, name
)
insert into public.faq_items (category_id, q, a, sort)
select c.id, v.q, v.a, v.sort from c join (values
  ('Company','What is Medilink360?','Medilink360 is a patient management platform that connects clinics, healthcare providers, and patients into one digital ecosystem.',0),
  ('Company','What problem are we solving?','Healthcare providers often struggle with disconnected systems, manual workflows, paper records, and fragmented patient experiences. Medilink360 simplifies healthcare operations while improving the patient journey.',1),
  ('Company','What is our mission?','To simplify healthcare through connected digital experiences.',2),
  ('Company','What is our vision?','To become the leading healthcare technology platform across the Middle East and Africa.',3),
  ('Sales','What does Medilink360 actually do?','It helps clinics manage appointments, organize medical records, improve patient communication, streamline clinic operations, and support digital transformation.',0),
  ('Sales','Who is our ideal customer?','Primary: Private Clinics, Medical Centers, Dental Clinics, Specialized Practices. Secondary: Hospitals, Medical Groups, Diagnostic Centers.',1),
  ('Sales','What makes Medilink360 different?','Instead of replacing clinic operations, we connect people, data, and workflows into one platform.',2),
  ('Implementation','What happens after a clinic signs?','Welcome Meeting, Requirements Collection, Clinic Profile Setup, Staff Training, Go Live, Follow-up Support.',0)
) as v(cat, q, a, sort) on v.cat = c.name;

------------------------------ migrations/0004_realtime.sql ------------------------------
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

------------------------------ migrations/0005_attachments.sql ------------------------------
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

------------------------------ migrations/0006_finance_admin_only.sql ------------------------------
-- MediLink360 — restrict the Finance tables to CEO / Admin only.
-- 0002 gave every active user read access and every staff writer (Sales,
-- Trainer included) write access to these tables. Finance must be
-- CEO/Admin-only for BOTH read and write. Depends on 0001 + 0002.

do $$
declare
  t text;
begin
  foreach t in array array[
    'invoices',
    'invoice_line_items',
    'quotations',
    'quotation_line_items',
    'expenses',
    'revenue_cells'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    -- drop the permissive policies from 0002 (and this one, so re-runs are safe)
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    -- CEO / Admin only, read and write
    execute format(
      'create policy %I_admin_all on public.%I for all using (public.is_ceo_or_admin()) with check (public.is_ceo_or_admin())',
      t, t
    );
  end loop;
end $$;

------------------------------ migrations/0007_role_hierarchy.sql ------------------------------
-- MediLink360 — account-management hierarchy.
--
--   Admin   = immutable root. No one can change or pause an Admin from the
--             app; Admin accounts are managed only in the Supabase dashboard.
--   Admin   can change the role of, and pause/restore, any CEO or staff login.
--   CEO     can change the role of, and pause/restore, Sales / Trainer only.
--   Sales / Trainer can still edit their own name.
--
-- Enforced in the DB so it holds even against direct API calls. The
-- Team Access screen mirrors these rules in the UI.
-- Depends on 0001 + 0002.

create or replace function public.guard_profile_privilege()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor text := (select role from public.profiles where id = auth.uid());
  role_or_active_changed boolean :=
    (new.role is distinct from old.role) or (new.active is distinct from old.active);
begin
  -- 0. The Supabase dashboard / service-role key (no auth.uid()) bypasses
  --    every guard — that's how Admins are created and managed.
  if auth.uid() is null then
    return new;
  end if;

  -- 1. An Admin row is untouchable from the app.
  if old.role = 'Admin' then
    if new.role  is distinct from old.role
       or new.active is distinct from old.active
       or new.name  is distinct from old.name
       or new.email is distinct from old.email then
      raise exception 'Admin accounts can only be changed in Supabase';
    end if;
    return new;
  end if;

  -- 2. The Admin role is never granted from the app.
  if new.role = 'Admin' and old.role is distinct from 'Admin' then
    raise exception 'The Admin role is assigned in Supabase only';
  end if;

  -- 3. Only an Admin may change a CEO's role or active flag.
  if old.role = 'CEO' and role_or_active_changed and actor is distinct from 'Admin' then
    raise exception 'Only an Admin can change a CEO account';
  end if;

  -- 4. Changing anyone's role/active requires the actor to be CEO or Admin.
  if role_or_active_changed and actor not in ('CEO', 'Admin') then
    raise exception 'Not allowed to change role or account status';
  end if;

  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_privilege();

-- Deletes: same protection for Admin / CEO rows.
create or replace function public.guard_profile_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor text := (select role from public.profiles where id = auth.uid());
begin
  if auth.uid() is null then
    return old; -- dashboard / service role bypasses
  end if;
  if old.role = 'Admin' then
    raise exception 'Admin accounts can only be removed in Supabase';
  end if;
  if old.role = 'CEO' and actor is distinct from 'Admin' then
    raise exception 'Only an Admin can remove a CEO account';
  end if;
  return old;
end $$;

drop trigger if exists profiles_guard_delete on public.profiles;
create trigger profiles_guard_delete
  before delete on public.profiles
  for each row execute function public.guard_profile_delete();

------------------------------ migrations/0008_profiles_read_scope.sql ------------------------------
-- MediLink360 — hide Admin accounts from CEO / staff at the data layer.
--
--   own row      — always visible (needed for sign-in)
--   Admin        — sees every profile
--   CEO          — sees every profile EXCEPT Admin rows
--   Sales/Trainer— sees only their own row
--
-- The app never reads `profiles` except for the current user and the
-- Team Access screen, so this is safe to tighten. Depends on 0001 + 0002.

drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_read on public.profiles;

create policy profiles_read on public.profiles
  for select
  using (
    id = auth.uid()
    or public.current_role() = 'Admin'
    or (public.current_role() = 'CEO' and role <> 'Admin')
  );

