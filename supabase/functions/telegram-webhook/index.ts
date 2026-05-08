import { runReceptionistTurn } from "../_shared/receptionist.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("ok");
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const clinicId = Deno.env.get("STORMEAI_TELEGRAM_CLINIC_ID");
  const receptionistId = Deno.env.get("STORMEAI_TELEGRAM_RECEPTIONIST_ID") || undefined;
  if (!token || !clinicId) return new Response("Missing TELEGRAM_BOT_TOKEN or STORMEAI_TELEGRAM_CLINIC_ID", { status: 500 });

  try {
    const update = await request.json();
    const message = update.message || update.edited_message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;
    if (!text || !chatId) return new Response("ignored");

    const result = await runReceptionistTurn({
      clinicId,
      receptionistId,
      channel: "telegram",
      patientMessage: text,
      metadata: { telegram_chat_id: String(chatId), telegram_user_id: message.from?.id ? String(message.from.id) : undefined, telegram_username: message.from?.username, telegram_message_id: message.message_id },
    });

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: result.reply, disable_web_page_preview: true }),
    });
    return new Response("ok");
  } catch (error) {
    console.error(error);
    return new Response("error", { status: 500 });
  }
});
