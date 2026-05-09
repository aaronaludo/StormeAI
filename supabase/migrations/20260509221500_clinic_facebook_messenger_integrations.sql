create table if not exists public.clinic_facebook_messenger_integrations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  receptionist_id uuid references public.ai_receptionists(id) on delete set null,
  page_id text not null unique,
  page_name text,
  page_access_token text not null,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, page_id)
);

create index if not exists idx_clinic_facebook_messenger_integrations_clinic
  on public.clinic_facebook_messenger_integrations(clinic_id, enabled);

create index if not exists idx_clinic_facebook_messenger_integrations_page
  on public.clinic_facebook_messenger_integrations(page_id, enabled);

create trigger set_clinic_facebook_messenger_integrations_updated_at
  before update on public.clinic_facebook_messenger_integrations
  for each row execute function public.set_updated_at();

alter table public.clinic_facebook_messenger_integrations enable row level security;

create policy "members can manage facebook messenger integrations"
  on public.clinic_facebook_messenger_integrations
  for all
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

grant select, insert, update, delete on table public.clinic_facebook_messenger_integrations to authenticated;
grant select on table public.clinic_facebook_messenger_integrations to service_role;
