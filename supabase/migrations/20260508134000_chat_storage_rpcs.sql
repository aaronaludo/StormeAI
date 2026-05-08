-- Secure chat storage helpers for the logged-in clinic user.
-- These avoid direct browser writes to chat_sessions/chat_messages while still
-- verifying membership through auth.uid().

create or replace function public.create_receptionist_chat_session(target_clinic_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to start a chat session.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this clinic workspace.' using errcode = '42501';
  end if;

  insert into public.chat_sessions (clinic_id, channel, status, last_message_at)
  values (target_clinic_id, 'web_widget', 'open', now())
  returning id into new_session_id;

  return new_session_id;
end;
$$;

create or replace function public.record_receptionist_chat_message(
  target_clinic_id uuid,
  target_session_id uuid,
  message_sender public.chat_sender,
  message_body text,
  message_citations jsonb default '[]'::jsonb,
  message_metadata jsonb default '{}'::jsonb,
  emergency boolean default false,
  handoff boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send a chat message.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this clinic workspace.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.chat_sessions cs
    where cs.id = target_session_id
      and cs.clinic_id = target_clinic_id
  ) then
    raise exception 'Chat session does not belong to this clinic workspace.' using errcode = '42501';
  end if;

  insert into public.chat_messages (clinic_id, session_id, sender, body, citations, metadata)
  values (target_clinic_id, target_session_id, message_sender, message_body, message_citations, message_metadata)
  returning id into new_message_id;

  update public.chat_sessions
  set
    last_message_at = now(),
    emergency_flag = emergency_flag or emergency,
    handoff_requested = handoff_requested or handoff
  where id = target_session_id;

  return new_message_id;
end;
$$;

revoke all on function public.create_receptionist_chat_session(uuid) from public;
revoke all on function public.record_receptionist_chat_message(uuid, uuid, public.chat_sender, text, jsonb, jsonb, boolean, boolean) from public;

grant execute on function public.create_receptionist_chat_session(uuid) to authenticated;
grant execute on function public.record_receptionist_chat_message(uuid, uuid, public.chat_sender, text, jsonb, jsonb, boolean, boolean) to authenticated;
