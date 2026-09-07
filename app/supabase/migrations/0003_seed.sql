-- MediLink360 — demo seed data (ported from MediLink360 Pitch.dc.html state).
-- Safe to skip in production; gives the board content on first login.
-- Auth users are NOT seeded here — create them in Supabase Auth (see README),
-- the on_auth_user_created trigger fills public.profiles.

-- fx rates ------------------------------------------------------------------
insert into public.fx_rates (market, usd_per_unit) values
  ('egypt', 0.021), ('dubai', 0.272), ('ksa', 0.267), ('qatar', 0.275)
on conflict (market) do nothing;

-- access matrix defaults --------------------------------------------------
insert into public.access_matrix (role_key, module_key, allowed) values
  ('marketing','ceo',false),('marketing','providers',false),('marketing','closer',false),
  ('marketing','trainer',false),('marketing','documents',true),('marketing','hr',false),('marketing','faq',true),
  ('operations','ceo',false),('operations','providers',true),('operations','closer',true),
  ('operations','trainer',true),('operations','documents',true),('operations','hr',false),('operations','faq',true),
  ('trainerSales','ceo',false),('trainerSales','providers',false),('trainerSales','closer',true),
  ('trainerSales','trainer',true),('trainerSales','documents',false),('trainerSales','hr',false),('trainerSales','faq',true),
  ('reception','ceo',false),('reception','providers',true),('reception','closer',false),
  ('reception','trainer',false),('reception','documents',false),('reception','hr',false),('reception','faq',true)
on conflict (role_key, module_key) do nothing;

-- employees ---------------------------------------------------------------
insert into public.employees (name, email, phone, country, department, position, employment_type, status, start_date, currency)
values
  ('Ahmed',   'ahmed@medilink360.com',   '01011112222', 'Egypt', 'Sales',    'Sales',   'Full-time', 'active', '2025-09-01', 'USD'),
  ('Mona',    'mona@medilink360.com',    '01011112223', 'Egypt', 'Sales',    'Sales',   'Full-time', 'active', '2025-10-01', 'USD'),
  ('Layla',   'layla@medilink360.com',   '0501112223',  'UAE',   'Sales',    'Sales',   'Full-time', 'active', '2025-11-01', 'AED'),
  ('Nourhan', 'nourhan@medilink360.com', '01011112224', 'Egypt', 'Training', 'Trainer', 'Full-time', 'active', '2025-09-15', 'USD'),
  ('Youssef', 'youssef@medilink360.com', '01011112225', 'Egypt', 'Training', 'Trainer', 'Full-time', 'active', '2025-10-15', 'USD'),
  ('Omar',    'omar@medilink360.com',    '0501112224',  'UAE',   'Training', 'Trainer', 'Full-time', 'active', '2025-11-15', 'AED'),
  ('Fatima',  'fatima@medilink360.com',  '0501112225',  'UAE',   'Training', 'Trainer', 'Full-time', 'active', '2025-12-01', 'AED')
on conflict do nothing;

-- clinics ---------------------------------------------------------------
insert into public.clinics
  (name, cat, pri, area, contact, phone, closer, trainer, market, cs, ts, ai_score, mrr, overdue,
   trial_from, trial_to, sub_status, sub_reason, board_order)
