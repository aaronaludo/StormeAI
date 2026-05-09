-- Multi-clinic and multi-receptionist switching support.

alter table public.ai_receptionists
  drop constraint if exists ai_receptionists_clinic_id_key;

create or replace function public.list_clinic_workspaces()
returns table (
  clinic_id uuid,
  clinic_name text,
  clinic_slug text,
  role public.member_role
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.id, c.name, c.slug, cm.role
  from public.clinic_members cm
  join public.clinics c on c.id = cm.clinic_id
  where cm.user_id = auth.uid()
  order by c.name asc;
$$;

create or replace function public.list_ai_receptionists(target_clinic_id uuid)
returns table (
  receptionist_id uuid,
  clinic_id uuid,
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
  select ar.id, ar.clinic_id, ar.name, ar.tone, ar.default_provider, ar.default_model, ar.updated_at
  from public.ai_receptionists ar
  where ar.clinic_id = target_clinic_id
    and exists (
      select 1 from public.clinic_members cm
      where cm.clinic_id = ar.clinic_id
        and cm.user_id = auth.uid()
    )
  order by ar.updated_at desc, ar.created_at desc;
$$;

create or replace function public.create_ai_receptionist(target_clinic_id uuid, receptionist_name text default 'Meng')
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_receptionist_id uuid;
begin
  if not exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  ) then
    raise exception 'Only clinic owners or admins can create AI receptionists.' using errcode = '42501';
  end if;

  insert into public.ai_receptionists (clinic_id, name)
  values (target_clinic_id, coalesce(nullif(receptionist_name, ''), 'Meng'))
  returning id into new_receptionist_id;

  return new_receptionist_id;
end;
$$;

create or replace function public.get_ai_receptionist_settings_v2(target_clinic_id uuid default null, target_receptionist_id uuid default null)
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
    and (target_clinic_id is null or c.id = target_clinic_id)
    and (target_receptionist_id is null or ar.id = target_receptionist_id)
  order by c.name asc, ar.updated_at desc, ar.created_at desc
  limit 1;
$$;

create or replace function public.update_ai_receptionist_settings_v2(
  target_clinic_id uuid,
  target_receptionist_id uuid,
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
begin
  if not exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  ) then
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
  where ar.id = target_receptionist_id
    and ar.clinic_id = target_clinic_id;

  return query
  select * from public.get_ai_receptionist_settings_v2(target_clinic_id, target_receptionist_id);
end;
$$;

revoke all on function public.list_clinic_workspaces() from public;
revoke all on function public.list_ai_receptionists(uuid) from public;
revoke all on function public.create_ai_receptionist(uuid, text) from public;
revoke all on function public.get_ai_receptionist_settings_v2(uuid, uuid) from public;
revoke all on function public.update_ai_receptionist_settings_v2(uuid, uuid, text, text, text, text, public.ai_provider, text, public.ai_provider, text, boolean, boolean, boolean, boolean, jsonb) from public;

grant execute on function public.list_clinic_workspaces() to authenticated;
grant execute on function public.list_ai_receptionists(uuid) to authenticated;
grant execute on function public.create_ai_receptionist(uuid, text) to authenticated;
grant execute on function public.get_ai_receptionist_settings_v2(uuid, uuid) to authenticated;
grant execute on function public.update_ai_receptionist_settings_v2(uuid, uuid, text, text, text, text, public.ai_provider, text, public.ai_provider, text, boolean, boolean, boolean, boolean, jsonb) to authenticated;
