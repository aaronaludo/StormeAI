-- Create clinic workspace atomically for authenticated onboarding.
-- This avoids the RLS chicken-and-egg where a user cannot select/manage
-- a clinic until the first owner membership exists.

create or replace function public.create_clinic_workspace(
  clinic_name text,
  clinic_slug text,
  clinic_type text default null,
  clinic_email text default null,
  clinic_city text default null,
  clinic_country text default 'PH'
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
  new_clinic_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in before creating a clinic workspace.' using errcode = '28000';
  end if;

  insert into public.clinics (
    name,
    slug,
    clinic_type,
    email,
    city,
    country
  ) values (
    clinic_name,
    clinic_slug,
    clinic_type,
    clinic_email,
    clinic_city,
    coalesce(nullif(clinic_country, ''), 'PH')
  )
  returning clinics.id into new_clinic_id;

  insert into public.clinic_members (
    clinic_id,
    user_id,
    role
  ) values (
    new_clinic_id,
    current_user_id,
    'owner'
  );

  insert into public.ai_receptionists (
    clinic_id,
    name
  ) values (
    new_clinic_id,
    'Meng'
  );

  insert into public.billing_subscriptions (
    clinic_id,
    billing_provider,
    subscription_status
  ) values (
    new_clinic_id,
    'manual',
    'trial'
  );

  return query
  select c.id, c.name, c.slug
  from public.clinics c
  where c.id = new_clinic_id;
end;
$$;

revoke all on function public.create_clinic_workspace(text, text, text, text, text, text) from public;
grant execute on function public.create_clinic_workspace(text, text, text, text, text, text) to authenticated;
