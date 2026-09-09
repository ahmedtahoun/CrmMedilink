-- MediLink360 — split the first sales stage into "Leads" then "Visits".
--
-- Until now clinics.cs = 'lead' was labelled "Visits" and every newly added
-- clinic landed straight there. We now want:
--
--   lead    -> "Leads"   (where every newly added clinic starts)
--   visit   -> "Visits"  (Sales moves it here after the first visit)
--   followup / proposal / commission / signed  (unchanged)
--
-- The app default for a new clinic stays 'lead', which now means "Leads".
-- Existing 'lead' rows stay 'lead' and simply show under the new Leads column.
--
-- Depends on 0001.

alter table public.clinics drop constraint if exists clinics_cs_check;
alter table public.clinics
  add constraint clinics_cs_check
  check (cs in ('lead', 'visit', 'followup', 'proposal', 'commission', 'signed'));
