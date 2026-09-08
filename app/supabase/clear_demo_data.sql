-- MediLink360 — remove the demo/dummy records from 0003_seed.sql.
-- Run this ONCE, right before you start entering real clinics and staff.
--
-- KEEPS (real config/content, not dummy):
--   * fx_rates          — currency conversion rates
--   * access_matrix     — role -> workspace permissions
--   * faq_categories / faq_items — company/sales/implementation answers
--
-- REMOVES:
--   * the 16 seed clinics + everything linked to them
--     (comments, sessions, tasks, calendar events, invoices, quotations,
--      revenue cells)
--   * the 7 seed employees
--
-- Anything you have added yourself is untouched — the filters below only
-- match the exact seed rows.

begin;

-- seed clinics by name (from 0003_seed.sql)
with demo as (
  select id from public.clinics where name in (
    'Cairo Family Clinic','NewLife Pediatric Clinic','Dr. Samir Dental Center',
    'Al Shifa Polyclinic','Nile Skin Clinic','Smile Ortho Cairo','Cairo Heart Center',
    'Green Valley Clinic','El Nour Eye Center','Sakkara Medical',
    'Marina Health Clinic','Jumeirah Dental','Deira Family Medical','Palm Pediatrics',
    'Downtown Derma','Al Barsha Polyclinic'
  )
)
delete from public.clinics where id in (select id from demo);
-- clinic_comments / training_sessions / clinic_tasks / revenue_cells /
-- invoices / quotations drop via ON DELETE CASCADE. 0003 seeds no calendar
-- events, so nothing to clean there.

-- seed employees by email (from 0003_seed.sql)
delete from public.employees where email in (
  'ahmed@medilink360.com','mona@medilink360.com','layla@medilink360.com',
  'nourhan@medilink360.com','youssef@medilink360.com','omar@medilink360.com',
  'fatima@medilink360.com'
);

commit;
