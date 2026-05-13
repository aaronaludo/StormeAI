-- StormeAI is focusing on local Ollama qwen2.5:7b as the only AI provider.
-- Keep legacy fallback columns for compatibility, but clear them and reset defaults.

alter table public.agents
  alter column default_provider set default 'ollama',
  alter column default_model set default 'qwen2.5:7b';

update public.agents
set
  default_provider = 'ollama',
  default_model = 'qwen2.5:7b',
  fallback_provider = null,
  fallback_model = null,
  updated_at = now();
