-- MediLink360 — add a "Not Interested" sales stage.
--
-- Lets Sales mark a clinic as declined/lost at any point in the pipeline,
-- from the Leads list or the Sales Closer board. Depends on 0010 (which
-- created the current clinics_cs_check constraint).

alter table public.clinics drop constraint if exists clinics_cs_check;
alter table public.clinics
  add constraint clinics_cs_check
  check (cs in ('lead', 'visit', 'followup', 'proposal', 'commission', 'signed', 'not_interested'));
