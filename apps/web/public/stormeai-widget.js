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

  const css = `
    .stormeai-launcher,
    .stormeai-panel,
    .stormeai-panel * {
      box-sizing: border-box !important;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      letter-spacing: normal !important;
      text-transform: none !important;
    }
    .stormeai-launcher {
      position: fixed !important;
      right: 18px !important;
      bottom: 18px !important;
      z-index: 2147483647 !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: ${config.accent} !important;
      color: #fff !important;
      min-width: 132px !important;
      height: 48px !important;
      padding: 0 18px !important;
      font-size: 14px !important;
      font-weight: 850 !important;
      line-height: 48px !important;
      box-shadow: 0 16px 34px rgba(15, 23, 42, .22) !important;
      cursor: pointer !important;
    }
    .stormeai-panel {
      position: fixed !important;
      right: 18px !important;
      bottom: 78px !important;
      z-index: 2147483647 !important;
      width: min(350px, calc(100vw - 24px)) !important;
      height: min(480px, calc(100vh - 104px)) !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 22px !important;
      background: #fff !important;
      box-shadow: 0 22px 58px rgba(15, 23, 42, .22) !important;
      overflow: hidden !important;
      display: none !important;
    }
    .stormeai-panel.open {
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr) auto !important;
    }
    .stormeai-head {
      min-height: 68px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
      padding: 14px 15px !important;
      background: linear-gradient(135deg, ${config.accent}, #14b8a6) !important;
      color: #fff !important;
    }
    .stormeai-head strong {
      display: block !important;
      margin: 0 !important;
      color: #fff !important;
      font-size: 16px !important;
      font-weight: 900 !important;
      line-height: 1.15 !important;
    }
    .stormeai-head span {
      display: block !important;
      margin-top: 3px !important;
      color: rgba(255,255,255,.9) !important;
      font-size: 12px !important;
      font-weight: 750 !important;
      line-height: 1.2 !important;
    }
    .stormeai-close {
      appearance: none !important;
      border: 0 !important;
      background: rgba(255, 255, 255, .18) !important;
      color: #fff !important;
      border-radius: 999px !important;
      width: 34px !important;
      height: 34px !important;
      min-width: 34px !important;
      padding: 0 !important;
      font-size: 20px !important;
      font-weight: 700 !important;
      line-height: 34px !important;
      text-align: center !important;
      cursor: pointer !important;
    }
    .stormeai-messages {
      padding: 14px !important;
      overflow: auto !important;
      background: #f8fafc !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
    }
    .stormeai-msg {
      width: fit-content !important;
      max-width: 86% !important;
      margin: 0 !important;
      padding: 10px 12px !important;
      border-radius: 16px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      line-height: 1.45 !important;
      white-space: pre-wrap !important;
    }
    .stormeai-msg.assistant {
      background: #fff !important;
      border: 1px solid #e2e8f0 !important;
      color: #0f172a !important;
    }
    .stormeai-msg.patient {
      align-self: flex-end !important;
      background: ${config.accent} !important;
      color: #fff !important;
    }
    .stormeai-footer {
      background: #fff !important;
      border-top: 1px solid #e2e8f0 !important;
    }
    .stormeai-quick {
      display: flex !important;
      gap: 7px !important;
      padding: 10px 10px 0 !important;
      overflow-x: auto !important;
      scrollbar-width: none !important;
    }
    .stormeai-quick::-webkit-scrollbar { display: none !important; }
    .stormeai-quick button {
      appearance: none !important;
      flex: 0 0 auto !important;
      border: 1px solid #bfdbfe !important;
      background: #eff6ff !important;
      color: ${config.accent} !important;
      border-radius: 999px !important;
      height: 34px !important;
      padding: 0 11px !important;
      font-size: 12px !important;
      font-weight: 850 !important;
      line-height: 32px !important;
      cursor: pointer !important;
    }
    .stormeai-form {
      display: flex !important;
      gap: 8px !important;
      padding: 10px !important;
      background: #fff !important;
    }
    .stormeai-form input {
      appearance: none !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      height: 42px !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 999px !important;
      background: #fff !important;
      color: #0f172a !important;
      padding: 0 13px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      line-height: 42px !important;
      outline: none !important;
    }
    .stormeai-form input::placeholder { color: #94a3b8 !important; opacity: 1 !important; }
    .stormeai-form button {
      appearance: none !important;
      flex: 0 0 auto !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: ${config.accent} !important;
      color: #fff !important;
      min-width: 68px !important;
      height: 42px !important;
      padding: 0 14px !important;
      font-size: 14px !important;
      font-weight: 850 !important;
      line-height: 42px !important;
      cursor: pointer !important;
    }
    @media (max-width: 480px) {
      .stormeai-launcher { right: 12px !important; bottom: 12px !important; height: 46px !important; line-height: 46px !important; }
      .stormeai-panel {
        right: 12px !important;
        bottom: 68px !important;
        width: calc(100vw - 24px) !important;
        height: min(440px, calc(100vh - 88px)) !important;
        border-radius: 20px !important;
      }
    }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.className = "stormeai-panel";
  panel.innerHTML = `<header class="stormeai-head"><div><strong>${escapeHtml(config.title)}</strong><span>StormeAI receptionist</span></div><button class="stormeai-close" type="button" aria-label="Close chat">×</button></header><div class="stormeai-messages"></div><div class="stormeai-footer"><div class="stormeai-quick"><button type="button">Clinic hours</button><button type="button">Book appointment</button><button type="button">Urgent help</button></div><form class="stormeai-form"><input placeholder="Ask a clinic question..." autocomplete="off" /><button type="submit">Send</button></form></div>`;
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
