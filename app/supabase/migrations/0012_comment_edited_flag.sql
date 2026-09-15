-- MediLink360 — track whether a clinic comment has been edited.
--
-- Depends on 0001.

alter table public.clinic_comments add column if not exists edited boolean not null default false;
