-- Ensure every authenticated account has exactly one default organization.

set search_path = public, extensions;

create or replace function public.ensure_default_organization()
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  role public.member_role
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  user_email text;
  base_name text;
  base_slug text;
  candidate_slug text;
  suffix text;
  new_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in before creating a default organization.' using errcode = '28000';
  end if;

  select u.email into user_email
  from auth.users u
  where u.id = current_user_id;

  select om.organization_id into new_organization_id
  from public.organization_members om
  where om.user_id = current_user_id
  limit 1;

  if new_organization_id is null then
    base_name := coalesce(nullif(split_part(user_email, '@', 1), ''), 'My') || ' Organization';
    base_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then
      base_slug := 'my-organization';
    end if;

    suffix := left(replace(current_user_id::text, '-', ''), 8);
    candidate_slug := base_slug || '-' || suffix;

    while exists (select 1 from public.organizations o where o.slug = candidate_slug) loop
      candidate_slug := base_slug || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8);
    end loop;

    insert into public.organizations (
      name,
      slug,
      organization_type,
      email,
      country
    ) values (
      base_name,
      candidate_slug,
      'Organization',
      user_email,
      'PH'
    )
    returning id into new_organization_id;

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
    ) on conflict (organization_id) do nothing;
  end if;

  return query
  select o.id, o.name, o.slug, om.role
  from public.organizations o
  join public.organization_members om on om.organization_id = o.id
  where om.user_id = current_user_id
  order by o.created_at asc
  limit 1;
end;
$$;

revoke all on function public.ensure_default_organization() from public;
grant execute on function public.ensure_default_organization() to authenticated;
