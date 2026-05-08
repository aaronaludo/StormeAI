import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

export type ChatChannel = "web_widget" | "telegram";

export type PublicChatInput = {
  clinicId: string;
  receptionistId?: string;
  sessionId?: string;
  channel?: ChatChannel;
  patientMessage: string;
  metadata?: Record<string, unknown>;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

export async function runReceptionistTurn(input: PublicChatInput) {
  if (!input.clinicId) throw new Error("clinicId is required.");
  const patientMessage = input.patientMessage?.trim();
  if (!patientMessage) throw new Error("patientMessage is required.");

  const context = await loadReceptionist(input.clinicId, input.receptionistId);
  const sessionId = input.sessionId || await findOrCreateSession(input.clinicId, input.channel || "web_widget", input.metadata || {});

  await insertMessage(input.clinicId, sessionId, "patient", patientMessage, [], input.metadata || {});

  const citations = await retrieveKnowledge(input.clinicId, patientMessage);
  const emergency = isEmergency(patientMessage);
  const handoff = wantsHandoff(patientMessage);
  const prompt = buildPrompt(context, citations);

  let reply = "";
  let mode = "ai";
  try {
    const completion = await createChatCompletion({ provider: context.default_provider || "openai", model: context.default_model || undefined, messages: [{ role: "system", content: prompt }, { role: "user", content: patientMessage }], temperature: 0.2 });
    reply = completion.content.trim() || safeFallback(patientMessage, citations);
    await insertMessage(input.clinicId, sessionId, "assistant", reply, citations, { mode, provider: completion.provider, model: completion.model });
  } catch (error) {
    mode = "safe-fallback";
    reply = safeFallback(patientMessage, citations, error instanceof Error ? error.message : String(error));
    await insertMessage(input.clinicId, sessionId, "assistant", reply, citations, { mode, error: error instanceof Error ? error.message : String(error) });
  }

  await supabase.from("chat_sessions").update({ emergency_flag: emergency, handoff_requested: handoff, last_message_at: new Date().toISOString(), metadata: input.metadata || {} }).eq("id", sessionId);

  return { sessionId, reply, mode, citations, receptionistName: context.name };
}

async function loadReceptionist(clinicId: string, receptionistId?: string) {
  let query = supabase
    .from("ai_receptionists")
    .select("id,name,tone,language_style,base_system_prompt,default_provider,default_model,use_approved_knowledge_only,offer_appointment_when_relevant,emergency_handoff_enabled,human_handoff_enabled,settings,clinics(name,clinic_type,timezone)")
    .eq("clinic_id", clinicId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (receptionistId) query = query.eq("id", receptionistId);
  const { data, error } = await query.single();
  if (error) throw new Error(`Load receptionist failed: ${error.message}`);
  return data as any;
}

async function findOrCreateSession(clinicId: string, channel: ChatChannel, metadata: Record<string, unknown>) {
  const telegramChatId = metadata.telegram_chat_id ? String(metadata.telegram_chat_id) : undefined;
  if (telegramChatId) {
    const { data } = await supabase.from("chat_sessions").select("id").eq("clinic_id", clinicId).eq("channel", channel).eq("status", "open").contains("metadata", { telegram_chat_id: telegramChatId }).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data, error } = await supabase.from("chat_sessions").insert({ clinic_id: clinicId, channel, metadata }).select("id").single();
  if (error) throw new Error(`Create chat session failed: ${error.message}`);
  return data.id as string;
}

async function insertMessage(clinicId: string, sessionId: string, sender: "patient" | "assistant" | "staff" | "system", body: string, citations: unknown[] = [], metadata: Record<string, unknown> = {}) {
  const { error } = await supabase.from("chat_messages").insert({ clinic_id: clinicId, session_id: sessionId, sender, body, citations, metadata });
  if (error) throw new Error(`Save chat message failed: ${error.message}`);
}

async function retrieveKnowledge(clinicId: string, message: string) {
  const terms = message.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length >= 4).slice(0, 5) || [];
  const orFilter = terms.flatMap((term) => [`title.ilike.%${term}%`, `content.ilike.%${term}%`]).join(",");
  let query = supabase.from("knowledge_documents").select("title,content").eq("clinic_id", clinicId).in("status", ["indexed", "published", "approved"]).limit(4);
  if (orFilter) query = query.or(orFilter);
  const { data } = await query;
  return (data || []).filter((item: any) => item.content).map((item: any) => ({ title: item.title || undefined, content: String(item.content).slice(0, 900) }));
}

function buildPrompt(context: any, citations: Array<{ title?: string; content: string }>) {
  const clinic = Array.isArray(context.clinics) ? context.clinics[0] : context.clinics;
  const settings = context.settings || {};
  const knowledge = citations.length ? citations.map((item, index) => `[${index + 1}] ${item.title || "Clinic source"}: ${item.content}`).join("\n") : "No matching approved clinic knowledge found.";
  return [
    `You are ${context.name || "Mia"}, StormeAI chat-only receptionist for ${clinic?.name || "this clinic"}.`,
    `Clinic type: ${clinic?.clinic_type || "clinic"}.`,
    `Tone: ${context.tone || "warm, professional, concise"}.`,
    `Language: ${context.language_style || "English, with Taglish when appropriate"}.`,
    settings.businessHours ? `Clinic hours: ${settings.businessHours}.` : undefined,
    settings.bookingInstructions ? `Booking instructions: ${settings.bookingInstructions}` : undefined,
    settings.handoffInstructions ? `Handoff instructions: ${settings.handoffInstructions}` : undefined,
    context.use_approved_knowledge_only ? "Answer clinic-specific questions only from approved clinic knowledge." : "Prefer approved clinic knowledge and be clear when unsure.",
    "Never diagnose, prescribe, interpret symptoms, or present as a doctor.",
    "For urgent symptoms, tell the patient to seek emergency care immediately and offer staff handoff.",
    `Approved clinic knowledge:\n${knowledge}`,
    context.base_system_prompt ? `Clinic custom prompt: ${context.base_system_prompt}` : undefined,
  ].filter(Boolean).join("\n");
}

type AiRequest = { provider: string; model?: string; messages: Array<{ role: string; content: string }>; temperature: number };
async function createChatCompletion(request: AiRequest) {
  const provider = request.provider || Deno.env.get("AI_DEFAULT_PROVIDER") || "openai";
  if (provider === "ollama") return ollamaChat(request);
  if (provider === "anthropic") return anthropicChat(request);
  return openAiChat(request);
}

async function ollamaChat(request: AiRequest) {
  const baseUrl = Deno.env.get("OLLAMA_BASE_URL") || "http://127.0.0.1:11434";
  const model = request.model || Deno.env.get("OLLAMA_MODEL") || "qwen2.5:7b";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: request.messages, stream: false, options: { temperature: request.temperature } }) });
  const raw = await response.json().catch(() => null);
  if (!response.ok) throw new Error(raw?.error || "Ollama request failed");
  return { provider: "ollama", model, content: raw?.message?.content || "" };
}

