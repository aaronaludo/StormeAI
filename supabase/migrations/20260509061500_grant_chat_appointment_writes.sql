-- Allow service-role-backed chat functions/local gateway to create appointment requests.

grant select, insert, update on table public.patients to service_role;
grant select, insert, update on table public.appointments to service_role;
grant select, insert, update on table public.chat_sessions to service_role;
grant select, insert on table public.chat_messages to service_role;
grant select on table public.ai_receptionists to service_role;
grant select on table public.knowledge_documents to service_role;
