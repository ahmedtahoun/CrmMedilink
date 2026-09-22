-- Track who created each lead/clinic, so it can be shown and audited later.
alter table public.clinics
  add column if not exists created_by text,
  add column if not exists created_by_id uuid references public.profiles (id) on delete set null;
