create table if not exists public.organization_facebook_messenger_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  page_id text not null unique,
  page_name text,
  page_access_token text not null,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, page_id)
);

create index if not exists idx_organization_facebook_messenger_integrations_organization
  on public.organization_facebook_messenger_integrations(organization_id, enabled);

create index if not exists idx_organization_facebook_messenger_integrations_page
  on public.organization_facebook_messenger_integrations(page_id, enabled);

create trigger set_organization_facebook_messenger_integrations_updated_at
  before update on public.organization_facebook_messenger_integrations
  for each row execute function public.set_updated_at();

alter table public.organization_facebook_messenger_integrations enable row level security;

create policy "members can manage facebook messenger integrations"
  on public.organization_facebook_messenger_integrations
  for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

grant select, insert, update, delete on table public.organization_facebook_messenger_integrations to authenticated;
grant select on table public.organization_facebook_messenger_integrations to service_role;
