-- MediLink360 — clear demo/test data, go live.
--
-- Run this ONCE in Supabase → SQL Editor when you're ready to stop testing
-- and start using the CRM for real. It is irreversible — there is no undo.
--
-- What it clears: every clinic (and everything hanging off a clinic —
-- comments, training sessions, tasks, revenue cells), the calendar,
-- invoices/quotations (and their line items), expenses, the employee
-- directory, and the per-country uploaded-document ROWS.
--
-- What it KEEPS: every team login (profiles / auth.users — CEO, Admin,
-- Sales, Trainer), the Manage Access matrix, the FX rates, and the FAQ
-- content (that's real reference content, not test data).
--
-- Note: this does NOT delete the actual uploaded files sitting in the
-- `documents` Storage bucket — Supabase blocks direct SQL deletes on
-- storage.objects ("Use the Storage API instead"). Clear those files
-- separately: Dashboard → Storage → documents → select all → Delete, or run
-- clear_documents_bucket.mjs alongside this file.
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

commit;
