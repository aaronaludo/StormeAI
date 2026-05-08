import { FormEvent, useState } from "react";
import { Bot, CalendarCheck, Send, ShieldAlert, UserRound } from "lucide-react";

type WidgetState = "greeting" | "faq" | "booking" | "handoff" | "emergency";

type Message = {
  id: string;
  sender: "patient" | "assistant";
  body: string;
};

const starterMessages: Message[] = [
  { id: "1", sender: "assistant", body: "Hi! I’m Mia, the clinic chat receptionist. I can answer FAQs or help request an appointment." },
];

export function PatientChatWidget() {
  const [state, setState] = useState<WidgetState>("greeting");
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState("");

  function send(body: string) {
    const patientMessage: Message = { id: crypto.randomUUID(), sender: "patient", body };
    const nextState = detectState(body);
    const assistantMessage: Message = { id: crypto.randomUUID(), sender: "assistant", body: responseForState(nextState) };
    setState(nextState);
    setMessages((current) => [...current, patientMessage, assistantMessage]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    send(input.trim());
    setInput("");
  }

  return (
    <section className="patient-widget-shell" aria-label="StormeAI patient chat widget">
      <header className="patient-widget-header">
        <div className="widget-avatar"><Bot size={18} /></div>
        <div><strong>Mia</strong><span>StormeAI receptionist</span></div>
        <span className={`widget-state ${state}`}>{state}</span>
      </header>

      <div className="patient-widget-messages">
        {messages.map((message) => (
          <div className={`widget-message ${message.sender}`} key={message.id}>
            {message.sender === "assistant" ? <Bot size={14} /> : <UserRound size={14} />}
            <p>{message.body}</p>
          </div>
        ))}
      </div>

      <div className="widget-quick-actions">
        <button type="button" onClick={() => send("What are your clinic hours?")}>Clinic hours</button>
        <button type="button" onClick={() => send("I want to book an appointment") }><CalendarCheck size={14} /> Book</button>
        <button type="button" onClick={() => send("I have chest pain") }><ShieldAlert size={14} /> Urgent</button>
      </div>

      <form className="widget-input-row" onSubmit={submit}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your message..." />
        <button type="submit" aria-label="Send message"><Send size={16} /></button>
      </form>
    </section>
  );
}

function detectState(text: string): WidgetState {
  const normalized = text.toLowerCase();
  if (["chest pain", "bleeding", "can't breathe", "emergency", "urgent"].some((word) => normalized.includes(word))) return "emergency";
  if (["appointment", "book", "schedule", "reschedule"].some((word) => normalized.includes(word))) return "booking";
  if (["staff", "human", "receptionist"].some((word) => normalized.includes(word))) return "handoff";
  return "faq";
}

function responseForState(state: WidgetState) {
  if (state === "emergency") return "I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.";
  if (state === "booking") return "Sure — I can collect appointment details. What service would you like to book, and what date/time do you prefer?";
  if (state === "handoff") return "I can notify clinic staff and share this chat summary. What contact number or email should they use?";
  return "I’ll answer from the clinic’s approved information. If I can’t confirm something, I’ll offer to notify staff.";
}
