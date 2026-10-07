-- Link a clinic to its contract folder (Google Drive / OneDrive / local).
--   contract_folder     the folder's name exactly as it appears on disk, so a
--                       name copied from Finder/Explorer finds the clinic.
--   contract_folder_url optional share link that opens the folder in one click.
alter table public.clinics
  add column if not exists contract_folder text,
  add column if not exists contract_folder_url text;
