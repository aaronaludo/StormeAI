import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, CalendarCheck, Info, Send, ShieldAlert, UserRound } from "lucide-react";

type WidgetState = "preview" | "faq" | "booking" | "handoff" | "emergency" | "unknown";

type Message = {
  id: string;
  sender: "patient" | "assistant";
  body: string;
};

const starterMessages: Message[] = [
  {
    id: "1",
    sender: "assistant",
    body: "Hi! I’m Mia, the clinic chat receptionist preview. Try asking about clinic hours, booking an appointment, or requesting staff help.",
  },
];

const faqPatterns = ["hours", "open", "close", "price", "cost", "location", "address", "hmo", "insurance", "services"];
const bookingPatterns = ["appointment", "book", "schedule", "reschedule", "cancel", "available", "slot"];
const handoffPatterns = ["staff", "human", "receptionist", "call me", "contact me", "talk to someone"];
const emergencyPatterns = ["chest pain", "bleeding", "can't breathe", "cant breathe", "emergency", "urgent", "fainted", "severe pain"];

export function PatientChatWidget() {
  const [state, setState] = useState<WidgetState>("preview");
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [input, setInput] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(body: string) {
    const cleanBody = body.trim();
    if (!cleanBody) return;

    const patientMessage: Message = { id: crypto.randomUUID(), sender: "patient", body: cleanBody };
    const nextState = detectState(cleanBody);
    const assistantMessage: Message = { id: crypto.randomUUID(), sender: "assistant", body: responseForState(nextState, cleanBody) };
    setState(nextState);
    setMessages((current) => [...current, patientMessage, assistantMessage]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(input);
    setInput("");
  }

  return (
    <section id="patient-chat-widget" className="patient-widget-shell" aria-label="StormeAI patient chat widget">
      <header className="patient-widget-header">
        <div className="widget-avatar"><Bot size={18} /></div>
        <div><strong>Mia</strong><span>StormeAI receptionist · preview mode</span></div>
        <span className={`widget-state ${state}`}>{state}</span>
      </header>

      <div className="widget-demo-note">
        <Info size={14} />
        <span>This is a deterministic preview, not the live AI/RAG chat yet.</span>
      </div>

      <div className="patient-widget-messages" ref={messageListRef}>
        {messages.map((message) => (
          <div className={`widget-message ${message.sender}`} key={message.id}>
            {message.sender === "assistant" ? <Bot size={16} /> : <UserRound size={16} />}
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
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Try: Can I book tomorrow?" />
        <button type="submit" aria-label="Send message"><Send size={16} /></button>
      </form>
    </section>
  );
}

function detectState(text: string): WidgetState {
  const normalized = text.toLowerCase();
  if (emergencyPatterns.some((word) => normalized.includes(word))) return "emergency";
  if (bookingPatterns.some((word) => normalized.includes(word))) return "booking";
  if (handoffPatterns.some((word) => normalized.includes(word))) return "handoff";
  if (faqPatterns.some((word) => normalized.includes(word))) return "faq";
  return "unknown";
}

function responseForState(state: WidgetState, patientText: string) {
  if (state === "emergency") return "I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.";
  if (state === "booking") return "Sure — I can help request an appointment. What service do you need, and what date or time do you prefer?";
  if (state === "handoff") return "I can route this to clinic staff. What contact number or email should they use to follow up?";
  if (state === "faq") return "I can answer clinic admin questions from approved knowledge. For example: hours, location, services, pricing, or HMO/payment policies.";

  return `I’m in preview mode, so I don’t understand “${patientText}” yet. Try asking about clinic hours, booking an appointment, or requesting staff help.`;
}
