-- MediLink360 — restrict the Finance tables to CEO / Admin only.
-- 0002 gave every active user read access and every staff writer (Sales,
-- Trainer included) write access to these tables. Finance must be
-- CEO/Admin-only for BOTH read and write. Depends on 0001 + 0002.

do $$
declare
  t text;
begin
  foreach t in array array[
    'invoices',
    'invoice_line_items',
    'quotations',
    'quotation_line_items',
    'expenses',
    'revenue_cells'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    -- drop the permissive policies from 0002 (and this one, so re-runs are safe)
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    -- CEO / Admin only, read and write
    execute format(
      'create policy %I_admin_all on public.%I for all using (public.is_ceo_or_admin()) with check (public.is_ceo_or_admin())',
      t, t
    );
  end loop;
end $$;
