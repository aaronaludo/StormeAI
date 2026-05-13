-- Create organization workspace atomically for authenticated onboarding.
-- This avoids the RLS chicken-and-egg where a user cannot select/manage
-- an organization until the first owner membership exists.

create or replace function public.create_organization_workspace(
  organization_name text,
  organization_slug text,
  organization_type text default null,
  organization_email text default null,
  organization_city text default null,
  organization_country text default 'PH'
)
returns table (
  id uuid,
  name text,
  slug text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  new_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in before creating an organization workspace.' using errcode = '28000';
  end if;

  if exists (
    select 1
    from public.organization_members om
    where om.user_id = current_user_id
  ) then
    raise exception 'Each user can only create one organization.' using errcode = '23505';
  end if;

  insert into public.organizations (
    name,
    slug,
    organization_type,
    email,
    city,
    country
  ) values (
    organization_name,
    organization_slug,
    organization_type,
    organization_email,
    organization_city,
    coalesce(nullif(organization_country, ''), 'PH')
  )
  returning organizations.id into new_organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  ) values (
    new_organization_id,
    current_user_id,
    'owner'
  );

  insert into public.agents (
    organization_id,
    name
  ) values (
    new_organization_id,
    'Meng'
  );

  insert into public.billing_subscriptions (
    organization_id,
    billing_provider,
    subscription_status
  ) values (
    new_organization_id,
    'manual',
    'trial'
  );

  return query
  select c.id, c.name, c.slug
  from public.organizations c
  where c.id = new_organization_id;
end;
$$;

revoke all on function public.create_organization_workspace(text, text, text, text, text, text) from public;
grant execute on function public.create_organization_workspace(text, text, text, text, text, text) to authenticated;
