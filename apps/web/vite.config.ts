import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");

  return {
    envDir: "../..",
    plugins: [react(), stormeAiLocalChatPlugin(env)],
  };
});

function stormeAiLocalChatPlugin(env: Record<string, string>): Plugin {
  return {
    name: "stormeai-local-chat",
    configureServer(server) {
      server.middlewares.use("/stormeai-local-chat", async (request, response) => {
        setCors(response);

        if (request.method === "OPTIONS") {
          response.writeHead(204);
          response.end();
          return;
        }

        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const body = await readJsonBody(request);
          const result = await runLocalReceptionistTurn(env, {
            clinicId: String(body.clinicId || body.clinic_id || ""),
            receptionistId: body.receptionistId || body.receptionist_id || undefined,
            sessionId: body.sessionId || body.session_id || undefined,
            message: String(body.message || body.patientMessage || ""),
          });
          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
        }
      });

      server.middlewares.use("/stormeai-local-appointment", async (request, response) => {
        setCors(response);

        if (request.method === "OPTIONS") {
          response.writeHead(204);
          response.end();
          return;
        }

        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const body = await readJsonBody(request);
          const result = await createLocalAppointmentRequest(env, {
            clinicId: String(body.clinicId || body.clinic_id || ""),
            sessionId: body.sessionId || body.session_id || undefined,
            patientName: String(body.patientName || ""),
            contact: String(body.contact || ""),
            service: String(body.service || ""),
            requestedAt: String(body.requestedAt || ""),
            note: String(body.note || ""),
          });
          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  };
}

type LocalChatInput = {
  clinicId: string;
  receptionistId?: string;
  sessionId?: string;
  message: string;
};

type ReceptionistContext = {
  id: string;
  clinic_id: string;
  name: string;
  tone?: string;
  language_style?: string;
  base_system_prompt?: string | null;
  default_provider?: string;
  default_model?: string;
  use_approved_knowledge_only?: boolean;
  settings?: Record<string, unknown> | null;
  clinics?: { name?: string; clinic_type?: string; business_hours?: unknown } | { name?: string; clinic_type?: string; business_hours?: unknown }[];
};

type KnowledgeItem = { title?: string; content: string };
const localChatMessages = new Map<string, string[]>();

async function runLocalReceptionistTurn(env: Record<string, string>, input: LocalChatInput) {
  if (!input.clinicId) throw new Error("clinicId is required.");
  const patientMessage = input.message.trim();
  if (!patientMessage) throw new Error("message is required.");

  const context = await loadReceptionist(env, input.clinicId, input.receptionistId);
  const citations = await retrieveKnowledge(env, input.clinicId, patientMessage);
  const sessionId = input.sessionId || `local-${crypto.randomUUID()}`;
  const history = [...(localChatMessages.get(sessionId) || []), patientMessage];
  localChatMessages.set(sessionId, history.slice(-12));

  const deterministicReply = answerCommonReceptionistQuestion(patientMessage, context) || answerSimpleMath(patientMessage);
  if (deterministicReply) {
    const bookingUrl = `/book/${input.clinicId}?${new URLSearchParams({ sessionId, ...(input.receptionistId ? { receptionistId: input.receptionistId } : {}) }).toString()}`;
    return {
      sessionId,
      reply: wantsBooking(patientMessage) ? "I can help request an appointment. Please tap Redirect to enter the details clearly." : deterministicReply,
      mode: "rule",
      citations,
      receptionistName: context.name,
      bookingUrl: wantsBooking(patientMessage) ? bookingUrl : undefined,
    };
  }

  const completion = await ollamaChat(env, {
    model: "qwen2.5:7b",
    messages: [{ role: "system", content: buildPrompt(context, citations) }, { role: "user", content: patientMessage }],
    temperature: 0.2,
  });

  return { sessionId, reply: completion.content.trim() || safeFallback(patientMessage, citations), mode: "ai", citations, receptionistName: context.name, provider: "ollama", model: completion.model };
}

async function loadReceptionist(env: Record<string, string>, clinicId: string, receptionistId?: string): Promise<ReceptionistContext> {
  const params = new URLSearchParams();
  params.set("select", "id,clinic_id,name,tone,language_style,base_system_prompt,default_provider,default_model,use_approved_knowledge_only,settings,clinics(name,clinic_type,business_hours)");
  params.set("clinic_id", `eq.${clinicId}`);
  if (receptionistId) params.set("id", `eq.${receptionistId}`);
  params.set("order", "updated_at.desc");
  params.set("limit", "1");

  const rows = await supabaseRest<ReceptionistContext[]>(env, `/rest/v1/ai_receptionists?${params.toString()}`);
  if (!rows.length) throw new Error("No AI receptionist found for this clinic.");
  return rows[0];
}

async function retrieveKnowledge(env: Record<string, string>, clinicId: string, message: string): Promise<KnowledgeItem[]> {
  const terms = message.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length >= 4).slice(0, 5) || [];
  const params = new URLSearchParams();
  params.set("select", "title,content");
  params.set("clinic_id", `eq.${clinicId}`);
  params.set("status", "in.(indexed,published,approved)");
  params.set("limit", "4");
  if (terms.length) params.set("or", `(${terms.flatMap((term) => [`title.ilike.%${term}%`, `content.ilike.%${term}%`]).join(",")})`);

  const rows = await supabaseRest<Array<{ title?: string; content?: string }>>(env, `/rest/v1/knowledge_documents?${params.toString()}`);
  return rows.filter((item) => item.content).map((item) => ({ title: item.title || undefined, content: String(item.content).slice(0, 900) }));
}

async function supabaseRest<T>(env: Record<string, string>, path: string): Promise<T> {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) throw new Error("Missing Supabase env vars for local chat gateway.");

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || "Supabase request failed");
  return data as T;
}


