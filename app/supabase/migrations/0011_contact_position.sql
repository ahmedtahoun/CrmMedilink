-- MediLink360 — add a contact position/title field to clinics.
--
-- Lets Sales record who the contact person is (e.g. "Reception",
-- "Marketing", "Owner") alongside their name — shown as
-- "Dr. Doaa Abdelsabour / Reception" across the Leads list and the clinic
-- detail modal.
--
-- Depends on 0001.

alter table public.clinics add column if not exists contact_position text;
