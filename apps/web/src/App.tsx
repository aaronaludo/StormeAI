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
  LogOut,
  Sparkles,
  Stethoscope,
  Users,
  WalletCards,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { PatientChatWidget } from "./components/chat/PatientChatWidget";
import { ReceptionistSettingsForm } from "./components/settings/ReceptionistSettingsForm";
import { AuthPage } from "./pages/AuthPage";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { ClinicOnboardingPage } from "./pages/ClinicOnboardingPage";
import { supabase } from "./lib/supabase";
import { buildSettingsPromptPreview, createReceptionist, defaultReceptionistSettings, listReceptionists, loadReceptionistSettings, saveReceptionistSettings, type ReceptionistOption, type ReceptionistSettingsRecord } from "./lib/ai/receptionistSettings";
import { listClinicWorkspaces, type ClinicWorkspaceOption } from "./lib/clinicWorkspaces";
import { getWorkspaceSelection, setSelectedClinic, setSelectedReceptionist, subscribeWorkspaceSelection } from "./lib/workspaceSelection";

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
  { label: "Onboarding", path: "/onboarding", icon: ClipboardList },
  { label: "AI Receptionist", path: "/ai-receptionist", icon: Bot },
  { label: "Knowledge Base", path: "/knowledge-base", icon: DatabaseZap },
  { label: "Appointments", path: "/appointments", icon: CalendarCheck },
  { label: "Workflows", path: "/workflows", icon: Workflow },
  { label: "Billing", path: "/billing", icon: WalletCards },
  { label: "Safety", path: "/safety", icon: ShieldCheck },
  { label: "Account Settings", path: "/account", icon: Settings2 },
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
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/auth" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/auth/sign-in" element={<AuthPage mode="sign-in" />} />
          <Route path="/auth/sign-up" element={<AuthPage mode="sign-up" />} />
          <Route path="/auth/forgot-password" element={<AuthPage mode="forgot-password" />} />
          <Route path="/auth/update-password" element={<AuthPage mode="update-password" />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/onboarding" element={<ClinicOnboardingPage />} />
            <Route path="/ai-receptionist" element={<ReceptionistPage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/account" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}

type AuthState = { loading: boolean; session: Session | null };

function useAuthState(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({ loading: true, session: null });

  useEffect(() => {
    if (!supabase) {
      setAuthState({ loading: false, session: null });
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setAuthState({ loading: false, session: data.session });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({ loading: false, session });
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return authState;
}

function ProtectedRoute() {
  const location = useLocation();
  const { loading, session } = useAuthState();

  if (loading) return <RouteLoading label="Checking your clinic session…" />;
  if (!session) return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}

function PublicRoute() {
  const location = useLocation();
  const { loading, session } = useAuthState();

  if (loading) return <RouteLoading label="Loading secure auth…" />;
  if (session && location.pathname !== "/auth/update-password") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

function RouteLoading({ label }: { label: string }) {
  return (
    <div className="route-loading">
      <div className="brand-mark"><Sparkles size={22} /></div>
      <p>{label}</p>
    </div>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const { session } = useAuthState();

  async function logout() {
    await supabase?.auth.signOut();
    navigate("/auth/sign-in", { replace: true });
  }

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

      <ClinicSwitcher />

      <div className="sidebar-card account-card">
        <div className="status-dot" />
        <div>
          <strong>{session?.user.email || "Signed in"}</strong>
          <span>Receptionist online · 2.1s avg response</span>
        </div>
      </div>

      <button className="sidebar-logout" type="button" onClick={logout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

function ClinicSwitcher() {
  const [clinics, setClinics] = useState<ClinicWorkspaceOption[]>([]);
  const [selected, setSelected] = useState(getWorkspaceSelection().clinicId || "");
  const [status, setStatus] = useState("Loading clinics…");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const items = await listClinicWorkspaces();
        if (!mounted) return;
        setClinics(items);
        const current = getWorkspaceSelection().clinicId || items[0]?.clinicId || "";
        if (current && !getWorkspaceSelection().clinicId) setSelectedClinic(current);
        setSelected(current);
        setStatus(items.length ? "Active clinic" : "No clinic yet");
      } catch (error) {
        if (mounted) setStatus(error instanceof Error ? error.message : "Failed to load clinics");
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  function switchClinic(clinicId: string) {
    setSelected(clinicId);
    setSelectedClinic(clinicId);
    window.location.reload();
  }

  return (
    <div className="clinic-switcher">
      <label>{status}</label>
      <select value={selected} onChange={(event) => switchClinic(event.target.value)}>
        {clinics.map((clinic) => <option key={clinic.clinicId} value={clinic.clinicId}>{clinic.clinicName} · {clinic.role}</option>)}
      </select>
    </div>
  );
}

function PageHeader({ eyebrow, title, action = "Configure" }: { eyebrow: string; title: string; action?: string }) {
  const navigate = useNavigate();

  function openConfigure() {
    const actionRoutes: Record<string, string> = {
      Configure: "/ai-receptionist",
      "Add source": "/knowledge-base",
      "New slot": "/appointments",
      "Create flow": "/workflows",
      "Record payment": "/billing",
    };

    navigate(actionRoutes[action] || "/ai-receptionist");
  }

  function openTestChat() {
    const scrollToWidget = () => document.getElementById("patient-chat-widget")?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (window.location.pathname !== "/dashboard") {
      navigate("/dashboard");
      window.setTimeout(scrollToWidget, 80);
      return;
    }

    scrollToWidget();
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <button className="ghost-button" type="button" onClick={openConfigure}><Settings2 size={17} />{action}</button>
        <button className="primary-button" type="button" onClick={openTestChat}><MessageSquareText size={17} />Test chat</button>
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
  const [settings, setSettings] = useState<ReceptionistSettingsRecord>(defaultReceptionistSettings);
  const [status, setStatus] = useState("Loading AI receptionist settings…");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receptionists, setReceptionists] = useState<ReceptionistOption[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState(getWorkspaceSelection().clinicId || "");
  const [selectedReceptionistId, setSelectedReceptionistId] = useState(getWorkspaceSelection().receptionistId || "");
  const promptPreview = useMemo(() => buildSettingsPromptPreview(settings), [settings]);

  async function refreshReceptionists(clinicId: string, preferredReceptionistId?: string) {
    const items = await listReceptionists(clinicId);
    setReceptionists(items);
    const nextReceptionistId = preferredReceptionistId || getWorkspaceSelection().receptionistId || items[0]?.receptionistId || "";
    if (nextReceptionistId) {
      setSelectedReceptionistId(nextReceptionistId);
      setSelectedReceptionist(nextReceptionistId);
    }
    return nextReceptionistId;
  }

  async function loadForSelection() {
    setLoading(true);
    const selection = getWorkspaceSelection();
    try {
      const loaded = await loadReceptionistSettings(selection.clinicId, selection.receptionistId);
      setSettings(loaded);
      setSelectedClinicId(loaded.clinicId || "");
      setSelectedReceptionistId(loaded.receptionistId || "");
      if (loaded.clinicId) setSelectedClinic(loaded.clinicId);
      if (loaded.receptionistId) setSelectedReceptionist(loaded.receptionistId);
      if (loaded.clinicId) await refreshReceptionists(loaded.clinicId, loaded.receptionistId);
      setStatus(`Loaded ${loaded.name} for ${loaded.clinicName || "your clinic"}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load AI receptionist settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadForSelection();
    return subscribeWorkspaceSelection(() => void loadForSelection());
  }, []);

  async function switchReceptionist(receptionistId: string) {
    setSelectedReceptionistId(receptionistId);
    setSelectedReceptionist(receptionistId);
    setLoading(true);
    try {
      const loaded = await loadReceptionistSettings(selectedClinicId || undefined, receptionistId);
      setSettings(loaded);
      setStatus(`Switched to ${loaded.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to switch receptionist.");
    } finally {
      setLoading(false);
    }
  }

  async function addReceptionist() {
    if (!selectedClinicId) return setStatus("Choose a clinic before adding a receptionist.");
    const name = window.prompt("Name for the new AI receptionist", "Mia") || "Mia";
    setSaving(true);
    try {
      const newId = await createReceptionist(selectedClinicId, name);
      await refreshReceptionists(selectedClinicId, newId);
      const loaded = await loadReceptionistSettings(selectedClinicId, newId);
      setSettings(loaded);
      setStatus(`Created and switched to ${loaded.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create receptionist.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(nextSettings: ReceptionistSettingsRecord) {
    setSaving(true);
    setStatus("Saving AI receptionist settings…");
    try {
      const saved = await saveReceptionistSettings({ ...nextSettings, clinicId: selectedClinicId || nextSettings.clinicId, receptionistId: selectedReceptionistId || nextSettings.receptionistId });
      setSettings(saved);
      if (saved.clinicId) await refreshReceptionists(saved.clinicId, saved.receptionistId);
      setStatus(`Saved. ${saved.name} is ready for live chat tests.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save AI receptionist settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="AI Receptionist" title="Personality, prompt, providers, and behavior" />
      <section className="receptionist-switcher-bar">
        <div>
          <strong>AI receptionist</strong>
          <span>Switch between different receptionist personas for the selected clinic.</span>
        </div>
        <select value={selectedReceptionistId} onChange={(event) => switchReceptionist(event.target.value)}>
          {receptionists.map((item) => <option key={item.receptionistId} value={item.receptionistId}>{item.name} · {item.defaultProvider}/{item.defaultModel}</option>)}
        </select>
        <button className="ghost-button" type="button" onClick={addReceptionist}>Add receptionist</button>
      </section>
      <section className="content-grid two-one">
        <Panel title="Receptionist configuration" subtitle="Dynamic settings saved to Supabase" icon={Bot}>
          <ReceptionistSettingsForm value={settings} loading={loading} saving={saving} status={status} onChange={setSettings} onSave={handleSave} />
        </Panel>
        <Panel title="Live prompt preview" subtitle="Updates as you edit" icon={ClipboardLike}>
          <div className="prompt-box live-preview">{promptPreview}</div>
          <div className="config-list compact-list">
            <ConfigList items={[["Provider", `${settings.defaultProvider} · ${settings.defaultModel}`], ["Fallback", settings.fallbackProvider === "none" ? "Disabled" : `${settings.fallbackProvider} · ${settings.fallbackModel || "default"}`], ["Knowledge", settings.useApprovedKnowledgeOnly ? "Approved only" : "Flexible"], ["Handoff", settings.humanHandoffEnabled ? "Enabled" : "Disabled"]]} />
          </div>
        </Panel>
      </section>
      <section className="content-grid two-col">
        <Panel title="Patient chat preview" subtitle="Uses selected receptionist settings in live chat tests" icon={MessageSquareText}><PatientChatWidget /></Panel>
        <Panel title="Safety checklist" subtitle="Healthcare-aware boundaries" icon={ShieldCheck}><SafetyStack /></Panel>
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
