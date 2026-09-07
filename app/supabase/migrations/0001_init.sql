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
