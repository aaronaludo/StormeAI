import { createChatCompletion } from "../ai/providers";
import { buildSettingsPromptPreview, DEFAULT_AI_MODEL_ID, loadReceptionistSettings, type ReceptionistSettingsRecord } from "../ai/receptionistSettings";
import { supabase } from "../supabase";
import { getWorkspaceSelection } from "../workspaceSelection";
import type { RagContext } from "../ai/receptionistPrompt";

export type ReceptionistChatTurnInput = {
  sessionId?: string;
  patientMessage: string;
  receptionistName?: string;
};

export type ReceptionistChatTurnResult = {
  sessionId: string;
  reply: string;
  mode: "ai" | "safe-fallback" | "rule";
  citations: RagContext;
  bookingUrl?: string;
};

export async function sendReceptionistChatTurn(input: ReceptionistChatTurnInput): Promise<ReceptionistChatTurnResult> {
  const selection = getWorkspaceSelection();
  if (!selection.clinicId) throw new Error("Choose a clinic before testing chat.");

  const settings = await loadReceptionistSettings(selection.clinicId, selection.receptionistId);
  const activeName = input.receptionistName || settings.name;
  const chatSettings = {
    ...settings,
    name: activeName,
    greetingMessage: settings.greetingMessage.replace(/\bMia\b/g, activeName),
  };
  const useLocalOllama = import.meta.env.DEV && chatSettings.defaultProvider === "ollama";

  if (useLocalOllama) return sendLocalOllamaTestChatTurn(input, chatSettings, chatSettings.clinicId || selection.clinicId);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL.");

  const response = await fetch(`${String(supabaseUrl).replace(/\/$/, "")}/functions/v1/public-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicId: selection.clinicId,
      receptionistId: selection.receptionistId,
      sessionId: input.sessionId,
      message: input.patientMessage,
      source: "dashboard_test_chat",
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Test chat failed.");

  return {
    sessionId: data.sessionId,
    reply: sanitizeReceptionistName(data.reply, activeName),
    mode: data.mode || "ai",
    citations: data.citations || [],
    bookingUrl: data.bookingUrl || undefined,
  };
}

async function sendLocalOllamaTestChatTurn(input: ReceptionistChatTurnInput, settings: ReceptionistSettingsRecord, clinicId: string): Promise<ReceptionistChatTurnResult> {
  const citations = await retrieveKnowledge(clinicId, input.patientMessage);
  const sessionId = input.sessionId || `local-${crypto.randomUUID()}`;
  if (wantsBooking(input.patientMessage)) {
    const bookingUrl = `/book/${clinicId}?${new URLSearchParams({ sessionId }).toString()}`;
    return {
      sessionId,
      reply: "I can help request an appointment. Please tap Redirect to enter the details clearly.",
      mode: "rule",
      citations,
      bookingUrl,
    };
  }

  const prompt = [
    buildSettingsPromptPreview(settings),
    `Your receptionist name is ${settings.name}. Do not call yourself Mia unless your name is Mia.`,
    renderKnowledge(citations),
    "This is a local dashboard Test Chat turn. Reply as the configured receptionist.",
  ].join("\n\n");

  const completion = await createChatCompletion({
    provider: "ollama",
    model: DEFAULT_AI_MODEL_ID,
    messages: [{ role: "system", content: prompt }, { role: "user", content: input.patientMessage }],
    temperature: 0.2,
  });

  return {
    sessionId,
    reply: sanitizeReceptionistName(completion.content.trim() || "I’m here, but I couldn’t generate a response. Please try again.", settings.name),
    mode: "ai",
    citations,
  };
}

function sanitizeReceptionistName(reply: string, receptionistName: string) {
  if (!receptionistName || receptionistName === "Mia") return reply;
  return reply.replace(/\bMia\b/g, receptionistName);
}

function wantsBooking(message: string) {
  return ["appointment", "book", "schedule", "reschedule", "cancel", "available", "slot"].some((term) => message.toLowerCase().includes(term));
}

async function retrieveKnowledge(clinicId: string, message: string): Promise<RagContext> {
  if (!supabase) return [];
  const terms = message.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length >= 4).slice(0, 5) || [];
  const orFilter = terms.flatMap((term) => [`title.ilike.%${term}%`, `content.ilike.%${term}%`]).join(",");
  let query = supabase.from("knowledge_documents").select("title,content").eq("clinic_id", clinicId).in("status", ["indexed", "published", "approved"]).limit(4);
  if (orFilter) query = query.or(orFilter);
  const { data } = await query;
  return (data || []).filter((item) => item.content).map((item) => ({ title: item.title || undefined, content: String(item.content).slice(0, 900) }));
}

function renderKnowledge(citations: RagContext) {
  if (!citations.length) return "No approved clinic knowledge snippets were retrieved for this turn.";
  return `Approved clinic knowledge snippets:\n${citations.map((item, index) => `[${index + 1}]${item.title ? ` (${item.title})` : ""} ${item.content}`).join("\n")}`;
}

// Kept to avoid breaking future imports that expect Supabase to be initialized here.
void supabase;
