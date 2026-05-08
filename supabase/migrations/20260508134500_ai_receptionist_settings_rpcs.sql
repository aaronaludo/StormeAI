-- Load and save AI receptionist settings for the active clinic user.

create or replace function public.get_ai_receptionist_settings()
returns table (
  clinic_id uuid,
  receptionist_id uuid,
  clinic_name text,
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
    c.id as clinic_id,
    ar.id as receptionist_id,
    c.name as clinic_name,
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
  from public.clinic_members cm
  join public.clinics c on c.id = cm.clinic_id
  join public.ai_receptionists ar on ar.clinic_id = c.id
  where cm.user_id = auth.uid()
  order by cm.created_at asc
  limit 1;
$$;

create or replace function public.update_ai_receptionist_settings(
  receptionist_name text,
  receptionist_tone text,
  receptionist_language_style text,
  receptionist_base_system_prompt text,
  receptionist_default_provider public.ai_provider,
  receptionist_default_model text,
  receptionist_fallback_provider public.ai_provider default null,
  receptionist_fallback_model text default null,
  receptionist_use_approved_knowledge_only boolean default true,
  receptionist_offer_appointment_when_relevant boolean default true,
  receptionist_emergency_handoff_enabled boolean default true,
  receptionist_human_handoff_enabled boolean default true,
  receptionist_settings jsonb default '{}'::jsonb
)
returns table (
  clinic_id uuid,
  receptionist_id uuid,
  clinic_name text,
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
  target_clinic_id uuid;
begin
  select cm.clinic_id into target_clinic_id
  from public.clinic_members cm
  where cm.user_id = auth.uid()
    and cm.role in ('owner', 'admin')
  order by cm.created_at asc
  limit 1;

  if target_clinic_id is null then
    raise exception 'Only clinic owners or admins can update AI receptionist settings.' using errcode = '42501';
  end if;

  update public.ai_receptionists ar
  set
    name = coalesce(nullif(receptionist_name, ''), ar.name),
    tone = coalesce(nullif(receptionist_tone, ''), ar.tone),
    language_style = coalesce(nullif(receptionist_language_style, ''), ar.language_style),
    base_system_prompt = nullif(receptionist_base_system_prompt, ''),
    default_provider = receptionist_default_provider,
    default_model = coalesce(nullif(receptionist_default_model, ''), ar.default_model),
    fallback_provider = receptionist_fallback_provider,
    fallback_model = nullif(receptionist_fallback_model, ''),
    use_approved_knowledge_only = receptionist_use_approved_knowledge_only,
    offer_appointment_when_relevant = receptionist_offer_appointment_when_relevant,
    emergency_handoff_enabled = receptionist_emergency_handoff_enabled,
    human_handoff_enabled = receptionist_human_handoff_enabled,
    settings = coalesce(receptionist_settings, '{}'::jsonb),
    updated_at = now()
  where ar.clinic_id = target_clinic_id;

  return query
  select * from public.get_ai_receptionist_settings();
end;
$$;

revoke all on function public.get_ai_receptionist_settings() from public;
revoke all on function public.update_ai_receptionist_settings(text, text, text, text, public.ai_provider, text, public.ai_provider, text, boolean, boolean, boolean, boolean, jsonb) from public;

grant execute on function public.get_ai_receptionist_settings() to authenticated;
grant execute on function public.update_ai_receptionist_settings(text, text, text, text, public.ai_provider, text, public.ai_provider, text, boolean, boolean, boolean, boolean, jsonb) to authenticated;
