-- MediLink360 — trainer pipeline: drop "Follow-up Session", rename
-- "Training Scheduled" to "Onboarded" (label only; the 'scheduled' key stays).
--
-- Clinics currently in Follow-up Session move back to Reception Training
-- (they haven't been marked Live yet), then the check constraint is tightened.

update public.clinics set ts = 'reception' where ts = 'followup';

alter table public.clinics drop constraint if exists clinics_ts_check;
alter table public.clinics
  add constraint clinics_ts_check
  check (ts in ('handoff', 'scheduled', 'reception', 'live'));
