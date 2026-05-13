# StormeAI Database Schema

This schema is for the chat-only AI agent MVP.

## Core goals

- Multi-tenant organizations via `organization_id`
- Supabase Auth users connected through `organization_members`
- RLS enabled on all tenant data tables
- Appointment-first data model
- RAG-ready knowledge tables using Supabase `pgvector`
- Fixed manual billing at ₱10,000/month with unlimited chats
- Dashboard analytics from chats, appointments, handoffs, and knowledge documents

## Main tables

- `organizations`
- `organization_members`
- `patients`
- `services`
- `providers`
- `appointments`
- `agents`
- `chat_sessions`
- `chat_messages`
- `knowledge_documents`
- `knowledge_chunks`
- `workflows`
- `billing_subscriptions`
- `usage_events`

## RLS model

Authenticated users can access tenant data only when they are present in `organization_members` for that organization.

Admin-only operations use `is_organization_admin(organization_id)`.

## RAG search

`match_knowledge_chunks(...)` performs tenant-scoped vector search and only returns results when the authenticated user is an organization member.

## Notes

The public patient chat widget should not write directly to these tables with anon access in production. Use Supabase Edge Functions/service-role-backed APIs for unauthenticated patient chat, appointment intake, and webhook events.
