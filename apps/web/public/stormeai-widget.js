(function () {
  const currentScript = document.currentScript;
  const config = {
    organizationId: currentScript?.dataset.organizationId || window.StormeAI?.organizationId,
    agentId: currentScript?.dataset.agentId || window.StormeAI?.agentId,
    apiUrl: (currentScript?.dataset.apiUrl || window.StormeAI?.apiUrl || "").replace(/\/$/, ""),
    chatMode: currentScript?.dataset.chatMode || window.StormeAI?.chatMode || "edge",
    localChatUrl: currentScript?.dataset.localChatUrl || window.StormeAI?.localChatUrl || (currentScript?.src ? new URL("/stormeai-local-chat", currentScript.src).toString() : "http://localhost:5173/stormeai-local-chat"),
    appUrl: (currentScript?.dataset.appUrl || window.StormeAI?.appUrl || (currentScript?.src ? new URL("/", currentScript.src).toString() : window.location.origin)).replace(/\/$/, ""),
    title: currentScript?.dataset.title || window.StormeAI?.title || "Organization chat",
    greeting: currentScript?.dataset.greeting || window.StormeAI?.greeting || "Hi! I’m the organization AI agent. How can I help?",
    accent: currentScript?.dataset.accent || window.StormeAI?.accent || "#2563eb",
  };

  if (!config.organizationId || (config.chatMode !== "local-ollama" && !config.apiUrl)) {
    console.warn("StormeAI widget needs data-organization-id and data-api-url, unless data-chat-mode is local-ollama.");
    return;
  }



  const pageDemoOrganizations = [
    {
      match: ["evergreen-family-organization", "Evergreen Family Organization"],
      agent: "Mia",
      name: "Evergreen Family Organization",
      hours: "Evergreen Family Organization is open Monday–Thursday from 8:00 AM to 6:00 PM, Friday from 8:00 AM to 4:00 PM, and Saturday from 9:00 AM to 1:00 PM. It is closed on Sundays.",
      booking: "I can help request an appointment at Evergreen Family Organization. Please share the patient name, preferred service, preferred date/time, and best contact number or email. Demo phone: (555) 010-1234.",
      urgent: "If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room. For non-urgent family medicine concerns, Evergreen can collect your details for staff follow-up.",
      services: "Evergreen offers annual wellness exams, pediatric sick visits, chronic care support, vaccinations, minor procedures, and telehealth triage.",
      address: "Evergreen Family Organization is at 1200 Willow Park Ave, Suite 210. Free garage parking is available on level B.",
      insurance: "Dummy accepted plans include Blue Oak PPO, Northstar HMO, CityCare Select, Medicare demo plans, and self-pay. Demo self-pay wellness visit: $140; telehealth follow-up: $75.",
      prep: "For a first visit, arrive 15 minutes early and bring ID, insurance card, medication list, and prior records."
    },
    {
      match: ["luna-dental-studio", "Luna Dental Studio"],
      agent: "Nova",
      name: "Luna Dental Studio",
      hours: "Luna Dental Studio is open Monday–Wednesday from 9:00 AM to 7:00 PM, Thursday from 10:00 AM to 6:00 PM, Friday from 8:00 AM to 3:00 PM, and weekends by appointment.",
      booking: "I can help request a dental visit at Luna Dental Studio. Please share your name, dental concern, preferred date/time, and best contact. Demo phone: (555) 010-4567.",
      urgent: "For severe swelling, dental trauma, uncontrolled bleeding, or trouble breathing, seek urgent medical care. For tooth pain or chipped teeth, Luna can collect details for a priority dental visit request.",
      services: "Luna offers cleanings and exams, fillings and crowns, whitening consults, urgent tooth visits, kids dentistry, and clear aligner screening.",
      address: "Luna Dental Studio is at 44 Moonrise Blvd, Floor 3, two blocks from Central Station.",
      insurance: "Dummy accepted plans include SmileBridge, Delta Demo PPO, BrightCare Dental, FamilyPlus Dental, and self-pay. Demo fees: new patient exam $95, cleaning package $120, whitening consult complimentary.",
      prep: "For dental visits, bring dental insurance, photo ID, medication list, and previous x-rays if available. Noise-canceling headphones are available."
    },
    {
      match: ["harbor-wellness-dermatology", "Harbor Wellness Dermatology"],
      agent: "Cove",
      name: "Harbor Wellness Dermatology",
      hours: "Harbor Wellness Dermatology is open Monday from 10:00 AM to 6:00 PM, Tuesday–Thursday from 8:30 AM to 5:30 PM, and Friday from 8:30 AM to 2:00 PM. It is closed on weekends.",
      booking: "I can help request a skin visit at Harbor Wellness Dermatology. Please share your name, concern, preferred visit type, preferred date/time, and best contact. Demo phone: (555) 010-7890.",
      urgent: "Urgent skin changes, infection signs, severe allergic reactions, or rapidly worsening symptoms may require immediate care. If symptoms feel serious, call emergency services or go to urgent care/ER.",
      services: "Harbor offers full-body skin exams, acne and rosacea plans, eczema and rash visits, spot checks, minor procedure consults, and cosmetic skincare consults.",
      address: "Harbor Wellness Dermatology is at 700 Harbor Point Road, Suite 5A. The organization has elevator access and is wheelchair friendly.",
      insurance: "Dummy accepted plans include HarborHealth PPO, ClearSkin Select, MetroCare, Medicare demo plans, and self-pay. Demo self-pay: medical skin exam $165; cosmetic consult $85.",
      prep: "Bring ID, insurance card, medication list, skincare product list, and photos of flare-ups if helpful. Avoid heavy makeup for facial skin checks."
    }
  ];

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
    .stormeai-book-link {
      display: inline-block !important;
      margin-top: 8px !important;
      padding: 9px 11px !important;
      border-radius: 999px !important;
      background: ${config.accent} !important;
      color: #fff !important;
      text-decoration: none !important;
      font-size: 12px !important;
      font-weight: 900 !important;
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
  panel.innerHTML = `<header class="stormeai-head"><div><strong>${escapeHtml(config.title)}</strong><span>StormeAI agent</span></div><button class="stormeai-close" type="button" aria-label="Close chat">×</button></header><div class="stormeai-messages"></div><div class="stormeai-footer"><div class="stormeai-quick"><button type="button">Organization hours</button><button type="button">Book appointment</button><button type="button">Urgent help</button></div><form class="stormeai-form"><input placeholder="Ask an organization question..." autocomplete="off" /><button type="submit">Send</button></form></div>`;
  const launcher = document.createElement("button");
  launcher.className = "stormeai-launcher";
  launcher.type = "button";
  launcher.textContent = "Chat with us";
  document.body.append(panel, launcher);

  const messagesEl = panel.querySelector(".stormeai-messages");
  const input = panel.querySelector("input");
  const form = panel.querySelector("form");
  let sessionId = localStorage.getItem(`stormeai:${config.organizationId}:session`) || undefined;
  addMessage("assistant", config.greeting);

  launcher.addEventListener("click", () => panel.classList.toggle("open"));
  panel.querySelector(".stormeai-close").addEventListener("click", () => panel.classList.remove("open"));
  panel.querySelectorAll(".stormeai-quick button").forEach((button) => button.addEventListener("click", () => send(button.textContent === "Book appointment" ? "I want to book an appointment" : button.textContent === "Urgent help" ? "I need urgent help" : "What are your organization hours?")));
  form.addEventListener("submit", (event) => { event.preventDefault(); send(input.value); input.value = ""; });

  async function send(text) {
    const message = String(text || "").trim();
    if (!message) return;
    addMessage("patient", message);
    const thinking = addMessage("assistant", "Checking organization information…");
    try {
      const endpoint = config.chatMode === "local-ollama" ? config.localChatUrl : `${config.apiUrl}/functions/v1/public-chat`;
      const payload = JSON.stringify({ organizationId: config.organizationId, agentId: config.agentId, sessionId, message, appUrl: config.appUrl });
      const response = await fetch(endpoint, config.chatMode === "local-ollama"
        ? { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: payload }
        : { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat failed");
      sessionId = data.sessionId;
      localStorage.setItem(`stormeai:${config.organizationId}:session`, sessionId);
      const pageFallback = getPageDemoFallback(message, data.reply);
      thinking.textContent = pageFallback || data.reply;
      if (data.bookingUrl) {
        const link = document.createElement("a");
        link.className = "stormeai-book-link";
        link.href = new URL(data.bookingUrl, `${config.appUrl}/`).toString();
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Redirect";
        thinking.appendChild(link);
      }
    } catch (error) {
      thinking.textContent = error.message || "Sorry, chat is unavailable right now.";
    }
  }


  function getPageDemoFallback(message, backendReply) {
    const pageText = `${location.href} ${document.title} ${document.body?.innerText || ""}`;
    const organization = pageDemoOrganizations.find((item) => item.match.some((term) => pageText.includes(term)));
    if (!organization) return null;

    const backendLooksUnhelpful = !backendReply || /don.t have confirmed|can.t confirm|approved organization knowledge|route it to organization staff|saved yet/i.test(String(backendReply));
    if (!backendLooksUnhelpful) return null;

    const lower = String(message || "").toLowerCase();
    if (/hour|open|close|schedule|time/.test(lower)) return organization.hours;
    if (/book|appointment|schedule|visit|available|availability/.test(lower)) return organization.booking;
    if (/urgent|emergency|pain|bleed|bleeding|swelling|trauma|severe|infection|allergic/.test(lower)) return organization.urgent;
    if (/service|treat|offer|cleaning|exam|vaccine|acne|rash|mole|crown|filling|telehealth|procedure/.test(lower)) return organization.services;
    if (/address|where|location|parking|transit|find/.test(lower)) return organization.address;
    if (/insurance|payment|pay|fee|cost|price|self-pay|plan/.test(lower)) return organization.insurance;
    if (/prepare|bring|first visit|before|forms|x-ray|records/.test(lower)) return organization.prep;
    return `Hi! I’m ${organization.agent}, the demo AI agent for ${organization.name}. I can answer this dummy page’s details about hours, services, location, insurance, visit prep, urgent guidance, or appointment requests.`;
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
