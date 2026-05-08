type Payload = {
  eventType: string;
  data: Record<string, unknown>;
  webhookUrl?: string;
};

const defaultWebhookBase = Deno.env.get("N8N_WEBHOOK_BASE_URL")?.replace(/\/$/, "");

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const payload = (await request.json()) as Payload;
  const target = payload.webhookUrl || `${defaultWebhookBase}/${payload.eventType.replaceAll(".", "-")}`;
  if (!target || target.startsWith("undefined")) return Response.json({ error: "n8n webhook URL is not configured" }, { status: 500 });

  const response = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: payload.eventType, data: payload.data, sentAt: new Date().toISOString() }),
  });

  const text = await response.text();
  if (!response.ok) return Response.json({ ok: false, status: response.status, body: text }, { status: 502 });

  return Response.json({ ok: true, status: response.status, body: text });
});
