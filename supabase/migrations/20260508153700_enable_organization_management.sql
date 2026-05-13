-- Enable the Organizations management page to update and delete organizations through RLS.
-- Existing update policy already restricts edits to owner/admin organization members.

grant select, insert, update, delete on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;

create policy "admins can delete their organizations"
  on public.organizations
  for delete
  using (public.is_organization_admin(id));
