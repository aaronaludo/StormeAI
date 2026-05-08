import { runReceptionistTurn } from "../_shared/receptionist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json();
    const result = await runReceptionistTurn({
      clinicId: String(body.clinicId || body.clinic_id || ""),
      receptionistId: body.receptionistId || body.receptionist_id || undefined,
      sessionId: body.sessionId || body.session_id || undefined,
      channel: "web_widget",
      patientMessage: String(body.message || body.patientMessage || ""),
      metadata: { origin: request.headers.get("origin") || undefined, user_agent: request.headers.get("user-agent") || undefined },
    });
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
