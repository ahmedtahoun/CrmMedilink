-- MediLink360 — add a "Follow up later" sales stage (board column).
-- Re-states the full list so it works whether or not 0016 has been run.

alter table public.clinics drop constraint if exists clinics_cs_check;
alter table public.clinics
  add constraint clinics_cs_check
  check (cs in ('lead', 'visit', 'followup', 'proposal', 'commission', 'signed', 'not_interested', 'follow_up_later', 'on_hold'));
