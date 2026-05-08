type AppointmentEmailPayload = {
  to: string;
  clinicName: string;
  patientName: string;
  serviceName: string;
  appointmentTime: string;
  status: "requested" | "confirmed" | "rescheduled" | "canceled";
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "StormeAI <no-reply@stormeai.local>";

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!resendApiKey) return Response.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 });

  const payload = (await request.json()) as AppointmentEmailPayload;
  const subject = subjectFor(payload);
  const html = renderEmail(payload);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to: payload.to, subject, html }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) return Response.json({ error: "Resend failed", result }, { status: response.status });

  return Response.json({ ok: true, result });
});

function subjectFor(payload: AppointmentEmailPayload) {
  const label = payload.status === "requested" ? "Appointment request received" : `Appointment ${payload.status}`;
  return `${label} — ${payload.clinicName}`;
}

function renderEmail(payload: AppointmentEmailPayload) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h1>${payload.clinicName}</h1>
      <p>Hi ${payload.patientName},</p>
      <p>Your ${payload.serviceName} appointment is marked as <strong>${payload.status}</strong>.</p>
      <p><strong>Schedule:</strong> ${payload.appointmentTime}</p>
      <p>If you have questions, reply to the clinic directly.</p>
      <p style="color:#64748b">StormeAI is a chat-only clinic receptionist and does not provide medical advice.</p>
    </div>`;
}
