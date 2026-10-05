-- MediLink360 — add an "On Hold / Cancel" sales stage.
--
-- Shown as its own column on the Sales Closer board. Depends on 0013 (which
-- created the current clinics_cs_check constraint).

alter table public.clinics drop constraint if exists clinics_cs_check;
alter table public.clinics
  add constraint clinics_cs_check
  check (cs in ('lead', 'visit', 'followup', 'proposal', 'commission', 'signed', 'not_interested', 'on_hold'));
