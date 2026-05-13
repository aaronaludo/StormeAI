-- Rename the old AI receptionist model to the generic Agent model.
-- Idempotent so existing linked projects can migrate, while fresh local resets no-op.

set search_path = public, extensions;

-- Finish old clinic column naming before recreating organization RPCs.
do $$
begin
  if to_regclass('public.organizations') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'organizations'
         and column_name = 'clinic_type'
     )
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'organizations'
         and column_name = 'organization_type'
     ) then
    alter table public.organizations rename column clinic_type to organization_type;
  end if;
end $$;

do $$
begin
  if to_regclass('public.ai_receptionists') is not null and to_regclass('public.agents') is null then
    alter table public.ai_receptionists rename to agents;
  end if;
end $$;

alter table if exists public.agents drop constraint if exists ai_receptionists_organization_id_key;
alter table if exists public.agents drop constraint if exists agents_organization_id_key;

do $$
begin
  if to_regclass('public.organization_facebook_messenger_integrations') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'organization_facebook_messenger_integrations'
         and column_name = 'receptionist_id'
     )
     and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'organization_facebook_messenger_integrations'
         and column_name = 'agent_id'
     ) then
    alter table public.organization_facebook_messenger_integrations rename column receptionist_id to agent_id;
  end if;
end $$;

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


-- Secure chat storage helpers for the logged-in organization user.
-- These avoid direct browser writes to chat_sessions/chat_messages while still
-- verifying membership through auth.uid().

create or replace function public.create_agent_chat_session(target_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to start a chat session.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.organization_members cm
    where cm.organization_id = target_organization_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this organization workspace.' using errcode = '42501';
  end if;

  insert into public.chat_sessions (organization_id, channel, status, last_message_at)
  values (target_organization_id, 'web_widget', 'open', now())
  returning id into new_session_id;

  return new_session_id;
end;
$$;

create or replace function public.record_agent_chat_message(
  target_organization_id uuid,
  target_session_id uuid,
  message_sender public.chat_sender,
  message_body text,
  message_citations jsonb default '[]'::jsonb,
  message_metadata jsonb default '{}'::jsonb,
  emergency boolean default false,
  handoff boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a chat message.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.organization_members cm
    where cm.organization_id = target_organization_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this organization workspace.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.chat_sessions cs
    where cs.id = target_session_id
      and cs.organization_id = target_organization_id
  ) then
    raise exception 'Chat session does not belong to this organization workspace.' using errcode = '42501';
  end if;

  insert into public.chat_messages (organization_id, session_id, sender, body, citations, metadata)
  values (target_organization_id, target_session_id, message_sender, message_body, message_citations, message_metadata)
  returning id into new_message_id;

  update public.chat_sessions
  set
    last_message_at = now(),
    emergency_flag = emergency_flag or emergency,
    handoff_requested = handoff_requested or handoff
  where id = target_session_id;

  return new_message_id;
end;
$$;

revoke all on function public.create_agent_chat_session(uuid) from public;
revoke all on function public.record_agent_chat_message(uuid, uuid, public.chat_sender, text, jsonb, jsonb, boolean, boolean) from public;

grant execute on function public.create_agent_chat_session(uuid) to authenticated;
grant execute on function public.record_agent_chat_message(uuid, uuid, public.chat_sender, text, jsonb, jsonb, boolean, boolean) to authenticated;


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
