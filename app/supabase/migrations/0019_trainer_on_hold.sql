-- MediLink360 — add an "On Hold / Cancel" training stage (Training board column).
-- Builds on 0015, which set the current clinics_ts_check constraint.

alter table public.clinics drop constraint if exists clinics_ts_check;
alter table public.clinics
  add constraint clinics_ts_check
  check (ts in ('handoff', 'scheduled', 'reception', 'live', 'on_hold'));
