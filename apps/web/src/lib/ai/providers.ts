export type AiProviderId = "ollama" | "openai" | "anthropic";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionRequest = {
  provider?: AiProviderId;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
};

export type ChatCompletionResult = {
  provider: AiProviderId;
  model: string;
  content: string;
  raw?: unknown;
};

export class AiProviderError extends Error {
  constructor(message: string, public provider: AiProviderId, public status?: number) {
    super(message);
  }
}

const defaultProvider = (import.meta.env.VITE_AI_DEFAULT_PROVIDER || "ollama") as AiProviderId;
const ollamaBaseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL || "qwen2.5:7b";

export async function createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const provider = request.provider || defaultProvider;

  if (provider === "ollama") return ollamaChat(request);
  if (provider === "openai") return openAiChat(request);
  if (provider === "anthropic") return anthropicChat(request);

  throw new Error(`Unsupported AI provider: ${provider}`);
}

export async function createChatCompletionWithFallback(
  request: ChatCompletionRequest,
  fallbackProvider?: AiProviderId,
): Promise<ChatCompletionResult> {
  try {
    return await createChatCompletion(request);
  } catch (error) {
    if (!fallbackProvider) throw error;
    return createChatCompletion({ ...request, provider: fallbackProvider });
  }
}

async function ollamaChat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const model = request.model || ollamaModel;
  const response = await fetch(`${ollamaBaseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: request.messages, stream: false, options: { temperature: request.temperature ?? 0.2 } }),
  });

  const raw = await response.json().catch(() => null);
  if (!response.ok) throw new AiProviderError(raw?.error || "Ollama request failed", "ollama", response.status);

  return { provider: "ollama", model, content: raw?.message?.content || "", raw };
}

async function openAiChat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new AiProviderError("Missing VITE_OPENAI_API_KEY", "openai");

  const model = request.model || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: request.messages, temperature: request.temperature ?? 0.2 }),
  });

  const raw = await response.json().catch(() => null);
  if (!response.ok) throw new AiProviderError(raw?.error?.message || "OpenAI request failed", "openai", response.status);

  return { provider: "openai", model, content: raw?.choices?.[0]?.message?.content || "", raw };
}

async function anthropicChat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiProviderError("Missing VITE_ANTHROPIC_API_KEY", "anthropic");

  const model = request.model || "claude-3-5-haiku-latest";
  const system = request.messages.find((message) => message.role === "system")?.content;
  const messages = request.messages.filter((message) => message.role !== "system");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, system, messages, max_tokens: 800, temperature: request.temperature ?? 0.2 }),
  });

  const raw = await response.json().catch(() => null);
  if (!response.ok) throw new AiProviderError(raw?.error?.message || "Anthropic request failed", "anthropic", response.status);

  return { provider: "anthropic", model, content: raw?.content?.map((part: { text?: string }) => part.text || "").join("\n") || "", raw };
}
