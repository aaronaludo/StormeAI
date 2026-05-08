# Dashboard Supabase Data

ST-010 adds a dashboard data hook.

## Hook

`useDashboardData(clinicId)`

It loads:

- clinic name
- chat count
- appointment request sample
- human handoff count
- knowledge gap count

If Supabase or clinicId is unavailable, the hook safely falls back to demo data.
