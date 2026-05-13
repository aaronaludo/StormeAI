import { createChatCompletion } from "../ai/providers";
import { buildSettingsPromptPreview, DEFAULT_AI_MODEL_ID, loadAgentSettings, type AgentSettingsRecord } from "../ai/agentSettings";
import { supabase } from "../supabase";
import { getWorkspaceSelection } from "../workspaceSelection";
import type { RagContext } from "../ai/agentPrompt";

export type AgentChatTurnInput = {
  sessionId?: string;
  patientMessage: string;
  agentName?: string;
};

export type AgentChatTurnResult = {
  sessionId: string;
  reply: string;
  mode: "ai" | "safe-fallback" | "rule";
  citations: RagContext;
  bookingUrl?: string;
};

export async function sendAgentChatTurn(input: AgentChatTurnInput): Promise<AgentChatTurnResult> {
  const selection = getWorkspaceSelection();
  if (!selection.organizationId) throw new Error("Choose an organization before testing chat.");

  const settings = await loadAgentSettings(selection.organizationId, selection.agentId);
  const activeName = input.agentName || settings.name;
  const chatSettings = {
    ...settings,
    name: activeName,
    greetingMessage: settings.greetingMessage.replace(/\bMia\b/g, activeName),
  };
  const useLocalOllama = import.meta.env.DEV && chatSettings.defaultProvider === "ollama";

  if (useLocalOllama) return sendLocalOllamaTestChatTurn(input, chatSettings, chatSettings.organizationId || selection.organizationId);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL.");

  const response = await fetch(`${String(supabaseUrl).replace(/\/$/, "")}/functions/v1/public-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationId: selection.organizationId,
      agentId: selection.agentId,
      sessionId: input.sessionId,
      message: input.patientMessage,
      source: "dashboard_test_chat",
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Test chat failed.");

  return {
    sessionId: data.sessionId,
    reply: sanitizeAgentName(data.reply, activeName),
    mode: data.mode || "ai",
    citations: data.citations || [],
    bookingUrl: data.bookingUrl || undefined,
  };
}

async function sendLocalOllamaTestChatTurn(input: AgentChatTurnInput, settings: AgentSettingsRecord, organizationId: string): Promise<AgentChatTurnResult> {
  const citations = await retrieveKnowledge(organizationId, input.patientMessage);
  const sessionId = input.sessionId || `local-${crypto.randomUUID()}`;
  if (wantsBooking(input.patientMessage)) {
    const bookingUrl = `/book/${organizationId}?${new URLSearchParams({ sessionId }).toString()}`;
    return {
      sessionId,
      reply: buildBookingRedirectReply(input.patientMessage),
      mode: "rule",
      citations,
      bookingUrl,
    };
  }

  const prompt = [
    buildSettingsPromptPreview(settings),
    `Your agent name is ${settings.name}. Do not call yourself Meng unless your name is Meng.`,
    renderKnowledge(citations),
    "This is a local dashboard Test Chat turn. Reply as the configured agent.",
  ].join("\n\n");

  const completion = await createChatCompletion({
    provider: "ollama",
    model: DEFAULT_AI_MODEL_ID,
    messages: [{ role: "system", content: prompt }, { role: "user", content: input.patientMessage }],
    temperature: 0.2,
  });

  return {
    sessionId,
    reply: sanitizeAgentName(completion.content.trim() || "I’m here, but I couldn’t generate a response. Please try again.", settings.name),
    mode: "ai",
    citations,
  };
}

function sanitizeAgentName(reply: string, agentName: string) {
  if (!agentName || agentName === "Meng") return reply;
  return reply.replace(/\bMia\b/g, agentName);
}

function buildBookingRedirectReply(message: string) {
  const lower = message.toLowerCase();
  const isTaglish = ["gusto", "tulungan", "ako", "mag book", "mag-book", "pa book", "pabook"].some((term) => lower.includes(term));
  return isTaglish
    ? "Oo, tutulungan kita mag-request ng appointment. Para malinaw at kumpleto ang details mo, pindutin ang Redirect button at ilagay doon ang preferred date, time, service, name, at contact details. Organization staff ang magco-confirm ng availability."
    : "Sure — I can help you request an appointment. Please tap the Redirect button so you can enter your preferred date, time, service, name, and contact details clearly. Organization staff will confirm availability.";
}

function wantsBooking(message: string) {
  return ["appointment", "book", "booking", "schedule", "reschedule", "cancel", "available", "slot", "pabook", "pa book", "mag-book", "mag book"].some((term) => message.toLowerCase().includes(term));
}

async function retrieveKnowledge(organizationId: string, message: string): Promise<RagContext> {
  if (!supabase) return [];
  const terms = message.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length >= 4).slice(0, 5) || [];
  const orFilter = terms.flatMap((term) => [`title.ilike.%${term}%`, `content.ilike.%${term}%`]).join(",");
  let query = supabase.from("knowledge_documents").select("title,content").eq("organization_id", organizationId).in("status", ["indexed", "published", "approved"]).limit(4);
  if (orFilter) query = query.or(orFilter);
  const { data } = await query;
  return (data || []).filter((item: { title?: string | null; content?: string | null }) => item.content).map((item: { title?: string | null; content?: string | null }) => ({ title: item.title || undefined, content: String(item.content).slice(0, 900) }));
}

function renderKnowledge(citations: RagContext) {
  if (!citations.length) return "No approved organization knowledge snippets were retrieved for this turn.";
  return `Approved organization knowledge snippets:\n${citations.map((item, index) => `[${index + 1}]${item.title ? ` (${item.title})` : ""} ${item.content}`).join("\n")}`;
}

// Kept to avoid breaking future imports that expect Supabase to be initialized here.
void supabase;
