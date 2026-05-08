import { supabase } from "../supabase";
import { getWorkspaceSelection } from "../workspaceSelection";
import type { RagContext } from "../ai/receptionistPrompt";

export type ReceptionistChatTurnInput = {
  sessionId?: string;
  patientMessage: string;
};

export type ReceptionistChatTurnResult = {
  sessionId: string;
  reply: string;
  mode: "ai" | "safe-fallback" | "rule";
  citations: RagContext;
};

export async function sendReceptionistChatTurn(input: ReceptionistChatTurnInput): Promise<ReceptionistChatTurnResult> {
  const selection = getWorkspaceSelection();
  if (!selection.clinicId) throw new Error("Choose a clinic before testing chat.");

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
    reply: data.reply,
    mode: data.mode || "ai",
    citations: data.citations || [],
  };
}

// Kept to avoid breaking future imports that expect Supabase to be initialized here.
void supabase;
