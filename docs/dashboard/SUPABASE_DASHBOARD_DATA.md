# Dashboard Supabase Data

ST-010 adds a dashboard data hook.

## Hook

`useDashboardData(organizationId)`

It loads:

- organization name
- chat count
- appointment request sample
- human handoff count
- knowledge gap count

If Supabase or organizationId is unavailable, the hook safely falls back to demo data.
