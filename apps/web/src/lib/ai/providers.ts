export type AiProviderId = "ollama";

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

const ollamaBaseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const ollamaModel = "qwen2.5:7b";

export async function createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  return ollamaChat(request);
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
