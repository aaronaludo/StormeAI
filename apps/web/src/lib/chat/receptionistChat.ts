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
  ai_receptionists?: { name?: string | null; tone?: string | null; language_style?: string | null }[];
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
    receptionistName: clinic.ai_receptionists?.[0]?.name || "Mia",
    tone: clinic.ai_receptionists?.[0]?.tone || undefined,
    languageStyle: clinic.ai_receptionists?.[0]?.language_style || undefined,
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

  const { data: membership, error: membershipError } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .limit(1)
    .single();

  if (membershipError) throw new Error(`No clinic workspace found for this account: ${membershipError.message}`);

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id,name,clinic_type,timezone,ai_receptionists(name,tone,language_style)")
    .eq("id", membership.clinic_id)
    .single();

  if (clinicError) throw clinicError;
  return clinic as ClinicContext;
}

async function createChatSession(clinicId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ clinic_id: clinicId, channel: "web_widget", status: "open", last_message_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
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

  const { error } = await supabase.from("chat_messages").insert({
    clinic_id: input.clinicId,
    session_id: input.sessionId,
    sender: input.sender,
    body: input.body,
    citations: input.citations || [],
    metadata: input.metadata || {},
  });

  if (error) throw error;
}

async function updateSession(sessionId: string, flags: { emergency: boolean; handoff: boolean }) {
  if (!supabase) throw new Error("Supabase is not configured.");

  await supabase
    .from("chat_sessions")
    .update({
      last_message_at: new Date().toISOString(),
      emergency_flag: flags.emergency,
      handoff_requested: flags.handoff,
    })
    .eq("id", sessionId);
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
  if (error) return [];

  return (data || [])
    .filter((item) => item.content)
    .map((item) => ({ title: item.title || undefined, content: String(item.content).slice(0, 900) }));
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
