import { supabase } from "../supabase";

export type AiProvider = "ollama";

export const DEFAULT_AI_MODEL_ID = "qwen2.5:7b";

export type ReceptionistOption = { receptionistId: string; clinicId: string; name: string; tone: string; defaultProvider: AiProvider; defaultModel: string; updatedAt?: string };

export type ReceptionistSettingsRecord = {
  clinicId?: string;
  receptionistId?: string;
  clinicName?: string;
  name: string;
  tone: string;
  languageStyle: string;
  baseSystemPrompt: string;
  defaultProvider: AiProvider;
  defaultModel: string;
  useApprovedKnowledgeOnly: boolean;
  offerAppointmentWhenRelevant: boolean;
  emergencyHandoffEnabled: boolean;
  humanHandoffEnabled: boolean;
  businessHours: string;
  escalationContact: string;
  greetingMessage: string;
  bookingInstructions: string;
  handoffInstructions: string;
};

export const defaultReceptionistSettings: ReceptionistSettingsRecord = {
  name: "Meng",
  tone: "Warm, professional, concise",
  languageStyle: "English, with Taglish when appropriate",
  baseSystemPrompt: "",
  defaultProvider: "ollama",
  defaultModel: DEFAULT_AI_MODEL_ID,
  useApprovedKnowledgeOnly: true,
  offerAppointmentWhenRelevant: true,
  emergencyHandoffEnabled: true,
  humanHandoffEnabled: true,
  businessHours: "",
  escalationContact: "",
  greetingMessage: "Hi! I’m Meng, the clinic chat receptionist. How can I help you today?",
  bookingInstructions: "Collect patient name, contact details, service, preferred date, and preferred time. Do not promise confirmed availability.",
  handoffInstructions: "Offer to notify clinic staff when unsure, when asked for a human, or when policy/medical boundaries are reached.",
};

type ReceptionistRpcRow = {
  clinic_id?: string;
  receptionist_id?: string;
  clinic_name?: string;
  name?: string;
  tone?: string;
  language_style?: string;
  base_system_prompt?: string | null;
  default_provider?: AiProvider;
  default_model?: string;
  use_approved_knowledge_only?: boolean;
  offer_appointment_when_relevant?: boolean;
  emergency_handoff_enabled?: boolean;
  human_handoff_enabled?: boolean;
  settings?: Record<string, unknown> | null;
};

export async function loadReceptionistSettings(clinicId?: string, receptionistId?: string): Promise<ReceptionistSettingsRecord> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("get_ai_receptionist_settings_v2", {
    target_clinic_id: clinicId || null,
    target_receptionist_id: receptionistId || null,
  }).single();
  if (error) throwSupabaseError("Load AI receptionist settings", error);
  if (!data) throw new Error("No AI receptionist found. Please finish clinic onboarding first.");

  return mapRpcRow(data as ReceptionistRpcRow);
}

export async function saveReceptionistSettings(settings: ReceptionistSettingsRecord): Promise<ReceptionistSettingsRecord> {
  if (!supabase) throw new Error("Supabase is not configured.");

  if (!settings.clinicId || !settings.receptionistId) throw new Error("Choose a clinic and receptionist before saving settings.");

  const { data, error } = await supabase.rpc("update_ai_receptionist_settings_v2", {
    target_clinic_id: settings.clinicId,
    target_receptionist_id: settings.receptionistId,
    receptionist_name: settings.name,
    receptionist_tone: settings.tone,
    receptionist_language_style: settings.languageStyle,
    receptionist_base_system_prompt: settings.baseSystemPrompt,
    receptionist_default_provider: "ollama",
    receptionist_default_model: DEFAULT_AI_MODEL_ID,
    receptionist_fallback_provider: null,
    receptionist_fallback_model: null,
    receptionist_use_approved_knowledge_only: settings.useApprovedKnowledgeOnly,
    receptionist_offer_appointment_when_relevant: settings.offerAppointmentWhenRelevant,
    receptionist_emergency_handoff_enabled: settings.emergencyHandoffEnabled,
    receptionist_human_handoff_enabled: settings.humanHandoffEnabled,
    receptionist_settings: {
      businessHours: settings.businessHours,
      escalationContact: settings.escalationContact,
      greetingMessage: settings.greetingMessage,
      bookingInstructions: settings.bookingInstructions,
      handoffInstructions: settings.handoffInstructions,
    },
  }).single();

  if (error) throwSupabaseError("Save AI receptionist settings", error);
  if (!data) throw new Error("AI receptionist settings were saved but not returned.");

  return mapRpcRow(data as ReceptionistRpcRow);
}

