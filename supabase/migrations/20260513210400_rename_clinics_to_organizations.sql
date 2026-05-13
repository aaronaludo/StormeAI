-- Rename the old clinic workspace model to the generic Organization model.
-- Idempotent compatibility migration for existing linked Supabase projects.

set search_path = public, extensions;

do $$
begin
  if to_regclass('public.clinics') is not null and to_regclass('public.organizations') is null then
    alter table public.clinics rename to organizations;
  end if;

  if to_regclass('public.clinic_members') is not null and to_regclass('public.organization_members') is null then
    alter table public.clinic_members rename to organization_members;
  end if;

  if to_regclass('public.clinic_facebook_messenger_integrations') is not null and to_regclass('public.organization_facebook_messenger_integrations') is null then
    alter table public.clinic_facebook_messenger_integrations rename to organization_facebook_messenger_integrations;
  end if;
end $$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'organization_members',
    'patients',
    'services',
    'providers',
    'appointments',
    'agents',
    'ai_receptionists',
    'chat_sessions',
    'chat_messages',
    'knowledge_documents',
    'knowledge_chunks',
    'workflows',
    'workflow_events',
    'billing_subscriptions',
    'usage_events',
    'organization_facebook_messenger_integrations'
  ] loop
    if to_regclass('public.' || tbl) is not null
       and exists (
         select 1 from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = tbl
           and c.column_name = 'clinic_id'
       )
       and not exists (
         select 1 from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = tbl
           and c.column_name = 'organization_id'
       ) then
      execute format('alter table public.%I rename column clinic_id to organization_id', tbl);
    end if;
  end loop;
end $$;

alter table if exists public.agents drop constraint if exists agents_organization_id_key;
alter table if exists public.ai_receptionists drop constraint if exists ai_receptionists_organization_id_key;
alter table if exists public.agents drop constraint if exists ai_receptionists_clinic_id_key;
alter table if exists public.ai_receptionists drop constraint if exists ai_receptionists_clinic_id_key;

-- Enforce one organization per account by keeping the earliest membership
-- for users that already belonged to multiple old clinic workspaces.
with ranked_memberships as (
  select
    id,
    row_number() over (partition by user_id order by created_at asc, id asc) as rn
  from public.organization_members
)
delete from public.organization_members om
using ranked_memberships ranked
where om.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists organization_members_one_organization_per_user_idx
  on public.organization_members(user_id);
