# StormeAI Database Schema

This schema is for the chat-only AI receptionist MVP.

## Core goals

- Multi-tenant clinics via `clinic_id`
- Supabase Auth users connected through `clinic_members`
- RLS enabled on all tenant data tables
- Appointment-first data model
- RAG-ready knowledge tables using Supabase `pgvector`
- Manual billing first, Paddle-ready fields later
- n8n workflow event tracking

## Main tables

- `clinics`
- `clinic_members`
- `patients`
- `services`
- `providers`
- `appointments`
- `ai_receptionists`
- `chat_sessions`
- `chat_messages`
- `knowledge_documents`
- `knowledge_chunks`
- `workflows`
- `workflow_events`
- `billing_subscriptions`
- `usage_events`

## RLS model

Authenticated users can access tenant data only when they are present in `clinic_members` for that clinic.

Admin-only operations use `is_clinic_admin(clinic_id)`.

## RAG search

`match_knowledge_chunks(...)` performs tenant-scoped vector search and only returns results when the authenticated user is a clinic member.

## Notes

The public patient chat widget should not write directly to these tables with anon access in production. Use Supabase Edge Functions/service-role-backed APIs for unauthenticated patient chat, appointment intake, and webhook events.
