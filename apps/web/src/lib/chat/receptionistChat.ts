import { createChatCompletion } from "../ai/providers";
import { buildReceptionistSystemPrompt, type RagContext } from "../ai/receptionistPrompt";
import { supabase } from "../supabase";

export type ReceptionistChatTurnInput = {
  sessionId?: string;
  patientMessage: string;
};

export type ReceptionistChatTurnResult = {
  sessionId: string;
  reply: string;
  mode: "ai" | "safe-fallback";
  citations: RagContext;
};

type ClinicContext = {
  id: string;
  name: string;
  clinic_type?: string | null;
  timezone?: string | null;
  receptionist_name?: string | null;
  receptionist_tone?: string | null;
  receptionist_language_style?: string | null;
};

export async function sendReceptionistChatTurn(input: ReceptionistChatTurnInput): Promise<ReceptionistChatTurnResult> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const clinic = await getActiveClinic();
  const sessionId = input.sessionId || await createChatSession(clinic.id);
  const patientMessage = input.patientMessage.trim();
  if (!patientMessage) throw new Error("Message is empty.");

  await insertMessage({ clinicId: clinic.id, sessionId, sender: "patient", body: patientMessage });

  const citations = await retrieveKnowledge(clinic.id, patientMessage);
  const prompt = buildReceptionistSystemPrompt({
    clinicName: clinic.name,
    clinicType: clinic.clinic_type || undefined,
    receptionistName: clinic.receptionist_name || "Mia",
    tone: clinic.receptionist_tone || undefined,
    languageStyle: clinic.receptionist_language_style || undefined,
    useApprovedKnowledgeOnly: true,
    offerAppointmentWhenRelevant: true,
  }, citations);

  const emergency = isEmergency(patientMessage);
  const handoff = wantsHandoff(patientMessage);

  try {
    const completion = await createChatCompletion({
      temperature: 0.2,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: patientMessage },
      ],
    });

    const reply = completion.content.trim() || safeFallback(patientMessage, citations);
    await insertMessage({
      clinicId: clinic.id,
      sessionId,
      sender: "assistant",
      body: reply,
      citations,
      metadata: { provider: completion.provider, model: completion.model, mode: "ai" },
    });
    await updateSession(sessionId, { emergency, handoff });

    return { sessionId, reply, mode: "ai", citations };
  } catch (error) {
    const reply = safeFallback(patientMessage, citations, error instanceof Error ? error.message : undefined);
    await insertMessage({
      clinicId: clinic.id,
      sessionId,
      sender: "assistant",
      body: reply,
      citations,
      metadata: { mode: "safe-fallback", error: error instanceof Error ? error.message : "AI provider failed" },
    });
    await updateSession(sessionId, { emergency, handoff });

    return { sessionId, reply, mode: "safe-fallback", citations };
  }
}

async function getActiveClinic(): Promise<ClinicContext> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .rpc("get_active_clinic_workspace")
    .single();

  if (error) throwSupabaseError("Find active clinic workspace", error);
  if (!data) throw new Error("No clinic workspace found for this account. Please finish onboarding first.");

  return data as ClinicContext;
}

async function createChatSession(clinicId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("create_receptionist_chat_session", {
    target_clinic_id: clinicId,
  });

  if (error) throwSupabaseError("Create chat session", error);
  return data as string;
}

async function insertMessage(input: {
  clinicId: string;
  sessionId: string;
  sender: "patient" | "assistant" | "staff" | "system";
  body: string;
  citations?: unknown;
  metadata?: Record<string, unknown>;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.rpc("record_receptionist_chat_message", {
    target_clinic_id: input.clinicId,
    target_session_id: input.sessionId,
    message_sender: input.sender,
    message_body: input.body,
    message_citations: input.citations || [],
    message_metadata: input.metadata || {},
    emergency: false,
    handoff: false,
  });

  if (error) throwSupabaseError("Save chat message", error);
}

async function updateSession(_sessionId: string, _flags: { emergency: boolean; handoff: boolean }) {
  // Session flags are updated by record_receptionist_chat_message.
}

async function retrieveKnowledge(clinicId: string, message: string): Promise<RagContext> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const terms = message.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length >= 4).slice(0, 5) || [];
  const orFilter = terms.flatMap((term) => [`title.ilike.%${term}%`, `content.ilike.%${term}%`]).join(",");

  let query = supabase
    .from("knowledge_documents")
    .select("title,content")
    .eq("clinic_id", clinicId)
    .in("status", ["indexed", "published", "approved"])
    .limit(4);

  if (orFilter) query = query.or(orFilter);

  const { data, error } = await query;
  if (error) {
    console.warn("Knowledge lookup failed", error);
    return [];
  }

  return (data || [])
    .filter((item) => item.content)
    .map((item) => ({ title: item.title || undefined, content: String(item.content).slice(0, 900) }));
}

function throwSupabaseError(action: string, error: unknown): never {
  if (error instanceof Error) throw new Error(`${action} failed: ${error.message}`);

  if (error && typeof error === "object") {
    const details = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [details.message, details.details, details.hint, details.code ? `code: ${details.code}` : undefined].filter(Boolean);
    throw new Error(`${action} failed: ${parts.join(" · ") || JSON.stringify(error)}`);
  }

  throw new Error(`${action} failed: ${String(error)}`);
}

function describeUnknownError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const details = error as { message?: string; details?: string; hint?: string; code?: string };
    return [details.message, details.details, details.hint, details.code ? `code: ${details.code}` : undefined].filter(Boolean).join(" · ") || JSON.stringify(error);
  }
  return String(error);
}

function safeFallback(message: string, citations: RagContext, providerError?: string) {
  if (isEmergency(message)) {
    return "I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.";
  }

  if (wantsBooking(message)) {
    return "I can help request an appointment. Please share the patient name, contact number or email, preferred service, and preferred date/time. Clinic staff will confirm availability.";
  }

  if (citations.length) {
    return `I found clinic-approved information that may help: ${citations[0].content.slice(0, 260)}${citations[0].content.length > 260 ? "…" : ""}`;
  }

  return providerError
    ? `I can’t reach the AI provider right now (${providerError}). I can still collect your concern and route it to clinic staff. What would you like help with?`
    : "I can’t confirm that from approved clinic knowledge yet. I can collect your question and route it to clinic staff for follow-up.";
}

function isEmergency(message: string) {
  return ["chest pain", "bleeding", "can't breathe", "cant breathe", "emergency", "urgent", "fainted", "severe pain"].some((term) => message.toLowerCase().includes(term));
}

function wantsBooking(message: string) {
  return ["appointment", "book", "schedule", "reschedule", "cancel", "available", "slot"].some((term) => message.toLowerCase().includes(term));
}

function wantsHandoff(message: string) {
  return ["staff", "human", "receptionist", "call me", "contact me", "talk to someone"].some((term) => message.toLowerCase().includes(term));
}
