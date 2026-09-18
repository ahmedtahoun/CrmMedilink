-- MediLink360 — HR leave calendar: employee leave tracking + public holidays.
--
-- Lets the CEO/Admin log Annual/Sick/Casual leave per employee and per-country
-- public holidays, and see both on a month calendar in the HR workspace.

create table if not exists public.employee_leaves (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  type         text not null check (type in ('Annual', 'Sick', 'Casual')),
  start_date   date not null,
  end_date     date not null,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.public_holidays (
  id          uuid primary key default gen_random_uuid(),
  country     text not null,
  name        text not null,
  date        date not null,
  created_at  timestamptz not null default now()
);

create index if not exists employee_leaves_employee_id_idx on public.employee_leaves(employee_id);
create index if not exists employee_leaves_dates_idx on public.employee_leaves(start_date, end_date);
create index if not exists public_holidays_date_idx on public.public_holidays(date);

-- Same read/write split as the rest of the HR tables (employees, etc.):
-- any active user can read, only CEO/Admin can write.
do $$
declare t text;
begin
  foreach t in array array['employee_leaves', 'public_holidays']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (public.is_active_user())', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for all using (public.is_ceo_or_admin()) with check (public.is_ceo_or_admin())', t, t);
  end loop;
end $$;
