import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL for StormeAI appointment function.");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for StormeAI appointment function.");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json();
    const result = await createAppointmentRequest({
      organizationId: String(body.organizationId || body.organization_id || ""),
      sessionId: body.sessionId || body.session_id || undefined,
      patientName: String(body.patientName || ""),
      contact: String(body.contact || ""),
      service: String(body.service || ""),
      requestedAt: String(body.requestedAt || ""),
      note: String(body.note || ""),
      origin: request.headers.get("origin") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});

async function createAppointmentRequest(input: { organizationId: string; sessionId?: string; patientName: string; contact: string; service: string; requestedAt: string; note?: string; origin?: string; userAgent?: string }) {
  if (!input.organizationId) throw new Error("organizationId is required.");
  if (!input.patientName.trim() || !input.contact.trim() || !input.service.trim() || !input.requestedAt.trim()) throw new Error("Patient name, contact, service, and preferred date/time are required.");

  const requestedStartAt = new Date(input.requestedAt);
  if (Number.isNaN(requestedStartAt.getTime())) throw new Error("Preferred date/time is invalid.");

  const { data: patient, error: patientError } = await supabase.from("patients").insert({
    organization_id: input.organizationId,
    full_name: input.patientName.trim(),
    email: input.contact.includes("@") ? input.contact.trim() : null,
    phone: input.contact.includes("@") ? null : input.contact.trim(),
    metadata: { source: "booking_page", chat_session_id: input.sessionId || null, origin: input.origin || null, user_agent: input.userAgent || null },
  }).select("id").single();
  if (patientError) throw new Error(`Create patient failed: ${patientError.message}`);

  const note = [
    `Service: ${input.service.trim()}`,
    `Preferred time: ${input.requestedAt.trim()}`,
    `Contact: ${input.contact.trim()}`,
    input.sessionId ? `Chat session: ${input.sessionId}` : "",
    input.note?.trim() ? `Note: ${input.note.trim()}` : "",
  ].filter(Boolean).join("\n");

  const { data: appointment, error } = await supabase.from("appointments").insert({
    organization_id: input.organizationId,
    patient_id: patient.id,
    status: "requested",
    requested_start_at: requestedStartAt.toISOString(),
    patient_note: note,
    source: "chat_booking_page",
  }).select("id").single();
  if (error) throw new Error(`Create appointment failed: ${error.message}`);

  if (input.sessionId) {
    await supabase.from("chat_messages").insert({
      organization_id: input.organizationId,
      session_id: input.sessionId,
      sender: "system",
      body: `Appointment request submitted from booking page for ${input.patientName.trim()}.`,
      citations: [],
      metadata: { appointment_id: appointment.id, source: "booking_page" },
    });
  }

  return { appointmentId: appointment.id as string, status: "requested" };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
