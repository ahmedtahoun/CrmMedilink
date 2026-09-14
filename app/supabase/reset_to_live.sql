-- MediLink360 — clear demo/test data, go live.
--
-- Run this ONCE in Supabase → SQL Editor when you're ready to stop testing
-- and start using the CRM for real. It is irreversible — there is no undo.
--
-- What it clears: every clinic (and everything hanging off a clinic —
-- comments, training sessions, tasks, revenue cells), the calendar,
-- invoices/quotations (and their line items), expenses, the employee
-- directory, and the per-country uploaded documents (both the DB rows and
-- the actual files in Storage).
--
-- What it KEEPS: every team login (profiles / auth.users — CEO, Admin,
-- Sales, Trainer), the Manage Access matrix, the FX rates, and the FAQ
-- content (that's real reference content, not test data).
--
-- Take a Supabase backup first if you want a safety net (Database → Backups).

begin;

truncate table
  public.clinics,
  public.calendar_events,
  public.invoices,
  public.quotations,
  public.expenses,
  public.employees,
  public.country_documents,
  public.password_reset_requests
cascade;
-- cascade also empties: clinic_comments, training_sessions, clinic_tasks,
-- revenue_cells, invoice_line_items, quotation_line_items.

-- Storage: delete the actual uploaded files in the `documents` bucket
-- (the country_documents rows pointing at them are already gone above).
delete from storage.objects where bucket_id = 'documents';

commit;
