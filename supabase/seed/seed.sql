-- Optional local development seed data. Requires an authenticated user to be added manually for memberships.
insert into public.organizations (id, name, slug, organization_type, email, city, country)
values ('00000000-0000-4000-8000-000000000001', 'Storme Dental Organization', 'storme-dental-organization', 'Dental Organization', 'hello@stormeai.local', 'Makati', 'PH')
on conflict (slug) do nothing;

insert into public.agents (organization_id, name, tone, language_style)
values ('00000000-0000-4000-8000-000000000001', 'Meng', 'warm, professional, concise', 'English + Taglish when appropriate')
on conflict (organization_id) do nothing;
