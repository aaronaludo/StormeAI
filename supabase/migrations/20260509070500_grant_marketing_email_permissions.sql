-- Allow authenticated marketing Edge Function checks to read clinic membership/profile data.

grant select on table public.clinic_members to service_role;
grant select on table public.clinics to service_role;