export async function listReceptionists(clinicId: string): Promise<ReceptionistOption[]> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("list_ai_receptionists", { target_clinic_id: clinicId });
  if (error) throwSupabaseError("Load AI receptionists", error);

  return ((data || []) as { receptionist_id: string; clinic_id: string; name: string; tone: string; default_provider: AiProvider; default_model: string; updated_at?: string }[]).map((row) => ({
    receptionistId: row.receptionist_id,
    clinicId: row.clinic_id,
    name: row.name,
    tone: row.tone,
    defaultProvider: "ollama",
    defaultModel: DEFAULT_AI_MODEL_ID,
    updatedAt: row.updated_at,
  }));
}

export async function createReceptionist(clinicId: string, name = "Meng") {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("create_ai_receptionist", {
    target_clinic_id: clinicId,
    receptionist_name: name,
  });
  if (error) throwSupabaseError("Create AI receptionist", error);
  return data as string;
}

export function buildSettingsPromptPreview(settings: ReceptionistSettingsRecord) {
  const customPrompt = settings.baseSystemPrompt.trim();
  return [
    `You are ${settings.name}, StormeAI chat-only receptionist for ${settings.clinicName || "this clinic"}.`,
    `Tone: ${settings.tone}.`,
    `Language: ${settings.languageStyle}.`,
    settings.businessHours ? `Clinic hours: ${settings.businessHours}.` : undefined,
    settings.greetingMessage ? `Greeting: ${settings.greetingMessage}` : undefined,
    settings.bookingInstructions ? `Booking instructions: ${settings.bookingInstructions}` : undefined,
    settings.handoffInstructions ? `Handoff instructions: ${settings.handoffInstructions}` : undefined,
    settings.escalationContact ? `Escalation contact: ${settings.escalationContact}` : undefined,
    settings.useApprovedKnowledgeOnly ? "Answer clinic-specific questions only from approved clinic knowledge." : "Prefer approved clinic knowledge; clearly avoid medical advice.",
    settings.offerAppointmentWhenRelevant ? "Offer to collect appointment details when relevant." : undefined,
    settings.emergencyHandoffEnabled ? "For urgent symptoms, stop normal flow and tell the patient to seek emergency care." : undefined,
    settings.humanHandoffEnabled ? "Offer human staff handoff when unsure or requested." : undefined,
    customPrompt ? `Custom base prompt: ${customPrompt}` : undefined,
    "Never diagnose, prescribe, interpret symptoms, or present as a doctor.",
  ].filter(Boolean).join("\n\n");
}

function mapRpcRow(row: ReceptionistRpcRow): ReceptionistSettingsRecord {
  const settings = row.settings || {};
  return {
    ...defaultReceptionistSettings,
    clinicId: row.clinic_id,
    receptionistId: row.receptionist_id,
    clinicName: row.clinic_name,
    name: row.name || defaultReceptionistSettings.name,
    tone: row.tone || defaultReceptionistSettings.tone,
    languageStyle: row.language_style || defaultReceptionistSettings.languageStyle,
    baseSystemPrompt: row.base_system_prompt || "",
    defaultProvider: "ollama",
    defaultModel: DEFAULT_AI_MODEL_ID,
    useApprovedKnowledgeOnly: row.use_approved_knowledge_only ?? true,
    offerAppointmentWhenRelevant: row.offer_appointment_when_relevant ?? true,
    emergencyHandoffEnabled: row.emergency_handoff_enabled ?? true,
    humanHandoffEnabled: row.human_handoff_enabled ?? true,
    businessHours: String(settings.businessHours || ""),
    escalationContact: String(settings.escalationContact || ""),
    greetingMessage: String(settings.greetingMessage || defaultReceptionistSettings.greetingMessage),
    bookingInstructions: String(settings.bookingInstructions || defaultReceptionistSettings.bookingInstructions),
    handoffInstructions: String(settings.handoffInstructions || defaultReceptionistSettings.handoffInstructions),
  };
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
