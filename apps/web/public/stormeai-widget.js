(function () {
  const currentScript = document.currentScript;
  const config = {
    clinicId: currentScript?.dataset.clinicId || window.StormeAI?.clinicId,
    receptionistId: currentScript?.dataset.receptionistId || window.StormeAI?.receptionistId,
    apiUrl: (currentScript?.dataset.apiUrl || window.StormeAI?.apiUrl || "").replace(/\/$/, ""),
    title: currentScript?.dataset.title || window.StormeAI?.title || "Clinic chat",
    greeting: currentScript?.dataset.greeting || window.StormeAI?.greeting || "Hi! I’m the clinic AI receptionist. How can I help?",
    accent: currentScript?.dataset.accent || window.StormeAI?.accent || "#2563eb",
  };

  if (!config.clinicId || !config.apiUrl) {
    console.warn("StormeAI widget needs data-clinic-id and data-api-url.");
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    .stormeai-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483647;border:0;border-radius:999px;background:${config.accent};color:#fff;padding:14px 18px;font:800 14px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 18px 40px rgba(15,23,42,.22);cursor:pointer}.stormeai-panel{position:fixed;right:20px;bottom:82px;z-index:2147483647;width:min(380px,calc(100vw - 28px));height:560px;max-height:calc(100vh - 110px);border:1px solid #e2e8f0;border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(15,23,42,.24);overflow:hidden;display:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.stormeai-panel.open{display:grid;grid-template-rows:auto 1fr auto}.stormeai-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;background:linear-gradient(135deg,${config.accent},#14b8a6);color:#fff}.stormeai-head strong{display:block}.stormeai-head span{font-size:12px;opacity:.9}.stormeai-close{border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:999px;width:32px;height:32px;cursor:pointer}.stormeai-messages{padding:16px;overflow:auto;background:#f8fafc;display:grid;align-content:start;gap:10px}.stormeai-msg{max-width:86%;padding:10px 12px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap}.stormeai-msg.assistant{background:#fff;border:1px solid #e2e8f0;color:#0f172a}.stormeai-msg.patient{justify-self:end;background:${config.accent};color:#fff}.stormeai-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0;background:#fff}.stormeai-form input{flex:1;border:1px solid #cbd5e1;border-radius:999px;padding:12px 14px;font:14px system-ui}.stormeai-form button{border:0;border-radius:999px;background:${config.accent};color:#fff;padding:0 16px;font-weight:800;cursor:pointer}.stormeai-quick{display:flex;gap:8px;padding:0 12px 12px;background:#fff}.stormeai-quick button{border:1px solid #dbeafe;background:#eff6ff;color:${config.accent};border-radius:999px;padding:8px 10px;font:800 12px system-ui;cursor:pointer}`;
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.className = "stormeai-panel";
  panel.innerHTML = `<header class="stormeai-head"><div><strong>${escapeHtml(config.title)}</strong><span>StormeAI receptionist</span></div><button class="stormeai-close" type="button">×</button></header><div class="stormeai-messages"></div><div><div class="stormeai-quick"><button type="button">Clinic hours</button><button type="button">Book appointment</button><button type="button">Urgent help</button></div><form class="stormeai-form"><input placeholder="Ask a clinic question..." autocomplete="off" /><button type="submit">Send</button></form></div>`;
  const launcher = document.createElement("button");
  launcher.className = "stormeai-launcher";
  launcher.type = "button";
  launcher.textContent = "Chat with us";
  document.body.append(panel, launcher);

  const messagesEl = panel.querySelector(".stormeai-messages");
  const input = panel.querySelector("input");
  const form = panel.querySelector("form");
  let sessionId = localStorage.getItem(`stormeai:${config.clinicId}:session`) || undefined;
  addMessage("assistant", config.greeting);

  launcher.addEventListener("click", () => panel.classList.toggle("open"));
  panel.querySelector(".stormeai-close").addEventListener("click", () => panel.classList.remove("open"));
  panel.querySelectorAll(".stormeai-quick button").forEach((button) => button.addEventListener("click", () => send(button.textContent === "Book appointment" ? "I want to book an appointment" : button.textContent === "Urgent help" ? "I need urgent help" : "What are your clinic hours?")));
  form.addEventListener("submit", (event) => { event.preventDefault(); send(input.value); input.value = ""; });

  async function send(text) {
    const message = String(text || "").trim();
    if (!message) return;
    addMessage("patient", message);
    const thinking = addMessage("assistant", "Checking clinic information…");
    try {
      const response = await fetch(`${config.apiUrl}/functions/v1/public-chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clinicId: config.clinicId, receptionistId: config.receptionistId, sessionId, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat failed");
      sessionId = data.sessionId;
      localStorage.setItem(`stormeai:${config.clinicId}:session`, sessionId);
      thinking.textContent = data.reply;
    } catch (error) {
      thinking.textContent = error.message || "Sorry, chat is unavailable right now.";
    }
  }

  function addMessage(sender, body) {
    const node = document.createElement("div");
    node.className = `stormeai-msg ${sender}`;
    node.textContent = body;
    messagesEl.appendChild(node);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return node;
  }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
})();
