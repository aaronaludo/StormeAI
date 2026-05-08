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
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { PatientChatWidget } from "./components/chat/PatientChatWidget";
import { AuthPage } from "./pages/AuthPage";
import { ClinicOnboardingPage } from "./pages/ClinicOnboardingPage";

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number }>;
};

type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: "blue" | "teal" | "green" | "amber" | "red";
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Sign In", path: "/auth", icon: Users },
  { label: "Onboarding", path: "/onboarding", icon: ClipboardList },
  { label: "AI Receptionist", path: "/ai-receptionist", icon: Bot },
  { label: "Knowledge Base", path: "/knowledge-base", icon: DatabaseZap },
  { label: "Appointments", path: "/appointments", icon: CalendarCheck },
  { label: "Workflows", path: "/workflows", icon: Workflow },
  { label: "Billing", path: "/billing", icon: WalletCards },
  { label: "Safety", path: "/safety", icon: ShieldCheck },
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
  { title: "Doctor profiles", meta: "4 providers", status: "Indexed" },
  { title: "Cancellation policy", meta: "Clinic rule", status: "Indexed" },
];

const appointmentRows = [
  { patient: "Maria Santos", service: "Dental Cleaning", time: "Tomorrow · 10:00 AM", status: "Requested" },
  { patient: "John Cruz", service: "Derma Consultation", time: "Friday · 2:00 PM", status: "Confirmed" },
  { patient: "Ana Reyes", service: "Lab Test", time: "Monday · 8:00 AM", status: "Prep sent" },
  { patient: "Carlo Dela Cruz", service: "Dental Consultation", time: "Reschedule requested", status: "Review" },
];

const providerCards = [
  { name: "Ollama", model: "qwen2.5:7b", tag: "Default local", active: true },
  { name: "OpenAI", model: "Optional cloud fallback", tag: "Disabled", active: false },
  { name: "Claude", model: "Premium reasoning fallback", tag: "Disabled", active: false },
];

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-panel">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<ClinicOnboardingPage />} />
            <Route path="/ai-receptionist" element={<ReceptionistPage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function Sidebar() {
  return (
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
          <NavLink className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} to={item.path} key={item.label}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
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
  );
}

function PageHeader({ eyebrow, title, action = "Configure" }: { eyebrow: string; title: string; action?: string }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <button className="ghost-button"><Settings2 size={17} />{action}</button>
        <button className="primary-button"><MessageSquareText size={17} />Test chat</button>
      </div>
    </header>
  );
}

function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Storme Dental Clinic" title="AI receptionist command center" />
      <section className="hero-grid">
        <div className="hero-card">
          <div className="hero-content">
            <span className="badge teal">Chat-only AI front desk</span>
            <h2>Answer patient questions and book appointments 24/7.</h2>
            <p>StormeAI gives clinics a safe, configurable AI receptionist that answers from approved knowledge, collects booking details, and escalates sensitive cases to staff.</p>
            <div className="hero-actions">
              <button className="primary-button">Review setup <ArrowRight size={17} /></button>
              <button className="ghost-button">View patient widget</button>
            </div>
          </div>
          <PatientChatWidget />
        </div>
        <HealthCard />
      </section>

      <section className="metrics-grid">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="content-grid two-one">
        <Panel title="Conversation inbox" subtitle="Prioritized patient chats and handoffs" icon={MessageSquareText}>
          <ConversationList />
        </Panel>
        <Panel title="AI route" subtitle="Provider and safety mode" icon={BrainCircuit}>
          <ProviderStack />
        </Panel>
      </section>
    </>
  );
}

