-- Allow authenticated marketing Edge Function checks to read organization membership/profile data.

grant select on table public.organization_members to service_role;
grant select on table public.organizations to service_role;
