-- MediLink360 — categories and specialties are now one list (clinics.cat holds
-- the specialty). Map the old category names onto the new specialty names.
-- 'Polyclinic' has no equivalent in the list and is left as is.

update public.clinics set cat = case cat
  when 'General' then 'General Practice'
  when 'Pediatrics' then 'Pediatrics & Neonatology'
  when 'Dental' then 'Dentistry'
  when 'Cardiology' then 'Cardiology & Vascular Medicine'
  when 'Gynecology' then 'Obstetrics & Gynecology'
  else cat
end
where cat in ('General', 'Pediatrics', 'Dental', 'Cardiology', 'Gynecology');
