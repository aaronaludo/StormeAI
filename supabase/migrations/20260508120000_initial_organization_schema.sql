-- StormeAI initial multi-tenant organization schema
-- Chat-only AI agent for organizations.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

set search_path = public, extensions;

create type public.member_role as enum ('owner', 'admin', 'staff', 'viewer');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'canceled', 'expired');
create type public.billing_provider as enum ('manual', 'paddle');
create type public.appointment_status as enum ('requested', 'confirmed', 'rescheduled', 'canceled', 'completed', 'no_show');
create type public.chat_sender as enum ('patient', 'assistant', 'staff', 'system');
create type public.ai_provider as enum ('ollama', 'openai', 'anthropic');
create type public.knowledge_source_type as enum ('faq', 'document', 'service', 'policy', 'website', 'note');
create type public.workflow_event_type as enum (
  'appointment.created',
  'appointment.rescheduled',
  'appointment.canceled',
  'chat.handoff_requested',
  'knowledge.gap_detected',
  'billing.subscription_changed'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  organization_type text,
  logo_url text,
  timezone text not null default 'Asia/Manila',
  default_language text not null default 'en',
  phone text,
  email text,
  website_url text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  country text default 'PH',
  postal_code text,
  business_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (user_id)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  price_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  title text,
  bio text,
  email text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  status public.appointment_status not null default 'requested',
  requested_start_at timestamptz,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  patient_note text,
  staff_note text,
  source text not null default 'chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'Meng',
  tone text not null default 'warm, professional, concise',
  language_style text not null default 'English, with Taglish when appropriate',
  base_system_prompt text,
  default_provider public.ai_provider not null default 'ollama',
  default_model text not null default 'qwen2.5:7b',
  fallback_provider public.ai_provider,
  fallback_model text,
  use_approved_knowledge_only boolean not null default true,
  offer_appointment_when_relevant boolean not null default true,
  emergency_handoff_enabled boolean not null default true,
  human_handoff_enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  channel text not null default 'web_widget',
  status text not null default 'open',
  handoff_requested boolean not null default false,
  emergency_flag boolean not null default false,
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender public.chat_sender not null,
  body text not null,
  citations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type public.knowledge_source_type not null default 'note',
  title text not null,
  content text,
  source_url text,
  file_path text,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default false,
  react_flow jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  n8n_webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_id uuid references public.workflows(id) on delete set null,
  event_type public.workflow_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending',
  delivered_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  billing_provider public.billing_provider not null default 'manual',
  subscription_status public.subscription_status not null default 'trial',
  plan text not null default 'starter',
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  trial_ends_at timestamptz,
  manual_payment_reference text,
  manual_payment_notes text,
  manual_payment_confirmed_at timestamptz,
  paddle_customer_id text,
  paddle_subscription_id text,
  paddle_product_id text,
  paddle_price_id text,
  limits jsonb not null default '{"monthly_chats":500,"knowledge_documents":10,"staff_users":2}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_organization_members_user_id on public.organization_members(user_id);
create index idx_patients_organization_id on public.patients(organization_id);
create index idx_services_organization_id on public.services(organization_id);
create index idx_providers_organization_id on public.providers(organization_id);
create index idx_appointments_organization_status on public.appointments(organization_id, status);
create index idx_appointments_schedule on public.appointments(organization_id, scheduled_start_at);
create index idx_chat_sessions_organization_status on public.chat_sessions(organization_id, status);
create index idx_chat_messages_session_created on public.chat_messages(session_id, created_at);
create index idx_knowledge_documents_organization on public.knowledge_documents(organization_id, status);
create index idx_knowledge_chunks_organization_document on public.knowledge_chunks(organization_id, document_id);
create index idx_knowledge_chunks_embedding on public.knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_workflow_events_organization_type on public.workflow_events(organization_id, event_type, created_at desc);
create index idx_usage_events_organization_name_created on public.usage_events(organization_id, event_name, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_patients_updated_at before update on public.patients for each row execute function public.set_updated_at();
create trigger set_services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger set_providers_updated_at before update on public.providers for each row execute function public.set_updated_at();
create trigger set_appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger set_agents_updated_at before update on public.agents for each row execute function public.set_updated_at();
create trigger set_chat_sessions_updated_at before update on public.chat_sessions for each row execute function public.set_updated_at();
create trigger set_knowledge_documents_updated_at before update on public.knowledge_documents for each row execute function public.set_updated_at();
create trigger set_workflows_updated_at before update on public.workflows for each row execute function public.set_updated_at();
create trigger set_billing_subscriptions_updated_at before update on public.billing_subscriptions for each row execute function public.set_updated_at();

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members cm
    where cm.organization_id = target_organization_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members cm
    where cm.organization_id = target_organization_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  );
$$;

create or replace function public.organization_has_no_members(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.organization_members cm
    where cm.organization_id = target_organization_id
  );
$$;

create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_organization_id uuid,
  match_count integer default 8,
  min_similarity double precision default 0.72
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity double precision,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity,
    kc.metadata
  from public.knowledge_chunks kc
  where kc.organization_id = match_organization_id
    and public.is_organization_member(match_organization_id)
    and kc.embedding is not null
    and 1 - (kc.embedding <=> query_embedding) >= min_similarity
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.patients enable row level security;
alter table public.services enable row level security;
alter table public.providers enable row level security;
alter table public.appointments enable row level security;
alter table public.agents enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_events enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.usage_events enable row level security;

create policy "members can view their organizations" on public.organizations for select using (public.is_organization_member(id));
create policy "admins can update their organizations" on public.organizations for update using (public.is_organization_admin(id)) with check (public.is_organization_admin(id));
create policy "authenticated users can create organizations" on public.organizations for insert to authenticated with check (true);

create policy "members can view memberships" on public.organization_members for select using (public.is_organization_member(organization_id) or user_id = auth.uid());
create policy "admins can manage memberships" on public.organization_members for all using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "users can create first owner membership" on public.organization_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and public.organization_has_no_members(organization_id)
  );

create policy "members can view patients" on public.patients for select using (public.is_organization_member(organization_id));
create policy "members can insert patients" on public.patients for insert with check (public.is_organization_member(organization_id));
create policy "members can update patients" on public.patients for update using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));

create policy "members can manage services" on public.services for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can manage providers" on public.providers for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can manage appointments" on public.appointments for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can manage ai agent" on public.agents for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can manage chat sessions" on public.chat_sessions for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can manage chat messages" on public.chat_messages for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can manage knowledge documents" on public.knowledge_documents for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can manage knowledge chunks" on public.knowledge_chunks for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can manage workflows" on public.workflows for all using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "members can view workflow events" on public.workflow_events for select using (public.is_organization_member(organization_id));
create policy "members can insert workflow events" on public.workflow_events for insert with check (public.is_organization_member(organization_id));
create policy "admins can manage billing subscriptions" on public.billing_subscriptions for all using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));
create policy "members can view usage events" on public.usage_events for select using (public.is_organization_member(organization_id));
create policy "members can insert usage events" on public.usage_events for insert with check (public.is_organization_member(organization_id));
