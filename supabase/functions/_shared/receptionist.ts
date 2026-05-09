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

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL for StormeAI chat function.");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for StormeAI chat function.");

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
  const bookingUrl = buildBookingUrl(input, sessionId);
  const deterministicReply = answerCommonReceptionistQuestion(patientMessage, context);
  if (deterministicReply) {
    const reply = wantsBooking(patientMessage) ? buildBookingRedirectReply(patientMessage) : deterministicReply;
    await insertMessage(input.clinicId, sessionId, "assistant", reply, citations, { mode: "rule", reason: "common_receptionist_question", booking_url: wantsBooking(patientMessage) ? bookingUrl : undefined });
    await supabase.from("chat_sessions").update({ emergency_flag: emergency, handoff_requested: handoff, last_message_at: new Date().toISOString(), metadata: input.metadata || {} }).eq("id", sessionId);
    return { sessionId, reply, mode: "rule", citations, receptionistName: context.name, bookingUrl: wantsBooking(patientMessage) ? bookingUrl : undefined };
  }

  const prompt = buildPrompt(context, citations);

  let reply = "";
  let mode = "ai";
  try {
    const completion = await createChatCompletion({ provider: "ollama", model: "qwen2.5:7b", messages: [{ role: "system", content: prompt }, { role: "user", content: patientMessage }], temperature: 0.2 });
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

function buildBookingUrl(input: PublicChatInput, sessionId: string) {
  const appUrl = typeof input.metadata?.app_url === "string" && input.metadata.app_url ? input.metadata.app_url.replace(/\/$/, "") : "";
  const origin = appUrl || (typeof input.metadata?.origin === "string" && input.metadata.origin ? input.metadata.origin.replace(/\/$/, "") : "");
  const params = new URLSearchParams({ sessionId });
  if (input.receptionistId) params.set("receptionistId", input.receptionistId);
  return `${origin}/book/${input.clinicId}?${params.toString()}`;
}

async function loadReceptionist(clinicId: string, receptionistId?: string) {
  let query = supabase
    .from("ai_receptionists")
    .select("id,name,tone,language_style,base_system_prompt,default_provider,default_model,use_approved_knowledge_only,offer_appointment_when_relevant,emergency_handoff_enabled,human_handoff_enabled,settings,clinics(name,clinic_type,timezone,business_hours)")
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


async function maybeCreateAppointmentRequest(clinicId: string, sessionId: string, latestMessage: string) {
  if (!wantsBooking(latestMessage)) return null;

  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("source", "chat")
    .ilike("patient_note", `%Chat session: ${sessionId}%`)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return null;

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("body")
    .eq("clinic_id", clinicId)
    .eq("session_id", sessionId)
    .eq("sender", "patient")
    .order("created_at", { ascending: true })
    .limit(12);

  const transcript = [...(messages || []).map((message: any) => String(message.body || "")), latestMessage].join("\n");
  const details = extractAppointmentDetails(transcript);
  if (!details.patientName || !details.contact || !details.service || !details.preferredTime) return null;

  const { data: patient, error: patientError } = await supabase.from("patients").insert({
    clinic_id: clinicId,
    full_name: details.patientName,
    email: details.contact.includes("@") ? details.contact : null,
    phone: details.contact.includes("@") ? null : details.contact,
    metadata: { source: "chat", chat_session_id: sessionId },
  }).select("id").single();
  if (patientError) throw new Error(`Create patient failed: ${patientError.message}`);

  const note = [
    `Service: ${details.service}`,
    `Preferred time: ${details.preferredTime}`,
    `Contact: ${details.contact}`,
    `Chat session: ${sessionId}`,
    `Patient message: ${latestMessage}`,
  ].join("\n");

  const { data: appointment, error } = await supabase.from("appointments").insert({
    clinic_id: clinicId,
    patient_id: patient.id,
    status: "requested",
    requested_start_at: details.requestedStartAt,
    patient_note: note,
    source: "chat",
  }).select("id").single();
  if (error) throw new Error(`Create appointment failed: ${error.message}`);

  return { appointmentId: appointment.id as string, ...details };
}

function extractAppointmentDetails(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = normalized.match(/(?:\+?63|0)?\s?9\d{2}[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]?.replace(/\s+/g, " ");
  const contact = email || phone || "";
  const patientName = firstMatch(normalized, [
    /(?:patient\s*name|name)\s*(?:is|:)?\s*([A-Z][A-Za-z .'-]{1,60})(?=\s+(?:contact|phone|email|service|for|on|at|preferred)|[,.;]|$)/i,
    /(?:i am|i'm|ako si)\s+([A-Z][A-Za-z .'-]{1,60})(?=\s+(?:contact|phone|email|service|for|on|at|preferred)|[,.;]|$)/i,
  ]);
  const service = firstMatch(normalized, [
    /(?:service|for)\s*(?:is|:)?\s*([A-Za-z][A-Za-z /'-]{2,60})(?=\s+(?:on|at|preferred|tomorrow|today|next|contact|phone|email)|[,.;]|$)/i,
    /\b(dental cleaning|consultation|checkup|cleaning|derma consultation|lab test)\b/i,
  ]);
  const preferredTime = firstMatch(normalized, [
    /(?:preferred(?: date\/time| time| date)?|appointment(?: date| time)?|schedule)\s*(?:is|:)?\s*([^.;,]{3,80})/i,
    /\b((?:today|tomorrow|next\s+[A-Za-z]+|\d{4}-\d{1,2}-\d{1,2}|[A-Za-z]+\s+\d{1,2})(?:\s+(?:at\s*)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)\b/i,
  ]);

  return {
    patientName: cleanValue(patientName),
    contact: cleanValue(contact),
    service: cleanValue(service),
    preferredTime: cleanValue(preferredTime),
    requestedStartAt: parsePreferredTime(preferredTime),
  };
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1];
    if (match) return match;
  }
  return "";
}

function cleanValue(value: string) {
  return String(value || "").replace(/\s+/g, " ").replace(/[,.]$/, "").trim();
}

function parsePreferredTime(value: string) {
  const text = String(value || "").toLowerCase();
  const now = new Date();
  let date: Date | null = null;
  if (text.includes("tomorrow")) date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  else if (text.includes("today")) date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) date = new Date(parsed);
  }
  if (!date) return null;
  const time = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (time) {
    let hour = Number(time[1]);
    const minute = Number(time[2] || 0);
    if (time[3] === "pm" && hour < 12) hour += 12;
    if (time[3] === "am" && hour === 12) hour = 0;
    date.setHours(hour, minute, 0, 0);
  }
  return date.toISOString();
}

function answerCommonReceptionistQuestion(message: string, context: any) {
  const lower = message.toLowerCase();
  const clinic = Array.isArray(context.clinics) ? context.clinics[0] : context.clinics;
  const settings = context.settings || {};
  const receptionistName = context.name || "Meng";
  const clinicName = clinic?.name || "the clinic";

  if (["what's your name", "what is your name", "who are you", "your name"].some((term) => lower.includes(term))) {
    return `I’m ${receptionistName}, the StormeAI chat receptionist for ${clinicName}. I can help with clinic questions, appointment requests, and staff handoff.`;
  }

  if (["clinic hours", "business hours", "open", "closing", "closed", "schedule"].some((term) => lower.includes(term))) {
    const hours = settings.businessHours || formatBusinessHours(clinic?.business_hours);
    return hours
      ? `${clinicName} hours: ${hours}. If you want, I can also collect your preferred appointment date and time for staff confirmation.`
      : `I don’t have confirmed clinic hours saved yet for ${clinicName}. I can collect your question and route it to clinic staff, or help request an appointment for staff confirmation.`;
  }

  if (wantsBooking(message)) {
    return buildBookingRedirectReply(message);
  }

  if (isEmergency(message)) {
    return "I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.";
  }

  if (wantsHandoff(message)) {
    return "Sure — I can flag this for clinic staff. Please share your name, contact number or email, and what you need help with.";
  }

  return null;
}

function formatBusinessHours(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return "";
  const entries = Object.entries(value as Record<string, any>);
  if (!entries.length) return "";
  return entries.map(([day, hours]) => {
    if (!hours) return "";
    if (typeof hours === "string") return `${day}: ${hours}`;
    if (hours.closed) return `${day}: closed`;
    return `${day}: ${hours.open || hours.start || ""}${hours.close || hours.end ? `–${hours.close || hours.end}` : ""}`;
  }).filter(Boolean).join("; ");
}

function buildPrompt(context: any, citations: Array<{ title?: string; content: string }>) {
  const clinic = Array.isArray(context.clinics) ? context.clinics[0] : context.clinics;
  const settings = context.settings || {};
  const knowledge = citations.length ? citations.map((item, index) => `[${index + 1}] ${item.title || "Clinic source"}: ${item.content}`).join("\n") : "No matching approved clinic knowledge found.";
  return [
    `You are ${context.name || "Meng"}, StormeAI chat-only receptionist for ${clinic?.name || "this clinic"}.`,
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
  return ollamaChat({ ...request, provider: "ollama", model: "qwen2.5:7b" });
}

async function ollamaChat(request: AiRequest) {
  const baseUrl = Deno.env.get("OLLAMA_BASE_URL") || "http://127.0.0.1:11434";
  const model = "qwen2.5:7b";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: request.messages, stream: false, options: { temperature: request.temperature } }) });
  const raw = await response.json().catch(() => null);
  if (!response.ok) throw new Error(raw?.error || "Ollama request failed");
  return { provider: "ollama", model, content: raw?.message?.content || "" };
}