async function supabaseWrite<T>(env: Record<string, string>, path: string, payload: unknown): Promise<T> {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) throw new Error("Missing Supabase env vars for local chat gateway.");

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || "Supabase write failed");
  return data as T;
}


async function createLocalAppointmentRequest(env: Record<string, string>, input: { clinicId: string; sessionId?: string; patientName: string; contact: string; service: string; requestedAt: string; note?: string }) {
  if (!input.clinicId) throw new Error("clinicId is required.");
  if (!input.patientName.trim() || !input.contact.trim() || !input.service.trim() || !input.requestedAt.trim()) throw new Error("Patient name, contact, service, and preferred date/time are required.");
  const [patient] = await supabaseWrite<Array<{ id: string }>>(env, "/rest/v1/patients", {
    clinic_id: input.clinicId,
    full_name: input.patientName.trim(),
    email: input.contact.includes("@") ? input.contact.trim() : null,
    phone: input.contact.includes("@") ? null : input.contact.trim(),
    metadata: { source: "booking_page", chat_session_id: input.sessionId || null },
  });
  const note = [`Service: ${input.service.trim()}`, `Preferred time: ${input.requestedAt.trim()}`, `Contact: ${input.contact.trim()}`, input.sessionId ? `Chat session: ${input.sessionId}` : "", input.note?.trim() ? `Note: ${input.note.trim()}` : ""].filter(Boolean).join("\n");
  const [appointment] = await supabaseWrite<Array<{ id: string }>>(env, "/rest/v1/appointments", {
    clinic_id: input.clinicId,
    patient_id: patient.id,
    status: "requested",
    requested_start_at: new Date(input.requestedAt).toISOString(),
    patient_note: note,
    source: "chat_booking_page",
  });
  return { appointmentId: appointment.id, status: "requested" };
}

