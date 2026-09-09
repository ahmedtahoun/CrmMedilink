-- MediLink360 — hide Admin accounts from CEO / staff at the data layer.
--
--   own row      — always visible (needed for sign-in)
--   Admin        — sees every profile
--   CEO          — sees every profile EXCEPT Admin rows
--   Sales/Trainer— sees only their own row
--
-- The app never reads `profiles` except for the current user and the
-- Team Access screen, so this is safe to tighten. Depends on 0001 + 0002.

drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_read on public.profiles;

create policy profiles_read on public.profiles
  for select
  using (
    id = auth.uid()
    or public.current_role() = 'Admin'
    or (public.current_role() = 'CEO' and role <> 'Admin')
  );
