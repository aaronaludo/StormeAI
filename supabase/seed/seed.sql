-- Optional local development seed data. Requires an authenticated user to be added manually for memberships.
insert into public.clinics (id, name, slug, clinic_type, email, city, country)
values ('00000000-0000-4000-8000-000000000001', 'Storme Dental Clinic', 'storme-dental-clinic', 'Dental Clinic', 'hello@stormeai.local', 'Makati', 'PH')
on conflict (slug) do nothing;

insert into public.ai_receptionists (clinic_id, name, tone, language_style)
values ('00000000-0000-4000-8000-000000000001', 'Mia', 'warm, professional, concise', 'English + Taglish when appropriate')
on conflict (clinic_id) do nothing;
