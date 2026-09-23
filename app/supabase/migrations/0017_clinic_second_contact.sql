-- A second point of contact at the clinic, alongside the primary one.
alter table public.clinics
  add column if not exists contact2 text,
  add column if not exists contact2_phone text;
