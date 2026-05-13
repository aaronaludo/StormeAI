-- Website and Telegram chat run in Supabase Edge Functions, so localhost Ollama
-- is not reachable in production. Use OpenAI by default for deployed public chat.

update public.agents
set
  default_provider = 'openai',
  default_model = 'gpt-4o-mini',
  updated_at = now()
where default_provider = 'ollama';
