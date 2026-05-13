-- Storage bucket for Knowledge Base document attachments
insert into storage.buckets (id, name, public)
values ('knowledge-documents', 'knowledge-documents', false)
on conflict (id) do nothing;

create policy "organization members can read knowledge attachments"
on storage.objects for select
to authenticated
using (
  bucket_id = 'knowledge-documents'
  and public.is_organization_member((storage.foldername(name))[1]::uuid)
);

create policy "organization members can upload knowledge attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'knowledge-documents'
  and public.is_organization_member((storage.foldername(name))[1]::uuid)
);

create policy "organization members can update knowledge attachments"
on storage.objects for update
to authenticated
using (
  bucket_id = 'knowledge-documents'
  and public.is_organization_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'knowledge-documents'
  and public.is_organization_member((storage.foldername(name))[1]::uuid)
);

create policy "organization members can delete knowledge attachments"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'knowledge-documents'
  and public.is_organization_member((storage.foldername(name))[1]::uuid)
);
