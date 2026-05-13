-- Multi-organization and multi-agent switching support.

alter table public.agents
  drop constraint if exists agents_organization_id_key;

create or replace function public.get_user_organization()
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  role public.member_role
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.id, c.name, c.slug, cm.role
  from public.organization_members cm
  join public.organizations c on c.id = cm.organization_id
  where cm.user_id = auth.uid()
  order by c.name asc;
$$;

create or replace function public.list_agents(target_organization_id uuid)
returns table (
  agent_id uuid,
  organization_id uuid,
  name text,
  tone text,
  default_provider public.ai_provider,
  default_model text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select ar.id, ar.organization_id, ar.name, ar.tone, ar.default_provider, ar.default_model, ar.updated_at
  from public.agents ar
  where ar.organization_id = target_organization_id
    and exists (
      select 1 from public.organization_members cm
      where cm.organization_id = ar.organization_id
        and cm.user_id = auth.uid()
    )
  order by ar.updated_at desc, ar.created_at desc;
$$;

create or replace function public.create_agent(target_organization_id uuid, agent_name text default 'Meng')
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_agent_id uuid;
begin
  if not exists (
    select 1 from public.organization_members cm
    where cm.organization_id = target_organization_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  ) then
    raise exception 'Only organization owners or admins can create AI agents.' using errcode = '42501';
  end if;

  insert into public.agents (organization_id, name)
  values (target_organization_id, coalesce(nullif(agent_name, ''), 'Meng'))
  returning id into new_agent_id;

  return new_agent_id;
end;
$$;

create or replace function public.get_agent_settings_v2(target_organization_id uuid default null, target_agent_id uuid default null)
returns table (
  organization_id uuid,
  agent_id uuid,
  organization_name text,
  name text,
  tone text,
  language_style text,
  base_system_prompt text,
  default_provider public.ai_provider,
  default_model text,
  fallback_provider public.ai_provider,
  fallback_model text,
  use_approved_knowledge_only boolean,
  offer_appointment_when_relevant boolean,
  emergency_handoff_enabled boolean,
  human_handoff_enabled boolean,
  settings jsonb
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    c.id as organization_id,
    ar.id as agent_id,
    c.name as organization_name,
    ar.name,
    ar.tone,
    ar.language_style,
    ar.base_system_prompt,
    ar.default_provider,
    ar.default_model,
    ar.fallback_provider,
    ar.fallback_model,
    ar.use_approved_knowledge_only,
    ar.offer_appointment_when_relevant,
    ar.emergency_handoff_enabled,
    ar.human_handoff_enabled,
    ar.settings
  from public.organization_members cm
  join public.organizations c on c.id = cm.organization_id
  join public.agents ar on ar.organization_id = c.id
  where cm.user_id = auth.uid()
    and (target_organization_id is null or c.id = target_organization_id)
    and (target_agent_id is null or ar.id = target_agent_id)
  order by c.name asc, ar.updated_at desc, ar.created_at desc
  limit 1;
$$;

create or replace function public.update_agent_settings_v2(
  target_organization_id uuid,
  target_agent_id uuid,
  agent_name text,
  agent_tone text,
  agent_language_style text,
  agent_base_system_prompt text,
  agent_default_provider public.ai_provider,
  agent_default_model text,
  agent_fallback_provider public.ai_provider default null,
  agent_fallback_model text default null,
  agent_use_approved_knowledge_only boolean default true,
  agent_offer_appointment_when_relevant boolean default true,
  agent_emergency_handoff_enabled boolean default true,
  agent_human_handoff_enabled boolean default true,
  agent_settings jsonb default '{}'::jsonb
)
returns table (
  organization_id uuid,
  agent_id uuid,
  organization_name text,
  name text,
  tone text,
  language_style text,
  base_system_prompt text,
  default_provider public.ai_provider,
  default_model text,
  fallback_provider public.ai_provider,
  fallback_model text,
  use_approved_knowledge_only boolean,
  offer_appointment_when_relevant boolean,
  emergency_handoff_enabled boolean,
  human_handoff_enabled boolean,
  settings jsonb
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.organization_members cm
    where cm.organization_id = target_organization_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  ) then
    raise exception 'Only organization owners or admins can update AI agent settings.' using errcode = '42501';
  end if;

  update public.agents ar
  set
    name = coalesce(nullif(agent_name, ''), ar.name),
    tone = coalesce(nullif(agent_tone, ''), ar.tone),
    language_style = coalesce(nullif(agent_language_style, ''), ar.language_style),
    base_system_prompt = nullif(agent_base_system_prompt, ''),
    default_provider = agent_default_provider,
    default_model = coalesce(nullif(agent_default_model, ''), ar.default_model),
    fallback_provider = agent_fallback_provider,
    fallback_model = nullif(agent_fallback_model, ''),
    use_approved_knowledge_only = agent_use_approved_knowledge_only,
    offer_appointment_when_relevant = agent_offer_appointment_when_relevant,
    emergency_handoff_enabled = agent_emergency_handoff_enabled,
    human_handoff_enabled = agent_human_handoff_enabled,
    settings = coalesce(agent_settings, '{}'::jsonb),
    updated_at = now()
  where ar.id = target_agent_id
    and ar.organization_id = target_organization_id;

  return query
  select * from public.get_agent_settings_v2(target_organization_id, target_agent_id);
end;
$$;

revoke all on function public.get_user_organization() from public;
revoke all on function public.list_agents(uuid) from public;
revoke all on function public.create_agent(uuid, text) from public;
revoke all on function public.get_agent_settings_v2(uuid, uuid) from public;
revoke all on function public.update_agent_settings_v2(uuid, uuid, text, text, text, text, public.ai_provider, text, public.ai_provider, text, boolean, boolean, boolean, boolean, jsonb) from public;

grant execute on function public.get_user_organization() to authenticated;
grant execute on function public.list_agents(uuid) to authenticated;
grant execute on function public.create_agent(uuid, text) to authenticated;
grant execute on function public.get_agent_settings_v2(uuid, uuid) to authenticated;
grant execute on function public.update_agent_settings_v2(uuid, uuid, text, text, text, text, public.ai_provider, text, public.ai_provider, text, boolean, boolean, boolean, boolean, jsonb) to authenticated;
