# n8n Workflow Events

ST-009 adds the n8n event trigger foundation.

## Events

- `appointment.created`
- `appointment.rescheduled`
- `appointment.canceled`
- `chat.handoff_requested`
- `knowledge.gap_detected`
- `billing.subscription_changed`

## Function

`trigger-n8n-event`

It POSTs the event payload to either a supplied webhook URL or `N8N_WEBHOOK_BASE_URL/<event-name>`.
