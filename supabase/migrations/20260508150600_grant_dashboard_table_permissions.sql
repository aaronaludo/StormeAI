-- Allow logged-in clinic members to use dashboard tables through existing RLS policies.
-- RLS still enforces clinic membership via the policies created in the initial schema.

grant select, insert, update, delete on table public.knowledge_documents to authenticated;
grant select, insert, update, delete on table public.knowledge_chunks to authenticated;

grant select, insert, update, delete on table public.appointments to authenticated;
grant select, insert, update, delete on table public.patients to authenticated;
grant select on table public.services to authenticated;
grant select on table public.providers to authenticated;
