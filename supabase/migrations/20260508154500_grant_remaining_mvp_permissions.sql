-- Grants for the remaining all-at-once MVP pages.
-- RLS policies still restrict data by organization membership / admin role.

grant select, insert, update, delete on table public.workflows to authenticated;
grant select, insert on table public.workflow_events to authenticated;
grant select, insert, update, delete on table public.billing_subscriptions to authenticated;
grant select, insert on table public.usage_events to authenticated;