function ReceptionistPage() {
  return (
    <>
      <PageHeader eyebrow="AI Receptionist" title="Personality, prompt, providers, and behavior" />
      <section className="content-grid two-col">
        <Panel title="Receptionist personality" subtitle="Tone, language, and chat behavior" icon={Bot}>
          <ConfigList items={[["Name", "Mia"], ["Tone", "Warm, professional, concise"], ["Language", "English + Taglish"], ["Behavior", "Appointment-first"], ["Fallback", "Human handoff when uncertain"]]} />
        </Panel>
        <Panel title="System prompt preview" subtitle="Clinic-safe operating rules" icon={ClipboardLike}>
          <div className="prompt-box">
            You are Mia, StormeAI chat-only receptionist for this clinic. Answer from approved clinic knowledge, collect appointment details, never diagnose, and escalate emergency or sensitive messages.
          </div>
        </Panel>
      </section>
      <section className="content-grid two-col">
        <Panel title="AI providers" subtitle="Ollama default, cloud optional" icon={BrainCircuit}><ProviderStack /></Panel>
        <Panel title="Patient chat preview" subtitle="What patients experience" icon={MessageSquareText}><ChatPreview /></Panel>
      </section>
    </>
  );
}

function KnowledgeBasePage() {
  return (
    <>
      <PageHeader eyebrow="Knowledge Base" title="Clinic-approved RAG sources" action="Add source" />
      <section className="content-grid two-one">
        <Panel title="Indexed sources" subtitle="FAQs, documents, services, and policies" icon={DatabaseZap}>
          <div className="source-list">
            {knowledgeSources.map((source) => <SourceRow key={source.title} {...source} />)}
          </div>
        </Panel>
        <Panel title="RAG configuration" subtitle="Control how answers are generated" icon={FileText}>
          <ConfigList items={[["Answer mode", "Approved sources only"], ["Chunk strategy", "Service + FAQ optimized"], ["Similarity threshold", "0.78"], ["Knowledge gaps", "Auto-detect enabled"]]} />
        </Panel>
      </section>
    </>
  );
}

function AppointmentsPage() {
  return (
    <>
      <PageHeader eyebrow="Appointments" title="Booking requests and schedule control" action="New slot" />
      <section className="content-grid two-one">
        <Panel title="Appointment inbox" subtitle="Requests, confirmations, and reschedules" icon={CalendarCheck}>
          <AppointmentTable />
        </Panel>
        <Panel title="Scheduling rules" subtitle="How the AI collects bookings" icon={ClipboardList}>
          <ConfigList items={[["Default status", "Requested"], ["Staff approval", "Required"], ["Required fields", "Name, contact, service, time"], ["Confirmation", "Resend email + n8n event"]]} />
        </Panel>
      </section>
    </>
  );
}

function WorkflowsPage() {
  return (
    <>
      <PageHeader eyebrow="Workflows" title="React Flow control, n8n execution" action="Create flow" />
      <section className="content-grid two-col">
        <Panel title="Workflow canvas" subtitle="Patient chat automation map" icon={GitBranch}><WorkflowPreview /></Panel>
        <Panel title="n8n webhooks" subtitle="Connected automation events" icon={Zap}>
          <ConfigList items={[["appointment.created", "Enabled"], ["appointment.rescheduled", "Enabled"], ["chat.handoff_requested", "Enabled"], ["knowledge.gap_detected", "Enabled"]]} />
        </Panel>
      </section>
    </>
  );
}

function BillingPage() {
  return (
    <>
      <PageHeader eyebrow="Billing" title="Manual billing first, Paddle later" action="Record payment" />
      <section className="content-grid two-col">
        <Panel title="Current plan" subtitle="Bank transfer/manual activation" icon={WalletCards}>
          <div className="billing-card"><div><span className="badge green">Active</span><h3>Pro — manual bank transfer</h3><p>2,000 chats/month · 50 knowledge docs · n8n workflows enabled</p></div><button className="ghost-button">Record payment</button></div>
        </Panel>
        <Panel title="Plan limits" subtitle="Feature access controlled by subscription status" icon={Activity}>
          <ConfigList items={[["Chats/month", "2,000"], ["Knowledge docs", "50"], ["Staff users", "5"], ["Paddle", "Deferred"]]} />
        </Panel>
      </section>
    </>
  );
}

function SafetyPage() {
  return (
    <>
      <PageHeader eyebrow="Safety" title="Escalation and human handoff controls" />
      <section className="content-grid two-col">
        <Panel title="Safety rules" subtitle="Healthcare-aware boundaries" icon={ShieldCheck}>
          <SafetyStack />
        </Panel>
        <Panel title="Emergency response preview" subtitle="Shown when urgent symptoms are detected" icon={AlertTriangle}>
          <div className="emergency-box">I can’t provide emergency medical help. If this is urgent or life-threatening, please call emergency services or go to the nearest emergency room immediately.</div>
        </Panel>
      </section>
    </>
  );
}

