import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

type AttachmentPayload = { filename: string; content: string; contentType?: string };
type MarketingEmailPayload = {
  organizationId: string;
  to: string[];
  subject: string;
  body: string;
  fromName?: string;
  replyTo?: string;
  attachments?: AttachmentPayload[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "StormeAI <no-reply@stormeai.local>";

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL for marketing email function.");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for marketing email function.");

const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!resendApiKey) return json({ error: "RESEND_API_KEY is not configured" }, 500);

  try {
    const authHeader = request.headers.get("Authorization") || "";
    const authSupabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await authSupabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Authentication required" }, 401);

    const payload = (await request.json()) as MarketingEmailPayload;
    const organizationId = String(payload.organizationId || "");
    if (!organizationId) return json({ error: "organizationId is required" }, 400);
    if (!payload.subject?.trim()) return json({ error: "Subject is required" }, 400);
    if (!payload.body?.trim()) return json({ error: "Body is required" }, 400);

    const recipients = Array.from(new Set((payload.to || []).map((email) => String(email).trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))));
    if (!recipients.length) return json({ error: "At least one valid email recipient is required" }, 400);
    if (recipients.length > 100) return json({ error: "Send at most 100 recipients per campaign" }, 400);

    const { data: member, error: memberError } = await serviceSupabase
      .from("organization_members")
      .select("id,role")
      .eq("organization_id", organizationId)
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!member) return json({ error: "You are not a member of this organization" }, 403);

    const { data: organization } = await serviceSupabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();
    const subject = payload.subject.trim();
    const text = payload.body.trim();
    const html = renderMarketingEmail({ organizationName: organization?.name || "Organization", body: text });
    const attachments = (payload.attachments || []).slice(0, 5).map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      content_type: attachment.contentType,
    }));

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: payload.fromName?.trim() ? `${payload.fromName.trim()} <${extractEmail(fromEmail)}>` : fromEmail,
        to: recipients,
        subject,
        text,
        html,
        reply_to: payload.replyTo?.trim() || undefined,
        attachments: attachments.length ? attachments : undefined,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) return json({ error: "Resend failed", result }, response.status);

    return json({ ok: true, sent: recipients.length, result });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});

function renderMarketingEmail(input: { organizationName: string; body: string }) {
  const escapedBody = escapeHtml(input.body).replace(/\n/g, "<br />");
  return `
    <div style="margin:0;background:#f8fafc;padding:28px;font-family:Inter,Arial,sans-serif;color:#0f172a">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#2563eb,#14b8a6);color:white">
          <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.86">Organization notice</div>
          <h1 style="margin:8px 0 0;font-size:26px;line-height:1.15">${escapeHtml(input.organizationName)}</h1>
        </div>
        <div style="padding:28px;font-size:16px;line-height:1.65">${escapedBody}</div>
        <div style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5">
          You are receiving this because you shared your contact details with the organization. StormeAI is an organization agent tool and does not provide medical advice.
        </div>
      </div>
    </div>`;
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

function extractEmail(value: string) {
  return value.match(/<([^>]+)>/)?.[1] || value;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
