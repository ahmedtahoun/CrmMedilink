-- MediLink360 — per-user market (country) scoping.
--
--   A Sales or Trainer login can be pinned to ONE market by a CEO / Admin in
--   the Team Access screen. Once pinned, that login only ever sees and edits
--   that market's clinics, calendar, comments, training sessions and tasks.
--   CEO / Admin are never pinned (market is null = every market). An unpinned
--   Sales / Trainer login keeps seeing everything, exactly as before.
--
-- Enforced in the DB so it holds against direct API calls too; the Team
-- Access screen mirrors the rule in the UI.
--
-- Depends on 0001 + 0002 (+ 0006, which already locked the Finance tables to
-- CEO / Admin — those need no market scoping).

alter table public.profiles
  add column if not exists market text
  check (market is null or market in ('egypt', 'dubai', 'ksa', 'qatar'));

grant update (name, email, role, active, market) on public.profiles to authenticated;

-- caller's assigned market (null for CEO / Admin or an unpinned staff login)
create or replace function public.current_market()
returns text
language sql
stable
security definer set search_path = public
as $$
  select market from public.profiles where id = auth.uid()
$$;

-- true when the caller may see / act on a row belonging to market <m>
create or replace function public.market_ok(m text)
returns boolean
language sql
stable
as $$
  select public.is_ceo_or_admin()
      or public.current_market() is null
      or m = public.current_market()
$$;

-- ---------------------------------------------------------------------------
-- Market-bearing operational tables: read + write both honour the caller's
-- assigned market. Replaces the _read / _write policies from 0002.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clinics', 'calendar_events']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format(
      'create policy %I_read on public.%I for select using (public.is_active_user() and public.market_ok(market))',
      t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format(
      'create policy %I_write on public.%I for all using (public.is_staff_writer() and public.market_ok(market)) with check (public.is_staff_writer() and public.market_ok(market))',
      t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Clinic children have no market column of their own — gate them through the
-- parent clinic's market.
-- ---------------------------------------------------------------------------
drop policy if exists clinic_comments_read on public.clinic_comments;
create policy clinic_comments_read on public.clinic_comments for select using (
  public.is_active_user() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = clinic_comments.clinic_id and c.market = public.current_market())
  ));
drop policy if exists clinic_comments_write on public.clinic_comments;
create policy clinic_comments_write on public.clinic_comments for all using (
  public.is_staff_writer() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = clinic_comments.clinic_id and c.market = public.current_market())
  )) with check (
  public.is_staff_writer() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = clinic_comments.clinic_id and c.market = public.current_market())
  ));

drop policy if exists training_sessions_read on public.training_sessions;
create policy training_sessions_read on public.training_sessions for select using (
  public.is_active_user() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = training_sessions.clinic_id and c.market = public.current_market())
  ));
drop policy if exists training_sessions_write on public.training_sessions;
create policy training_sessions_write on public.training_sessions for all using (
  public.is_staff_writer() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = training_sessions.clinic_id and c.market = public.current_market())
  )) with check (
  public.is_staff_writer() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = training_sessions.clinic_id and c.market = public.current_market())
  ));

drop policy if exists clinic_tasks_read on public.clinic_tasks;
create policy clinic_tasks_read on public.clinic_tasks for select using (
  public.is_active_user() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = clinic_tasks.clinic_id and c.market = public.current_market())
  ));
drop policy if exists clinic_tasks_write on public.clinic_tasks;
create policy clinic_tasks_write on public.clinic_tasks for all using (
  public.is_staff_writer() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = clinic_tasks.clinic_id and c.market = public.current_market())
  )) with check (
  public.is_staff_writer() and (
    public.is_ceo_or_admin() or public.current_market() is null
    or exists (select 1 from public.clinics c where c.id = clinic_tasks.clinic_id and c.market = public.current_market())
  ));

-- ---------------------------------------------------------------------------
-- Team Access: only a CEO / Admin may set a login's market, only Sales /
-- Trainer rows can carry one, and CEO / Admin rows are force-cleared.
-- Extends the 0007 guard.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privilege()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor text := (select role from public.profiles where id = auth.uid());
  role_or_active_changed boolean :=
    (new.role is distinct from old.role) or (new.active is distinct from old.active);
  market_changed boolean := (new.market is distinct from old.market);
begin
  -- 0. dashboard / service-role key (no auth.uid()) bypasses every guard.
  if auth.uid() is null then
    return new;
  end if;

  -- 1. An Admin row is untouchable from the app.
  if old.role = 'Admin' then
    if new.role   is distinct from old.role
       or new.active is distinct from old.active
       or new.name   is distinct from old.name
       or new.email  is distinct from old.email
       or new.market is distinct from old.market then
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

  -- 5. Market pinning.
  if market_changed and actor not in ('CEO', 'Admin') then
    raise exception 'Only a CEO or Admin can change a login''s market';
  end if;
  -- CEO / Admin logins are never market-scoped.
  if new.role in ('CEO', 'Admin') then
    new.market := null;
  end if;

  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_privilege();
