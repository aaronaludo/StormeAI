-- Remove legacy clinic tables after the Organization migration.
-- This is intentionally destructive for duplicate legacy tables only.

set search_path = public, extensions;

-- If the old project still has clinic tables and the replacement tables do not exist,
-- preserve data by renaming them first.
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

-- If both old and new tables exist, remove the old duplicate clinic tables.
drop table if exists public.clinic_facebook_messenger_integrations cascade;
drop table if exists public.clinic_members cascade;
drop table if exists public.clinics cascade;

-- Remove any old clinic-oriented RPC names so the public API only exposes organizations.
drop function if exists public.get_active_clinic() cascade;
drop function if exists public.create_clinic_workspace(text, text, text, text, text, text) cascade;
drop function if exists public.list_clinic_workspaces() cascade;
