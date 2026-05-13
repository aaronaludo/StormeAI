import { supabase } from "../supabase";

export type AiProvider = "ollama";

export const DEFAULT_AI_MODEL_ID = "qwen2.5:7b";

export type AgentOption = { agentId: string; organizationId: string; name: string; tone: string; defaultProvider: AiProvider; defaultModel: string; updatedAt?: string };

export type AgentSettingsRecord = {
  organizationId?: string;
  agentId?: string;
  organizationName?: string;
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

export const defaultAgentSettings: AgentSettingsRecord = {
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
  greetingMessage: "Hi! I’m Meng, the organization chat agent. How can I help you today?",
  bookingInstructions: "Collect patient name, contact details, service, preferred date, and preferred time. Do not promise confirmed availability.",
  handoffInstructions: "Offer to notify organization staff when unsure, when asked for a human, or when policy/medical boundaries are reached.",
};

type AgentRpcRow = {
  organization_id?: string;
  agent_id?: string;
  organization_name?: string;
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

export async function loadAgentSettings(organizationId?: string, agentId?: string): Promise<AgentSettingsRecord> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("get_agent_settings_v2", {
    target_organization_id: organizationId || null,
    target_agent_id: agentId || null,
  }).single();
  if (error) throwSupabaseError("Load AI agent settings", error);
  if (!data) throw new Error("No AI agent found. Please finish organization onboarding first.");

  return mapRpcRow(data as AgentRpcRow);
}

export async function saveAgentSettings(settings: AgentSettingsRecord): Promise<AgentSettingsRecord> {
  if (!supabase) throw new Error("Supabase is not configured.");

  if (!settings.organizationId || !settings.agentId) throw new Error("Choose an organization and agent before saving settings.");

  const { data, error } = await supabase.rpc("update_agent_settings_v2", {
    target_organization_id: settings.organizationId,
    target_agent_id: settings.agentId,
    agent_name: settings.name,
    agent_tone: settings.tone,
    agent_language_style: settings.languageStyle,
    agent_base_system_prompt: settings.baseSystemPrompt,
    agent_default_provider: "ollama",
    agent_default_model: DEFAULT_AI_MODEL_ID,
    agent_fallback_provider: null,
    agent_fallback_model: null,
    agent_use_approved_knowledge_only: settings.useApprovedKnowledgeOnly,
    agent_offer_appointment_when_relevant: settings.offerAppointmentWhenRelevant,
    agent_emergency_handoff_enabled: settings.emergencyHandoffEnabled,
    agent_human_handoff_enabled: settings.humanHandoffEnabled,
    agent_settings: {
      businessHours: settings.businessHours,
      escalationContact: settings.escalationContact,
      greetingMessage: settings.greetingMessage,
      bookingInstructions: settings.bookingInstructions,
      handoffInstructions: settings.handoffInstructions,
    },
  }).single();

  if (error) throwSupabaseError("Save AI agent settings", error);
  if (!data) throw new Error("AI agent settings were saved but not returned.");

  return mapRpcRow(data as AgentRpcRow);
}

export async function listAgents(organizationId: string): Promise<AgentOption[]> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("list_agents", { target_organization_id: organizationId });
  if (error) throwSupabaseError("Load AI agents", error);

  return ((data || []) as { agent_id: string; organization_id: string; name: string; tone: string; default_provider: AiProvider; default_model: string; updated_at?: string }[]).map((row) => ({
    agentId: row.agent_id,
    organizationId: row.organization_id,
    name: row.name,
    tone: row.tone,
    defaultProvider: "ollama",
    defaultModel: DEFAULT_AI_MODEL_ID,
    updatedAt: row.updated_at,
  }));
}

export async function createAgent(organizationId: string, name = "Meng") {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("create_agent", {
    target_organization_id: organizationId,
    agent_name: name,
  });
  if (error) throwSupabaseError("Create AI agent", error);
  return data as string;
}

export function buildSettingsPromptPreview(settings: AgentSettingsRecord) {
  const customPrompt = settings.baseSystemPrompt.trim();
  return [
    `You are ${settings.name}, StormeAI chat-only agent for ${settings.organizationName || "this organization"}.`,
    `Tone: ${settings.tone}.`,
    `Language: ${settings.languageStyle}.`,
    settings.businessHours ? `Organization hours: ${settings.businessHours}.` : undefined,
    settings.greetingMessage ? `Greeting: ${settings.greetingMessage}` : undefined,
    settings.bookingInstructions ? `Booking instructions: ${settings.bookingInstructions}` : undefined,
    settings.handoffInstructions ? `Handoff instructions: ${settings.handoffInstructions}` : undefined,
    settings.escalationContact ? `Escalation contact: ${settings.escalationContact}` : undefined,
    settings.useApprovedKnowledgeOnly ? "Answer organization-specific questions only from approved organization knowledge." : "Prefer approved organization knowledge; clearly avoid medical advice.",
    settings.offerAppointmentWhenRelevant ? "Offer to collect appointment details when relevant." : undefined,
    settings.emergencyHandoffEnabled ? "For urgent symptoms, stop normal flow and tell the patient to seek emergency care." : undefined,
    settings.humanHandoffEnabled ? "Offer human staff handoff when unsure or requested." : undefined,
    customPrompt ? `Custom base prompt: ${customPrompt}` : undefined,
    "Never diagnose, prescribe, interpret symptoms, or present as a doctor.",
  ].filter(Boolean).join("\n\n");
}

function mapRpcRow(row: AgentRpcRow): AgentSettingsRecord {
  const settings = row.settings || {};
  return {
    ...defaultAgentSettings,
    organizationId: row.organization_id,
    agentId: row.agent_id,
    organizationName: row.organization_name,
    name: row.name || defaultAgentSettings.name,
    tone: row.tone || defaultAgentSettings.tone,
    languageStyle: row.language_style || defaultAgentSettings.languageStyle,
    baseSystemPrompt: row.base_system_prompt || "",
    defaultProvider: "ollama",
    defaultModel: DEFAULT_AI_MODEL_ID,
    useApprovedKnowledgeOnly: row.use_approved_knowledge_only ?? true,
    offerAppointmentWhenRelevant: row.offer_appointment_when_relevant ?? true,
    emergencyHandoffEnabled: row.emergency_handoff_enabled ?? true,
    humanHandoffEnabled: row.human_handoff_enabled ?? true,
    businessHours: String(settings.businessHours || ""),
    escalationContact: String(settings.escalationContact || ""),
    greetingMessage: String(settings.greetingMessage || defaultAgentSettings.greetingMessage),
    bookingInstructions: String(settings.bookingInstructions || defaultAgentSettings.bookingInstructions),
    handoffInstructions: String(settings.handoffInstructions || defaultAgentSettings.handoffInstructions),
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
