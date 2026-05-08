import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardList,
  DatabaseZap,
  FileText,
  GitBranch,
  HeartPulse,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  WalletCards,
  Workflow,
  Zap,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active?: boolean;
};

type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: "blue" | "teal" | "green" | "amber" | "red";
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "AI Receptionist", icon: Bot },
  { label: "Knowledge Base", icon: DatabaseZap },
  { label: "Appointments", icon: CalendarCheck },
  { label: "Workflows", icon: Workflow },
  { label: "Billing", icon: WalletCards },
  { label: "Safety", icon: ShieldCheck },
];

const metrics: Metric[] = [
  { label: "Chats today", value: "48", delta: "+18% vs yesterday", tone: "blue" },
  { label: "Booking requests", value: "12", delta: "7 need review", tone: "teal" },
  { label: "Human handoffs", value: "4", delta: "2 urgent", tone: "amber" },
  { label: "Knowledge gaps", value: "7", delta: "3 new FAQs", tone: "red" },
];

const conversations = [
  { title: "Dental cleaning inquiry", detail: "Patient asked about price and tomorrow slots", status: "Booking intent", tone: "green" },
  { title: "Derma consultation", detail: "Asked about acne scar consultation", status: "Needs staff", tone: "amber" },
  { title: "Clinic hours question", detail: "Answered from clinic profile", status: "Resolved", tone: "blue" },
  { title: "Emergency keyword detected", detail: "Chest pain message routed to safety flow", status: "Escalated", tone: "red" },
];

const setupItems = [
  "Receptionist personality configured",
  "No-diagnosis safety rules enabled",
  "Ollama qwen2.5:7b default route active",
  "n8n appointment workflow connected",
  "Knowledge base needs 3 more FAQs",
];

const knowledgeSources = [
  { title: "Clinic services and prices", meta: "18 chunks indexed", status: "Indexed" },
  { title: "Pre-visit preparation guide", meta: "PDF source", status: "Indexed" },
  { title: "HMO and payment policy", meta: "Patient questions detected", status: "Review" },
];

const appointmentRows = [
  { patient: "Maria Santos", service: "Dental Cleaning", time: "Tomorrow · 10:00 AM", status: "Requested" },
  { patient: "John Cruz", service: "Derma Consultation", time: "Friday · 2:00 PM", status: "Confirmed" },
  { patient: "Ana Reyes", service: "Lab Test", time: "Monday · 8:00 AM", status: "Prep sent" },
];

