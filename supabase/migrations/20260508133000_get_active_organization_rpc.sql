-- Safely return the active organization workspace for the signed-in user.
-- The frontend should not query organization_members directly because RLS can block
-- the bootstrap lookup before the app knows the user's organization id.

create or replace function public.get_active_organization_workspace()
returns table (
  id uuid,
  name text,
  organization_type text,
  timezone text,
  agent_name text,
  agent_tone text,
  agent_language_style text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    c.id,
    c.name,
    c.organization_type,
    c.timezone,
    ar.name as agent_name,
    ar.tone as agent_tone,
    ar.language_style as agent_language_style
  from public.organization_members cm
  join public.organizations c on c.id = cm.organization_id
  left join public.agents ar on ar.organization_id = c.id
  where cm.user_id = auth.uid()
  order by cm.created_at asc
  limit 1;
$$;

revoke all on function public.get_active_organization_workspace() from public;
grant execute on function public.get_active_organization_workspace() to authenticated;