async function maybeCreateAppointmentRequest(env: Record<string, string>, clinicId: string, sessionId: string, history: string[], latestMessage: string) {
  if (!wantsBooking(latestMessage) && !history.some(wantsBooking)) return null;
  const existingParams = new URLSearchParams();
  existingParams.set("select", "id");
  existingParams.set("clinic_id", `eq.${clinicId}`);
  existingParams.set("source", "eq.chat");
  existingParams.set("patient_note", `ilike.%Chat session: ${sessionId}%`);
  existingParams.set("limit", "1");
  const existing = await supabaseRest<Array<{ id: string }>>(env, `/rest/v1/appointments?${existingParams.toString()}`);
  if (existing.length) return null;

  const details = extractAppointmentDetails(history.join("\n"));
  if (!details.patientName || !details.contact || !details.service || !details.preferredTime) return null;

  const [patient] = await supabaseWrite<Array<{ id: string }>>(env, "/rest/v1/patients", {
    clinic_id: clinicId,
    full_name: details.patientName,
    email: details.contact.includes("@") ? details.contact : null,
    phone: details.contact.includes("@") ? null : details.contact,
    metadata: { source: "chat", chat_session_id: sessionId },
  });

  const note = [
    `Service: ${details.service}`,
    `Preferred time: ${details.preferredTime}`,
    `Contact: ${details.contact}`,
    `Chat session: ${sessionId}`,
    `Patient message: ${latestMessage}`,
  ].join("\n");

  const [appointment] = await supabaseWrite<Array<{ id: string }>>(env, "/rest/v1/appointments", {
    clinic_id: clinicId,
    patient_id: patient.id,
    status: "requested",
    requested_start_at: details.requestedStartAt,
    patient_note: note,
    source: "chat",
  });

  return { appointmentId: appointment.id, ...details };
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

async function ollamaChat(env: Record<string, string>, request: { model: string; messages: Array<{ role: string; content: string }>; temperature: number }) {
  const baseUrl = env.VITE_OLLAMA_BASE_URL || env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: request.model, messages: request.messages, stream: false, options: { temperature: request.temperature } }),
  });
  const raw = await response.json().catch(() => null);
  if (!response.ok) throw new Error(raw?.error || "Ollama request failed");
  return { model: request.model, content: raw?.message?.content || "" };
}

function buildPrompt(context: ReceptionistContext, citations: KnowledgeItem[]) {
  const clinic = Array.isArray(context.clinics) ? context.clinics[0] : context.clinics;
  const settings = context.settings || {};
  const knowledge = citations.length ? citations.map((item, index) => `[${index + 1}] ${item.title || "Clinic source"}: ${item.content}`).join("\n") : "No matching approved clinic knowledge found.";
  return [
    `You are ${context.name || "Meng"}, StormeAI chat-only receptionist for ${clinic?.name || "this clinic"}.`,
    `Clinic type: ${clinic?.clinic_type || "clinic"}.`,
    `Tone: ${context.tone || "warm, professional, concise"}.`,
    `Language: ${context.language_style || "English, with Taglish when appropriate"}. Reply in English unless the patient writes in Tagalog/Taglish. Do not mix in other languages or scripts.`,
    settings.businessHours ? `Clinic hours: ${settings.businessHours}.` : undefined,
    settings.bookingInstructions ? `Booking instructions: ${settings.bookingInstructions}` : undefined,
    settings.handoffInstructions ? `Handoff instructions: ${settings.handoffInstructions}` : undefined,
    context.use_approved_knowledge_only ? "Answer clinic-specific questions only from approved clinic knowledge. You may still answer harmless general non-medical questions, greetings, and simple math directly." : "Prefer approved clinic knowledge and be clear when unsure.",
    "Never diagnose, prescribe, interpret symptoms, recommend treatments, or present as a doctor.",
    "For urgent symptoms, tell the patient to seek emergency care immediately and offer staff handoff.",
    `Approved clinic knowledge:\n${knowledge}`,
    context.base_system_prompt ? `Clinic custom prompt: ${context.base_system_prompt}` : undefined,
  ].filter(Boolean).join("\n");
}

