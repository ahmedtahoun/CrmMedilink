-- MediLink360 — private `attachments` bucket for clinic file uploads
-- (separate from `documents`, which is CEO/Admin-only). Any active staff
-- writer can add/remove clinic attachments.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects
  for select using (bucket_id = 'attachments' and public.is_active_user());

drop policy if exists attachments_write on storage.objects;
create policy attachments_write on storage.objects
  for insert with check (bucket_id = 'attachments' and public.is_staff_writer());

drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects
  for delete using (bucket_id = 'attachments' and public.is_staff_writer());