async function openAiChat(request: AiRequest) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const model = request.model || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: request.messages, temperature: request.temperature }) });
  const raw = await response.json().catch(() => null);
  if (!response.ok) throw new Error(raw?.error?.message || "OpenAI request failed");
  return { provider: "openai", model, content: raw?.choices?.[0]?.message?.content || "" };
}

async function anthropicChat(request: AiRequest) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  const model = request.model || Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-haiku-latest";
  const system = request.messages.find((message) => message.role === "system")?.content;
  const messages = request.messages.filter((message) => message.role !== "system");
  const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model, system, messages, max_tokens: 800, temperature: request.temperature }) });
  const raw = await response.json().catch(() => null);
  if (!response.ok) throw new Error(raw?.error?.message || "Anthropic request failed");
  return { provider: "anthropic", model, content: raw?.content?.map((part: { text?: string }) => part.text || "").join("\n") || "" };
}

function safeFallback(message: string, citations: Array<{ content: string }>, providerError?: string) {
  if (isEmergency(message)) return "I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.";
  if (wantsBooking(message)) return "I can help request an appointment. Please share the patient name, contact number or email, preferred service, and preferred date/time. Clinic staff will confirm availability.";
  if (citations.length) return `I found clinic-approved information that may help: ${citations[0].content.slice(0, 260)}${citations[0].content.length > 260 ? "…" : ""}`;
  return providerError ? `I can’t reach the AI provider right now (${providerError}). I can still collect your concern and route it to clinic staff. What would you like help with?` : "I can’t confirm that from approved clinic knowledge yet. I can collect your question and route it to clinic staff for follow-up.";
}
function isEmergency(message: string) { return ["chest pain", "bleeding", "can't breathe", "cant breathe", "emergency", "urgent", "fainted", "severe pain"].some((term) => message.toLowerCase().includes(term)); }
function wantsBooking(message: string) { return ["appointment", "book", "schedule", "reschedule", "cancel", "available", "slot"].some((term) => message.toLowerCase().includes(term)); }
function wantsHandoff(message: string) { return ["staff", "human", "receptionist", "call me", "contact me", "talk to someone"].some((term) => message.toLowerCase().includes(term)); }
