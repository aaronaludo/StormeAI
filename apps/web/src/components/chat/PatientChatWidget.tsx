import { FormEvent, useEffect, useRef, useState } from "react";
import { CalendarCheck, Info, Send, UserRound } from "lucide-react";
import { sendAgentChatTurn } from "../../lib/chat/agentChat";

type WidgetState = "live" | "thinking" | "ai" | "safe-fallback" | "rule" | "error";

type Message = {
  id: string;
  sender: "patient" | "assistant";
  body: string;
  bookingUrl?: string;
};

type PatientChatWidgetProps = {
  agentName?: string;
};

function starterMessagesFor(agentName: string): Message[] {
  return [
    {
      id: "1",
      sender: "assistant",
      body: `Hi! I’m ${agentName}, the organization chat agent. Ask me an organization question or request an appointment.`,
    },
  ];
}

export function PatientChatWidget({ agentName = "Meng" }: PatientChatWidgetProps) {
  const [state, setState] = useState<WidgetState>("live");
  const [messages, setMessages] = useState<Message[]>(() => starterMessagesFor(agentName));
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(starterMessagesFor(agentName));
    setSessionId(undefined);
    setState("live");
  }, [agentName]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(body: string) {
    const cleanBody = body.trim();
    if (!cleanBody || state === "thinking") return;

    const patientMessage: Message = { id: crypto.randomUUID(), sender: "patient", body: cleanBody };
    setMessages((current) => [...current, patientMessage]);
    setState("thinking");

    try {
      const result = await sendAgentChatTurn({ sessionId, patientMessage: cleanBody, agentName });
      setSessionId(result.sessionId);
      setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "assistant", body: result.reply, bookingUrl: result.bookingUrl }]);
      setState(result.mode);
    } catch (error) {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        sender: "assistant",
        body: error instanceof Error ? error.message : `Chat failed: ${JSON.stringify(error)}`,
      }]);
      setState("error");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(input);
    setInput("");
  }

  return (
    <section id="patient-chat-widget" className="patient-widget-shell" aria-label="StormeAI patient chat widget">
      <header className="patient-widget-header">
        <div className="widget-avatar"><span className="widget-robot-emoji" aria-hidden="true">🤖</span></div>
        <div><strong>{agentName}</strong><span>StormeAI agent · live test</span></div>
        <span className={`widget-state ${state}`}>{state === "safe-fallback" ? "fallback" : state}</span>
      </header>

      <div className="widget-demo-note live">
        <Info size={14} />
        <span>Connected to Supabase chat storage, organization knowledge lookup, and the AI provider router.</span>
      </div>

      <div className="patient-widget-messages" ref={messageListRef}>
        {messages.map((message) => (
          <div className={`widget-message ${message.sender}`} key={message.id}>
            {message.sender === "patient" && <UserRound size={16} />}
            <div className="widget-message-content">
              <p>{message.body}</p>
              {message.bookingUrl && (
                <a className="widget-redirect-button" href={message.bookingUrl} target="_blank" rel="noreferrer">Redirect</a>
              )}
            </div>
          </div>
        ))}
        {state === "thinking" && (
          <div className="widget-message assistant thinking">
            <p>{agentName} is checking organization knowledge…</p>
          </div>
        )}
      </div>

      <div className="widget-quick-actions">
        <button type="button" disabled={state === "thinking"} onClick={() => send("What are your organization hours?")}>Organization hours</button>
        <button type="button" disabled={state === "thinking"} onClick={() => send("I want to book an appointment") }><CalendarCheck size={14} /> Book</button>
      </div>

      <form className="widget-input-row" onSubmit={submit}>
        <input value={input} onChange={(event) => setInput(event.target.value)} disabled={state === "thinking"} placeholder="Ask an organization question..." />
        <button type="submit" aria-label="Send message" disabled={state === "thinking"}><Send size={16} /></button>
      </form>
    </section>
  );
}