function answerCommonReceptionistQuestion(message: string, context: ReceptionistContext) {
  const lower = message.toLowerCase();
  const clinic = Array.isArray(context.clinics) ? context.clinics[0] : context.clinics;
  const settings = context.settings || {};
  const receptionistName = context.name || "Meng";
  const clinicName = clinic?.name || "the clinic";

  if (["what's your name", "what is your name", "who are you", "your name"].some((term) => lower.includes(term))) {
    return `I’m ${receptionistName}, the StormeAI chat receptionist for ${clinicName}. I can help with clinic questions, appointment requests, and staff handoff.`;
  }
  if (["clinic hours", "business hours", "open", "closing", "closed", "schedule"].some((term) => lower.includes(term))) {
    const hours = String(settings.businessHours || formatBusinessHours(clinic?.business_hours));
    return hours
      ? `${clinicName} hours: ${hours}. If you want, I can also collect your preferred appointment date and time for staff confirmation.`
      : `I don’t have confirmed clinic hours saved yet for ${clinicName}. I can collect your question and route it to clinic staff, or help request an appointment for staff confirmation.`;
  }
  if (wantsBooking(message)) return "I can help request an appointment. Please use the booking form so you can enter the details clearly. Clinic staff will confirm availability.";
  if (isEmergency(message)) return "I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.";
  if (wantsHandoff(message)) return "Sure — I can flag this for clinic staff. Please share your name, contact number or email, and what you need help with.";
  return null;
}

function answerSimpleMath(message: string) {
  const normalized = message.trim().replace(/[?=]+$/g, "").trim();
  const match = normalized.match(/^(?:what(?:'s| is)?\s+)?(-?\d+(?:\.\d+)?)\s*(\+|-|\*|x|×|\/|divided by|plus|minus|times)\s*(-?\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const left = Number(match[1]);
  const op = match[2].toLowerCase();
  const right = Number(match[3]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if ((op === "/" || op === "divided by") && right === 0) return "That can’t be calculated because division by zero is undefined.";
  const result = op === "+" || op === "plus" ? left + right : op === "-" || op === "minus" ? left - right : op === "*" || op === "x" || op === "×" || op === "times" ? left * right : left / right;
  return `${match[1]} ${match[2]} ${match[3]} = ${Number.isInteger(result) ? result : Number(result.toFixed(8))}.`;
}

function safeFallback(message: string, citations: KnowledgeItem[]) {
  if (isEmergency(message)) return "I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.";
  if (wantsBooking(message)) return "I can help request an appointment. Please use the booking form so you can enter the details clearly. Clinic staff will confirm availability.";
  if (citations.length) return `I found clinic-approved information that may help: ${citations[0].content.slice(0, 260)}${citations[0].content.length > 260 ? "…" : ""}`;
  return "I can’t confirm that from approved clinic knowledge yet. I can collect your question and route it to clinic staff for follow-up.";
}

function formatBusinessHours(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return "";
  return Object.entries(value as Record<string, any>).map(([day, hours]) => {
    if (!hours) return "";
    if (typeof hours === "string") return `${day}: ${hours}`;
    if (hours.closed) return `${day}: closed`;
    return `${day}: ${hours.open || hours.start || ""}${hours.close || hours.end ? `–${hours.close || hours.end}` : ""}`;
  }).filter(Boolean).join("; ");
}

function isEmergency(message: string) { return ["chest pain", "bleeding", "can't breathe", "cant breathe", "emergency", "urgent", "fainted", "severe pain"].some((term) => message.toLowerCase().includes(term)); }
function wantsBooking(message: string) { return ["appointment", "book", "schedule", "reschedule", "cancel", "available", "slot"].some((term) => message.toLowerCase().includes(term)); }
function wantsHandoff(message: string) { return ["staff", "human", "receptionist", "call me", "contact me", "talk to someone"].some((term) => message.toLowerCase().includes(term)); }

function setCors(response: any) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function sendJson(response: any, status: number, payload: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
    request.on("error", reject);
  });
}
