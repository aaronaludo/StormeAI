-- Load and save AI agent settings for the active organization user.

create or replace function public.get_agent_settings()
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
  order by cm.created_at asc
  limit 1;
$$;

create or replace function public.update_agent_settings(
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
declare
  target_organization_id uuid;
begin
  select cm.organization_id into target_organization_id
  from public.organization_members cm
  where cm.user_id = auth.uid()
    and cm.role in ('owner', 'admin')
  order by cm.created_at asc
  limit 1;

  if target_organization_id is null then
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
  where ar.organization_id = target_organization_id;

  return query
  select * from public.get_agent_settings();
end;
$$;

revoke all on function public.get_agent_settings() from public;
revoke all on function public.update_agent_settings(text, text, text, text, public.ai_provider, text, public.ai_provider, text, boolean, boolean, boolean, boolean, jsonb) from public;

grant execute on function public.get_agent_settings() to authenticated;
grant execute on function public.update_agent_settings(text, text, text, text, public.ai_provider, text, public.ai_provider, text, boolean, boolean, boolean, boolean, jsonb) to authenticated;