values
  ('Cairo Family Clinic','General','Medium','Nasr City','Dr. Hoda Salem','01012345671','Ahmed',NULL,'egypt','lead',NULL,62,210,false,NULL,NULL,'active','',1),
  ('NewLife Pediatric Clinic','Pediatrics','Low','Maadi','Dr. Sara Nabil','01012345672','Ahmed',NULL,'egypt','lead',NULL,48,180,false,NULL,NULL,'active','',2),
  ('Dr. Samir Dental Center','Dental','High','Heliopolis','Dr. Samir Fahmy','01012345673','Ahmed',NULL,'egypt','followup',NULL,81,320,false,NULL,NULL,'active','',3),
  ('Al Shifa Polyclinic','Polyclinic','High','Giza','Dr. Khaled Adel','01012345674','Ahmed','Nourhan','egypt','signed','scheduled',88,420,true,'2026-06-27','2026-07-11','active','',4),
  ('Nile Skin Clinic','Dermatology','Medium','Zamalek','Dr. Rana Wagdy','01012345675','Mona',NULL,'egypt','followup',NULL,70,260,false,NULL,NULL,'active','',5),
  ('Smile Ortho Cairo','Dental','Medium','6th October','Dr. Tarek Nour','01012345676','Mona',NULL,'egypt','proposal',NULL,74,300,false,NULL,NULL,'active','',6),
  ('Cairo Heart Center','Cardiology','High','Dokki','Dr. Amr Hassan','01012345677','Mona',NULL,'egypt','lead',NULL,79,380,false,NULL,NULL,'active','',7),
  ('Green Valley Clinic','General','Low','Shubra','Dr. Nadia Fouad','01012345678','Ahmed',NULL,'egypt','lead',NULL,41,160,false,NULL,NULL,'active','',8),
  ('El Nour Eye Center','Ophthalmology','High','Nasr City','Dr. Yasser Kamal','01012345679','Ahmed','Youssef','egypt','signed','reception',90,360,false,'2026-05-20','2026-06-03','inactive','Clinic decided to stay with their existing paper-based system after the trial',9),
  ('Sakkara Medical','Polyclinic','Medium','Haram','Dr. Mostafa Zaki','01012345680','Ahmed','Nourhan','egypt','signed','live',85,400,false,'2026-05-01','2026-05-15','active','',10),
  ('Marina Health Clinic','General','High','Dubai Marina','Dr. Sana Malik','0501234561','Layla',NULL,'dubai','lead',NULL,83,520,false,NULL,NULL,'active','',1),
  ('Jumeirah Dental','Dental','Medium','Jumeirah','Dr. Omar Sheikh','0501234562','Layla',NULL,'dubai','lead',NULL,69,480,false,NULL,NULL,'active','',2),
  ('Deira Family Medical','Polyclinic','High','Deira','Dr. Aisha Karim','0501234563','Layla','Omar','dubai','signed','scheduled',87,640,true,'2026-06-26','2026-07-10','active','',3),
  ('Palm Pediatrics','Pediatrics','Low','Palm Jumeirah','Dr. Reem Ali','0501234564','Layla',NULL,'dubai','lead',NULL,52,500,false,NULL,NULL,'active','',4),
  ('Downtown Derma','Dermatology','Medium','Downtown','Dr. Hana Yousef','0501234565','Layla',NULL,'dubai','signed',NULL,72,560,false,'2026-07-01','2026-07-15','active','',5),
  ('Al Barsha Polyclinic','Polyclinic','High','Al Barsha','Dr. Faisal Noor','0501234566','Layla','Fatima','dubai','signed','followup',91,700,false,'2026-06-01','2026-06-15','active','',6)
on conflict do nothing;

-- one seed comment (matches the prototype)
insert into public.clinic_comments (clinic_id, author, text, type, created_at)
select id, 'Ahmed', 'Booked a visit for Thursday morning.', 'Note', now() - interval '1 day'
from public.clinics where name = 'NewLife Pediatric Clinic'
on conflict do nothing;

-- FAQ -----------------------------------------------------------------
with c as (
  insert into public.faq_categories (name, sort) values
    ('Company', 0), ('Sales', 1), ('Implementation', 2)
  returning id, name
)
insert into public.faq_items (category_id, q, a, sort)
select c.id, v.q, v.a, v.sort from c join (values
  ('Company','What is Medilink360?','Medilink360 is a patient management platform that connects clinics, healthcare providers, and patients into one digital ecosystem.',0),
  ('Company','What problem are we solving?','Healthcare providers often struggle with disconnected systems, manual workflows, paper records, and fragmented patient experiences. Medilink360 simplifies healthcare operations while improving the patient journey.',1),
  ('Company','What is our mission?','To simplify healthcare through connected digital experiences.',2),
  ('Company','What is our vision?','To become the leading healthcare technology platform across the Middle East and Africa.',3),
  ('Sales','What does Medilink360 actually do?','It helps clinics manage appointments, organize medical records, improve patient communication, streamline clinic operations, and support digital transformation.',0),
  ('Sales','Who is our ideal customer?','Primary: Private Clinics, Medical Centers, Dental Clinics, Specialized Practices. Secondary: Hospitals, Medical Groups, Diagnostic Centers.',1),
  ('Sales','What makes Medilink360 different?','Instead of replacing clinic operations, we connect people, data, and workflows into one platform.',2),
  ('Implementation','What happens after a clinic signs?','Welcome Meeting, Requirements Collection, Clinic Profile Setup, Staff Training, Go Live, Follow-up Support.',0)
) as v(cat, q, a, sort) on v.cat = c.name;
