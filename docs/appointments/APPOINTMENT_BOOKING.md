# Appointment Booking MVP

ST-007 adds appointment request helpers.

## Behavior

- Chat creates `requested` appointments by default
- Staff confirmation is required before promising final availability
- Patient record is separate from appointment record

## Required details

- patient name
- email or phone
- service
- preferred date/time

## Next

- Persist draft through Supabase client or Edge Function
- Add provider availability rules
- Store appointment requests for organization staff review after creation
