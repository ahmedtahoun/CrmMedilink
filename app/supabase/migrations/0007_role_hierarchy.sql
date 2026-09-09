-- MediLink360 — account-management hierarchy.
--
--   Admin   = immutable root. No one can change or pause an Admin from the
--             app; Admin accounts are managed only in the Supabase dashboard.
--   Admin   can change the role of, and pause/restore, any CEO or staff login.
--   CEO     can change the role of, and pause/restore, Sales / Trainer only.
--   Sales / Trainer can still edit their own name.
--
-- Enforced in the DB so it holds even against direct API calls. The
-- Team Access screen mirrors these rules in the UI.
-- Depends on 0001 + 0002.

create or replace function public.guard_profile_privilege()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor text := (select role from public.profiles where id = auth.uid());
  role_or_active_changed boolean :=
    (new.role is distinct from old.role) or (new.active is distinct from old.active);
begin
  -- 0. The Supabase dashboard / service-role key (no auth.uid()) bypasses
  --    every guard — that's how Admins are created and managed.
  if auth.uid() is null then
    return new;
  end if;

  -- 1. An Admin row is untouchable from the app.
  if old.role = 'Admin' then
    if new.role  is distinct from old.role
       or new.active is distinct from old.active
       or new.name  is distinct from old.name
       or new.email is distinct from old.email then
      raise exception 'Admin accounts can only be changed in Supabase';
    end if;
    return new;
  end if;

  -- 2. The Admin role is never granted from the app.
  if new.role = 'Admin' and old.role is distinct from 'Admin' then
    raise exception 'The Admin role is assigned in Supabase only';
  end if;

  -- 3. Only an Admin may change a CEO's role or active flag.
  if old.role = 'CEO' and role_or_active_changed and actor is distinct from 'Admin' then
    raise exception 'Only an Admin can change a CEO account';
  end if;

  -- 4. Changing anyone's role/active requires the actor to be CEO or Admin.
  if role_or_active_changed and actor not in ('CEO', 'Admin') then
    raise exception 'Not allowed to change role or account status';
  end if;

  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_privilege();

-- Deletes: same protection for Admin / CEO rows.
create or replace function public.guard_profile_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor text := (select role from public.profiles where id = auth.uid());
begin
  if auth.uid() is null then
    return old; -- dashboard / service role bypasses
  end if;
  if old.role = 'Admin' then
    raise exception 'Admin accounts can only be removed in Supabase';
  end if;
  if old.role = 'CEO' and actor is distinct from 'Admin' then
    raise exception 'Only an Admin can remove a CEO account';
  end if;
  return old;
end $$;

drop trigger if exists profiles_guard_delete on public.profiles;
create trigger profiles_guard_delete
  before delete on public.profiles
  for each row execute function public.guard_profile_delete();
