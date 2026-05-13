-- Allow logged-in organization members to read chat history through existing RLS policies.
-- RLS still restricts rows to the active user's organization membership.

grant select, insert, update, delete on table public.chat_sessions to authenticated;
grant select, insert, update, delete on table public.chat_messages to authenticated;
