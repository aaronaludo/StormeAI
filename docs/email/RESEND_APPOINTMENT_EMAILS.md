# Resend Appointment Emails

ST-008 adds a Supabase Edge Function for appointment email notifications.

## Function

`send-appointment-email`

## Supported statuses

- requested
- confirmed
- rescheduled
- canceled

## Required env

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
