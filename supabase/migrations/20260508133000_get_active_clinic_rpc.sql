-- Safely return the active clinic workspace for the signed-in user.
-- The frontend should not query clinic_members directly because RLS can block
-- the bootstrap lookup before the app knows the user's clinic id.

create or replace function public.get_active_clinic_workspace()
returns table (
  id uuid,
  name text,
  clinic_type text,
  timezone text,
  receptionist_name text,
  receptionist_tone text,
  receptionist_language_style text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    c.id,
    c.name,
    c.clinic_type,
    c.timezone,
    ar.name as receptionist_name,
    ar.tone as receptionist_tone,
    ar.language_style as receptionist_language_style
  from public.clinic_members cm
  join public.clinics c on c.id = cm.clinic_id
  left join public.ai_receptionists ar on ar.clinic_id = c.id
  where cm.user_id = auth.uid()
  order by cm.created_at asc
  limit 1;
$$;

revoke all on function public.get_active_clinic_workspace() from public;
grant execute on function public.get_active_clinic_workspace() to authenticated;
