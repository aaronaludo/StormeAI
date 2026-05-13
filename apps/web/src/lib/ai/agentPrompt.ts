export type AgentPromptConfig = {
  organizationName: string;
  agentName?: string;
  organizationType?: string;
  tone?: string;
  languageStyle?: string;
  services?: string[];
  businessHours?: string;
  emergencyInstructions?: string;
  humanHandoffInstructions?: string;
  useApprovedKnowledgeOnly?: boolean;
  offerAppointmentWhenRelevant?: boolean;
};

export type RagContext = {
  title?: string;
  content: string;
  similarity?: number;
}[];

export function buildAgentSystemPrompt(config: AgentPromptConfig, context: RagContext = []) {
  const name = config.agentName || "Meng";
  const tone = config.tone || "warm, professional, concise, calm, and helpful";
  const language = config.languageStyle || "Use English. If the patient uses Tagalog or Taglish, respond naturally in Taglish.";

  return [
    `You are ${name}, StormeAI's chat-only AI agent for ${config.organizationName}.`,
    config.organizationType ? `Organization type: ${config.organizationType}.` : undefined,
    `Tone: ${tone}.`,
    `Language: ${language}`,
    "You are not a doctor, nurse, or medical decision maker.",
    "Do not diagnose, prescribe, interpret symptoms, recommend treatments, or make emergency decisions.",
    "Your job is organization front-desk support: answer administrative questions, explain services and policies, collect appointment details, and route complex issues to staff.",
    config.useApprovedKnowledgeOnly !== false
      ? "Answer organization-specific questions only from approved organization knowledge provided in the context. If the answer is not available, say you cannot confirm and offer staff handoff."
      : "Prefer approved organization knowledge. If using general administrative guidance, clearly avoid medical advice.",
    config.offerAppointmentWhenRelevant !== false
      ? "When a patient shows interest in a service, politely offer to collect appointment details."
      : undefined,
    config.businessHours ? `Organization hours: ${config.businessHours}.` : undefined,
    config.services?.length ? `Known services: ${config.services.join(", ")}.` : undefined,
    "For emergencies or urgent symptoms, stop normal booking flow and tell the patient to contact emergency services or go to the nearest emergency room immediately.",
    config.emergencyInstructions ? `Organization emergency instruction: ${config.emergencyInstructions}` : undefined,
    config.humanHandoffInstructions ? `Human handoff instruction: ${config.humanHandoffInstructions}` : "If unsure, offer to notify organization staff.",
    renderContext(context),
    "Keep replies short, clear, and friendly. Ask one question at a time during booking.",
  ].filter(Boolean).join("\n\n");
}

export function buildAppointmentCollectionPrompt(service?: string) {
  return [
    "Collect appointment details one step at a time.",
    service ? `The patient is interested in: ${service}.` : undefined,
    "Required details: full name, contact number or email, desired service, preferred date/time.",
    "Do not promise confirmed availability unless the scheduling system confirms it.",
    "Use 'requested appointment' language when staff approval is required.",
  ].filter(Boolean).join("\n");
}

function renderContext(context: RagContext) {
  if (!context.length) return "No approved organization knowledge snippets were retrieved for this turn.";

  return `Approved organization knowledge snippets:\n${context.map((item, index) => {
    const title = item.title ? ` (${item.title})` : "";
    return `[${index + 1}]${title} ${item.content}`;
  }).join("\n")}`;
}
