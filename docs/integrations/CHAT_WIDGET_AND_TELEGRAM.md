# Chat Widget + Telegram Integration

StormeAI supports two patient-facing channels:

1. Website widget through one JavaScript file
2. Telegram bot webhook

Both channels call the same Supabase Edge Function and store messages in `chat_sessions` / `chat_messages`.

## Website JavaScript widget

Deploy the frontend, then add this to any clinic website before `</body>`:

```html
<script
  async
  src="https://YOUR_STORMEAI_DOMAIN/stormeai-widget.js"
  data-api-url="https://YOUR_SUPABASE_PROJECT.supabase.co"
  data-clinic-id="CLINIC_UUID"
  data-receptionist-id="OPTIONAL_RECEPTIONIST_UUID"
  data-title="Storme Dental Clinic"
  data-greeting="Hi! I’m your clinic AI receptionist. How can I help?">
</script>
```

Required:

- `data-api-url` — Supabase project URL
- `data-clinic-id` — clinic UUID from the StormeAI dashboard/database

Optional:

- `data-receptionist-id`
- `data-title`
- `data-greeting`
- `data-accent`, e.g. `#2563eb`

## Supabase functions

Deploy these functions:

```bash
supabase functions deploy public-chat --no-verify-jwt
supabase functions deploy telegram-webhook --no-verify-jwt
```

Set AI provider secrets for the edge runtime. Use at least one provider:

```bash
supabase secrets set OPENAI_API_KEY=...
# optional
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set OLLAMA_BASE_URL=https://your-reachable-ollama-host
```

## Telegram bot

1. Create a bot with BotFather.
2. Set secrets:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456:abc...
supabase secrets set STORMEAI_TELEGRAM_CLINIC_ID=CLINIC_UUID
supabase secrets set STORMEAI_TELEGRAM_RECEPTIONIST_ID=OPTIONAL_RECEPTIONIST_UUID
```

3. Deploy `telegram-webhook`.
4. Register the webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/telegram-webhook"
```

Telegram chats are stored with channel `telegram` and the Telegram chat id in session metadata.