function ClipboardLike({ size = 18 }: { size?: number }) {
  return <FileText size={size} />;
}

function HealthCard() {
  return (
    <div className="health-card">
      <div className="section-heading compact"><p>Receptionist health</p><h3>Ready for clinic traffic</h3></div>
      <div className="health-list">
        {setupItems.map((item, index) => (
          <div className="health-item" key={item}>
            <span className={index < 4 ? "check-icon" : "warn-icon"}>{index < 4 ? <Check size={15} /> : <AlertTriangle size={15} />}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, delta, tone }: Metric) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><HeartPulse size={18} /></div><strong>{value}</strong><span>{label}</span><p>{delta}</p></article>;
}

function Panel({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <section className="panel-card">
      <div className="panel-heading"><div className="panel-title-row"><span className="panel-icon"><Icon size={18} /></span><div><h3>{title}</h3><p>{subtitle}</p></div></div><ChevronRight size={18} /></div>
      {children}
    </section>
  );
}

function ChatPreview() {
  return (
    <div className="chat-preview">
      <div className="chat-header"><div className="avatar"><Stethoscope size={18} /></div><div><strong>Mia</strong><span>StormeAI receptionist</span></div></div>
      <div className="bubble patient">Do you offer dental cleaning tomorrow?</div>
      <div className="bubble ai">Yes. Dental cleaning is available. Would you like me to collect your preferred time?</div>
      <div className="quick-replies"><span>Morning</span><span>Afternoon</span><span>Ask staff</span></div>
    </div>
  );
}

function ConversationList() {
  return <div className="conversation-list">{conversations.map((item) => <div className="conversation-row" key={item.title}><div><strong>{item.title}</strong><span>{item.detail}</span></div><span className={`badge ${item.tone}`}>{item.status}</span></div>)}</div>;
}

function ProviderStack() {
  return <div className="provider-stack">{providerCards.map((provider) => <div className={`provider-card ${provider.active ? "active" : ""}`} key={provider.name}><div><strong>{provider.name}</strong><span>{provider.model}</span></div><span className={`mini-toggle ${provider.active ? "on" : ""}`} /></div>)}</div>;
}

function ConfigList({ items }: { items: [string, string][] }) {
  return <div className="config-list">{items.map(([label, value]) => <div className="config-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function SourceRow(source: { title: string; meta: string; status: string }) {
  return <div className="source-row"><div><strong>{source.title}</strong><span>{source.meta}</span></div><span className={`badge ${source.status === "Review" ? "amber" : "green"}`}>{source.status}</span></div>;
}

function AppointmentTable() {
  return <div className="appointment-table">{appointmentRows.map((row) => <div className="appointment-row" key={row.patient}><div><strong>{row.patient}</strong><span>{row.service}</span></div><span>{row.time}</span><span className={`badge ${row.status === "Confirmed" ? "green" : row.status === "Requested" || row.status === "Review" ? "amber" : "blue"}`}>{row.status}</span></div>)}</div>;
}

function SafetyStack() {
  return <div className="safety-stack">{["No diagnosis", "No prescriptions", "Emergency guidance", "Human handoff", "Audit sensitive cases"].map((rule) => <div className="safety-rule" key={rule}><Check size={15} /><span>{rule}</span></div>)}</div>;
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
  return <div className="workflow-canvas">{nodes.map((node, index) => <div className="workflow-node" key={node.label}><node.icon size={16} /><span>{node.label}</span>{index < nodes.length - 1 && <ArrowRight className="node-arrow" size={15} />}</div>)}</div>;
}

function Bar({ label, value, width }: { label: string; value: string; width: string }) {
  return <div className="bar-row"><div className="bar-label"><span>{label}</span><strong>{value}</strong></div><div className="bar-track"><div style={{ width: `${width}%` }} /></div></div>;
}

export default App;