function safeFallback(message: string, citations: Array<{ content: string }>, providerError?: string) {
  if (isEmergency(message)) return "I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.";
  if (wantsBooking(message)) return buildBookingRedirectReply(message);
  if (citations.length) return `I found clinic-approved information that may help: ${citations[0].content.slice(0, 260)}${citations[0].content.length > 260 ? "…" : ""}`;
  return providerError ? "I can’t confirm that from approved clinic knowledge right now. I can still collect your concern and route it to clinic staff. What would you like help with?" : "I can’t confirm that from approved clinic knowledge yet. I can collect your question and route it to clinic staff for follow-up.";
}
function isEmergency(message: string) { return ["chest pain", "bleeding", "can't breathe", "cant breathe", "emergency", "urgent", "fainted", "severe pain"].some((term) => message.toLowerCase().includes(term)); }
function buildBookingRedirectReply(message: string) {
  const lower = message.toLowerCase();
  const isTaglish = ["gusto", "tulungan", "ako", "mag book", "mag-book", "pa book", "pabook"].some((term) => lower.includes(term));
  return isTaglish
    ? "Oo, tutulungan kita mag-request ng appointment. Para malinaw at kumpleto ang details mo, pindutin ang Redirect button at ilagay doon ang preferred date, time, service, name, at contact details. Clinic staff ang magco-confirm ng availability."
    : "Sure — I can help you request an appointment. Please tap the Redirect button so you can enter your preferred date, time, service, name, and contact details clearly. Clinic staff will confirm availability.";
}
function wantsBooking(message: string) { return ["appointment", "book", "booking", "schedule", "reschedule", "cancel", "available", "slot", "pabook", "pa book", "mag-book", "mag book"].some((term) => message.toLowerCase().includes(term)); }
function wantsHandoff(message: string) { return ["staff", "human", "receptionist", "call me", "contact me", "talk to someone"].some((term) => message.toLowerCase().includes(term)); }