const providerCards = [
  { name: "Ollama", model: "qwen2.5:7b", tag: "Default local", active: true },
  { name: "OpenAI", model: "Optional cloud fallback", tag: "Disabled", active: false },
  { name: "Claude", model: "Premium reasoning fallback", tag: "Disabled", active: false },
];

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={22} /></div>
          <div>
            <p className="brand-name">StormeAI</p>
            <p className="brand-subtitle">Clinic receptionist</p>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <a className={`nav-item ${item.active ? "active" : ""}`} href={`#${item.label.toLowerCase().replaceAll(" ", "-")}`} key={item.label}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-card">
          <div className="status-dot" />
          <div>
            <strong>Receptionist online</strong>
            <span>2.1s avg response</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar" id="dashboard">
          <div>
            <p className="eyebrow">Storme Dental Clinic</p>
            <h1>AI receptionist command center</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button"><Settings2 size={17} />Configure</button>
            <button className="primary-button"><MessageSquareText size={17} />Test chat</button>
          </div>
        </header>

        <section className="hero-grid" id="ai-receptionist">
          <div className="hero-card">
            <div className="hero-content">
              <span className="badge teal">Chat-only AI front desk</span>
              <h2>Answer patient questions and book appointments 24/7.</h2>
              <p>
                StormeAI gives clinics a safe, configurable AI receptionist that answers from approved knowledge, collects booking details, and escalates sensitive cases to staff.
              </p>
              <div className="hero-actions">
                <button className="primary-button">Review setup <ArrowRight size={17} /></button>
                <button className="ghost-button">View patient widget</button>
              </div>
            </div>
            <ChatPreview />
          </div>
          <div className="health-card">
            <div className="section-heading compact">
              <p>Receptionist health</p>
              <h3>Ready for clinic traffic</h3>
            </div>
            <div className="health-list">
              {setupItems.map((item, index) => (
                <div className="health-item" key={item}>
                  <span className={index < 4 ? "check-icon" : "warn-icon"}>{index < 4 ? <Check size={15} /> : <AlertTriangle size={15} />}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="content-grid two-one">
          <Panel title="Conversation inbox" subtitle="Prioritized patient chats and handoffs" icon={MessageSquareText}>
            <div className="conversation-list">
              {conversations.map((item) => (
                <div className="conversation-row" key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <span className={`badge ${item.tone}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel id="ai-providers" title="AI route" subtitle="Provider and safety mode" icon={BrainCircuit}>
            <div className="provider-stack">
              {providerCards.map((provider) => (
                <div className={`provider-card ${provider.active ? "active" : ""}`} key={provider.name}>
                  <div>
                    <strong>{provider.name}</strong>
                    <span>{provider.model}</span>
                  </div>
                  <span className={`mini-toggle ${provider.active ? "on" : ""}`} />
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="content-grid three-col">
          <Panel title="Receptionist personality" subtitle="Tone, language, and prompt" icon={Bot}>
            <ConfigList
              items={[
                ["Name", "Mia"],
                ["Tone", "Warm, professional, concise"],
                ["Language", "English + Taglish"],
                ["Behavior", "Appointment-first"],
              ]}
            />
          </Panel>

          <Panel id="knowledge-base" title="Knowledge base" subtitle="Clinic-approved RAG sources" icon={FileText}>
            <div className="source-list">
              {knowledgeSources.map((source) => (
                <div className="source-row" key={source.title}>
                  <div>
                    <strong>{source.title}</strong>
                    <span>{source.meta}</span>
                  </div>
                  <span className={`badge ${source.status === "Review" ? "amber" : "green"}`}>{source.status}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel id="safety" title="Safety rules" subtitle="Healthcare-aware boundaries" icon={ShieldCheck}>
            <div className="safety-stack">
              {[
                "No diagnosis",
                "No prescriptions",
                "Emergency guidance",
                "Human handoff",
              ].map((rule) => (
                <div className="safety-rule" key={rule}>
                  <Check size={15} />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="content-grid two-col">
          <Panel id="appointments" title="Appointment inbox" subtitle="Requests, confirmations, and reschedules" icon={CalendarCheck}>
            <div className="appointment-table">
              {appointmentRows.map((row) => (
                <div className="appointment-row" key={row.patient}>
                  <div>
                    <strong>{row.patient}</strong>
                    <span>{row.service}</span>
                  </div>
                  <span>{row.time}</span>
                  <span className={`badge ${row.status === "Confirmed" ? "green" : row.status === "Requested" ? "amber" : "blue"}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel id="workflows" title="Workflow automation" subtitle="React Flow control, n8n execution" icon={GitBranch}>
            <WorkflowPreview />
          </Panel>
        </section>

        <section className="content-grid two-col bottom-row">
          <Panel id="billing" title="Manual billing first" subtitle="Paddle can be enabled later" icon={WalletCards}>
            <div className="billing-card">
              <div>
                <span className="badge green">Active</span>
                <h3>Pro — manual bank transfer</h3>
                <p>2,000 chats/month · 50 knowledge docs · n8n workflows enabled</p>
              </div>
              <button className="ghost-button">Record payment</button>
            </div>
          </Panel>

          <Panel title="Analytics insight" subtitle="What patients ask most" icon={Activity}>
            <div className="bar-list">
              <Bar label="Book appointment" value="82%" width="82" />
              <Bar label="Ask price" value="64%" width="64" />
              <Bar label="Clinic hours" value="48%" width="48" />
              <Bar label="Human handoff" value="19%" width="19" />
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, delta, tone }: Metric) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><HeartPulse size={18} /></div>
      <strong>{value}</strong>
      <span>{label}</span>
      <p>{delta}</p>
    </article>
  );
}

function Panel({ id, title, subtitle, icon: Icon, children }: { id?: string; title: string; subtitle: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <section className="panel-card" id={id}>
      <div className="panel-heading">
        <div className="panel-title-row">
          <span className="panel-icon"><Icon size={18} /></span>
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
        </div>
        <ChevronRight size={18} />
      </div>
      {children}
    </section>
  );
}

function ChatPreview() {
  return (
    <div className="chat-preview">
      <div className="chat-header">
        <div className="avatar"><Stethoscope size={18} /></div>
        <div>
          <strong>Mia</strong>
          <span>StormeAI receptionist</span>
        </div>
      </div>
      <div className="bubble patient">Do you offer dental cleaning tomorrow?</div>
      <div className="bubble ai">Yes. Dental cleaning is available. Would you like me to collect your preferred time?</div>
      <div className="quick-replies">
        <span>Morning</span>
        <span>Afternoon</span>
        <span>Ask staff</span>
      </div>
    </div>
  );
}

function ConfigList({ items }: { items: [string, string][] }) {
  return (
    <div className="config-list">
      {items.map(([label, value]) => (
        <div className="config-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function WorkflowPreview() {
  const nodes = [
    { label: "Greeting", icon: MessageSquareText },
    { label: "Intent", icon: BrainCircuit },
    { label: "Book", icon: CalendarCheck },
    { label: "Email", icon: Mail },
    { label: "n8n", icon: Zap },
    { label: "Handoff", icon: Users },
  ];
  return (
    <div className="workflow-canvas">
      {nodes.map((node, index) => (
        <div className="workflow-node" key={node.label}>
          <node.icon size={16} />
          <span>{node.label}</span>
          {index < nodes.length - 1 && <ArrowRight className="node-arrow" size={15} />}
        </div>
      ))}
    </div>
  );
}

function Bar({ label, value, width }: { label: string; value: string; width: string }) {
  return (
    <div className="bar-row">
      <div className="bar-label"><span>{label}</span><strong>{value}</strong></div>
      <div className="bar-track"><div style={{ width: `${width}%` }} /></div>
    </div>
  );
}

export default App;
