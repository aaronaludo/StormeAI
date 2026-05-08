-- Public website/Telegram chat functions run with the Supabase service role.
-- RLS is bypassed by service_role, but explicit table privileges are still required.

grant usage on schema public to service_role;

grant select on table public.clinics to service_role;
grant select on table public.ai_receptionists to service_role;
grant select on table public.knowledge_documents to service_role;

grant select, insert, update on table public.chat_sessions to service_role;
grant select, insert on table public.chat_messages to service_role;
