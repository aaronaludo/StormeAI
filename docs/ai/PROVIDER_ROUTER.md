# AI Provider Router

StormeAI routes chat-only receptionist responses through a provider abstraction.

## Default

- Provider: Ollama
- Model: `qwen2.5:7b`
- Base URL: `VITE_OLLAMA_BASE_URL` or `http://127.0.0.1:11434`

## Optional providers

- OpenAI via `VITE_OPENAI_API_KEY`
- Claude via `VITE_ANTHROPIC_API_KEY`

## Safety

The provider router does not define medical behavior. It only sends messages. Safety and no-diagnosis behavior are owned by the receptionist prompt module.
