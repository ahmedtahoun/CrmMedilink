-- Commission % the clinic agreed to, for commission-based deals.
alter table public.clinics
  add column if not exists commission_pct numeric;
