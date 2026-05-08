-- Enable the Clinics management page to update and delete clinics through RLS.
-- Existing update policy already restricts edits to owner/admin clinic members.

grant select, insert, update, delete on table public.clinics to authenticated;
grant select, insert, update, delete on table public.clinic_members to authenticated;

create policy "admins can delete their clinics"
  on public.clinics
  for delete
  using (public.is_clinic_admin(id));
