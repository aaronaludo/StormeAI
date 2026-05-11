import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  CircleDashed,
  ChevronRight,
  ClipboardList,
  DatabaseZap,
  FileText,
  GitBranch,
  Pencil,
  Globe2,
  HeartPulse,
  LayoutDashboard,
  MessageSquareText,
  Megaphone,
  Menu,
  Settings2,
  ShieldCheck,
  LogOut,
  Mail,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  X,
  Trash2,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Area, Bar as RechartsBar, BarChart, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PatientChatWidget } from "./components/chat/PatientChatWidget";
import { ReceptionistSettingsForm } from "./components/settings/ReceptionistSettingsForm";
import { AuthPage } from "./pages/AuthPage";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { ClinicOnboardingPage } from "./pages/ClinicOnboardingPage";
import { supabase } from "./lib/supabase";
import { buildSettingsPromptPreview, createReceptionist, defaultReceptionistSettings, listReceptionists, loadReceptionistSettings, saveReceptionistSettings, type ReceptionistOption, type ReceptionistSettingsRecord } from "./lib/ai/receptionistSettings";
import { listClinicWorkspaces, type ClinicWorkspaceOption } from "./lib/clinicWorkspaces";
import { getWorkspaceSelection, persistWorkspaceSelection, setSelectedClinic, setSelectedReceptionist, subscribeWorkspaceSelection } from "./lib/workspaceSelection";

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number }>;
};

function RobotEmojiIcon({ size = 18 }: { size?: number }) {
  return <span className="robot-emoji-icon" style={{ fontSize: size }} aria-hidden="true">🤖</span>;
}

type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: "blue" | "teal" | "green" | "amber" | "red";
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: "dashboard", icon: LayoutDashboard },
  { label: "Chats", path: "chats", icon: MessageSquareText },
  { label: "Clinics", path: "clinics", icon: ClipboardList },
  { label: "AI Receptionist", path: "ai-receptionist", icon: RobotEmojiIcon },
  { label: "Knowledge Base", path: "knowledge-base", icon: DatabaseZap },
  { label: "Appointments", path: "appointments", icon: CalendarCheck },
  { label: "Marketing", path: "marketing", icon: Megaphone },
  { label: "Integrations", path: "integrations", icon: Globe2 },
  { label: "Account Settings", path: "account", icon: Settings2 },
];

const metrics: Metric[] = [
  { label: "Chats today", value: "48", delta: "+18% vs yesterday", tone: "blue" },
  { label: "Booking requests", value: "12", delta: "7 need review", tone: "teal" },
  { label: "Human handoffs", value: "4", delta: "2 urgent", tone: "amber" },
  { label: "Knowledge gaps", value: "7", delta: "3 new FAQs", tone: "red" },
];

const knowledgeSources = [
  { title: "Clinic services and prices", meta: "18 chunks indexed", status: "Indexed" },
  { title: "Pre-visit preparation guide", meta: "PDF source", status: "Indexed" },
  { title: "Doctor profiles", meta: "4 providers", status: "Indexed" },
  { title: "Cancellation policy", meta: "Clinic rule", status: "Indexed" },
];

const appointmentRows = [
  { patient: "Maria Santos", service: "Dental Cleaning", time: "Tomorrow · 10:00 AM", status: "Requested" },
  { patient: "John Cruz", service: "Derma Consultation", time: "Friday · 2:00 PM", status: "Confirmed" },
  { patient: "Ana Reyes", service: "Lab Test", time: "Monday · 8:00 AM", status: "Prep sent" },
  { patient: "Carlo Dela Cruz", service: "Dental Consultation", time: "Reschedule requested", status: "Review" },
];

type KnowledgeDocument = {
  id: string;
  title: string;
  sourceType: string;
  content: string;
  status: string;
  updatedAt?: string;
  filePath?: string;
};

type AppointmentInboxRow = {
  id: string;
  patientName: string;
  patientContact: string;
  service: string;
  time: string;
  status: string;
  note: string;
};

type ChatSessionRow = {
  id: string;
  status: string;
  channel: string;
  lastMessageAt?: string;
  createdAt: string;
  handoffRequested: boolean;
  emergencyFlag: boolean;
};

type ChatMessageRow = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};



const providerCards = [
  { name: "Default AI Model", model: "Local StormeAI model", tag: "Active", active: true },
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/book/:clinicId" element={<BookingRequestPage />} />

        <Route element={<PublicRoute />}>
          <Route path="/auth" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/auth/sign-in" element={<AuthPage mode="sign-in" />} />
          <Route path="/auth/sign-up" element={<AuthPage mode="sign-up" />} />
          <Route path="/auth/forgot-password" element={<AuthPage mode="forgot-password" />} />
          <Route path="/auth/update-password" element={<AuthPage mode="update-password" />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/chats" element={<LegacyClinicPageRedirect page="chats" />} />
            <Route path="/clinics" element={<ClinicOnboardingPage />} />
            <Route path="/ai-receptionist" element={<LegacyClinicPageRedirect page="ai-receptionist" />} />
            <Route path="/knowledge-base" element={<LegacyClinicPageRedirect page="knowledge-base" />} />
            <Route path="/appointments" element={<LegacyClinicPageRedirect page="appointments" />} />
            <Route path="/marketing" element={<LegacyClinicPageRedirect page="marketing" />} />
            <Route path="/integrations" element={<LegacyClinicPageRedirect page="integrations" />} />
            <Route path="/account" element={<LegacyClinicPageRedirect page="account" />} />
            <Route path="/dashboard/:clinicId" element={<DashboardPage />} />
            <Route path="/chats/:clinicId" element={<ChatsPage />} />
            <Route path="/clinics/:clinicId" element={<ClinicOnboardingPage />} />
            <Route path="/ai-receptionist/:clinicId" element={<ReceptionistPage />} />
            <Route path="/knowledge-base/:clinicId" element={<KnowledgeBasePage />} />
            <Route path="/appointments/:clinicId" element={<AppointmentsPage />} />
            <Route path="/marketing/:clinicId" element={<MarketingPage />} />
            <Route path="/integrations/:clinicId" element={<IntegrationsPage />} />
            <Route path="/account/:clinicId" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        <Route path="/onboarding" element={<Navigate to="/clinics" replace />} />
        <Route path="*" element={<DashboardRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

function LandingPage() {
  const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
  const landingMenuLinks = [
    { label: "Product", href: "#product" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  const closeLandingMenu = () => setIsLandingMenuOpen(false);

  const capabilities = [
    { title: "Responds to patient inquiries", text: "Answers through Messenger, SMS, and the website widget using information your clinic has approved.", icon: MessageSquareText },
    { title: "Captures booking requests", text: "Collects the service, preferred schedule, contact details, and notes in a structured booking flow.", icon: CalendarCheck },
    { title: "Keeps patients updated", text: "Sends confirmations, reminders, and follow-up messages so patients know the next step.", icon: Smartphone },
    { title: "Uses verified clinic knowledge", text: "References your services, prices, FAQs, preparation notes, and policies for consistent replies.", icon: BookOpen },
    { title: "Guides priority conversations", text: "Identifies urgent, sensitive, or unclear inquiries and applies your clinic’s approved next-step rules.", icon: GitBranch },
    { title: "Shows the full chat history", text: "Keeps inquiries, booking requests, knowledge gaps, and conversation outcomes organized in one dashboard.", icon: BarChart3 },
  ];

  const setupSteps = [
    { step: "Step 01", title: "Connect a channel", text: "Use Messenger, phone/SMS, or the StormeAI web widget." },
    { step: "Step 02", title: "Drop in your knowledge", text: "Upload services, pricing, policies, FAQs, and clinic rules." },
    { step: "Step 03", title: "Set the rules", text: "Choose booking, triage, fallback, and priority-intake behavior." },
    { step: "Step 04", title: "Go live and review", text: "Every patient conversation stays searchable with clear booking context and outcomes." },
  ];

  const pricingItems = [
    "Multiple clinic workspaces",
    "Unlimited patient chats",
    "Messenger, phone/SMS, and web widget",
    "Clinic knowledge base setup",
    "Booking request collection",
    "Priority intake workflows",
    "Conversation dashboard",
    "Review-ready chat history",
  ];

  const channelItems = [
    { title: "Messenger", text: "Facebook Messenger inquiries", tone: "messenger", logo: "https://api.iconify.design/logos:messenger.svg" },
    { title: "Phone message", text: "SMS-style patient messages", tone: "sms", logo: "https://api.iconify.design/simple-icons:imessage.svg?color=%2334C759" },
    { title: "Website widget", text: "Embedded StormeAI chat", tone: "widget", logo: "https://api.iconify.design/noto:globe-showing-americas.svg" },
  ];

  const faqs = [
    ["Will patients know they are talking to AI?", "StormeAI is transparent when asked and can introduce itself by your clinic receptionist name."],
    ["Can it use my existing channels?", "Yes. Use Messenger, phone/SMS, and the embeddable website widget."],
    ["What happens when the AI does not know the answer?", "It follows your fallback rules, asks clarifying questions, and keeps the conversation inside your approved clinic workflow."],
    ["How long does setup take?", "Most clinics can prepare a first workflow quickly once services, policies, and contact details are ready."],
    ["Where is my data stored?", "Clinic data is handled inside your secure StormeAI workspace."],
  ];

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link className="auth-brand" to="/">
          <span><Sparkles size={18} /></span>
          StormeAI
        </Link>
        <div className="landing-nav-links">
          {landingMenuLinks.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </div>
        <div className="landing-nav-actions">
          <Link className="ghost-button" to="/auth/sign-in">Sign in</Link>
          <Link className="primary-button" to="/auth/sign-up">Create an account <ArrowRight size={17} /></Link>
        </div>
        <button
          className="landing-menu-toggle"
          type="button"
          aria-label={isLandingMenuOpen ? "Close landing menu" : "Open landing menu"}
          aria-expanded={isLandingMenuOpen}
          aria-controls="landing-mobile-menu"
          onClick={() => setIsLandingMenuOpen((open) => !open)}
        >
          {isLandingMenuOpen ? <X size={20} /> : <Menu size={20} />}
          <span>Menu</span>
        </button>
        <div className={`landing-mobile-menu ${isLandingMenuOpen ? "open" : ""}`} id="landing-mobile-menu">
          {landingMenuLinks.map((item) => <a href={item.href} key={item.href} onClick={closeLandingMenu}>{item.label}</a>)}
        </div>
      </nav>

      <section className="landing-hero editorial-hero" id="product">
        <div className="landing-hero-copy editorial-hero-copy">
          <span className="landing-kicker"><span /> AI patient chat support for clinics</span>
          <h1>Better Care Begins with <strong>Every Answer.</strong></h1>
          <p>StormeAI helps clinics answer patient questions, collect appointment details, and turn patient chats into organized booking requests.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/auth/sign-up">Get started</Link>
            <a className="ghost-button" href="#how-it-works">See how it works <ArrowRight size={17} /></a>
          </div>
          <div className="hero-trust-row">
            <span><ShieldCheck size={16} /> Clinic-safe answers</span>
            <span><MessageSquareText size={16} /> Unlimited chats</span>
            <span><Globe2 size={16} /> Messenger + SMS + widget</span>
          </div>
        </div>

        <div className="landing-widget-hero" aria-label="StormeAI chat widget preview">
          <PatientChatWidget receptionistName="Meng" />
        </div>

        <div className="landing-channel-strip" aria-label="StormeAI channel integrations">
          <span>Integrated channels</span>
          {channelItems.map((item) => (
            <article className={`channel-card ${item.tone}`} key={item.title}>
              <div className={`channel-logo ${item.tone}-logo`} aria-hidden="true">
                <img src={item.logo} alt="" />
              </div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-capabilities" id="product">
        <div className="landing-section-heading split">
          <div>
            <p className="landing-kicker"><span /> What StormeAI handles</p>
            <h2>An <strong>AI clinic assistant</strong> for patient chat, intake, and booking requests.</h2>
          </div>
          <p>StormeAI keeps patient conversations moving with approved answers, structured appointment details, priority intake rules, and a dashboard your team can review.</p>
        </div>
        <div className="capability-grid">
          {capabilities.map((item, index) => (
            <article className="capability-cell" key={item.title}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <span><item.icon size={32} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section setup-section" id="how-it-works">
        <div className="landing-section-heading split">
          <div>
            <p className="landing-kicker"><span /> How it works</p>
            <h2>Train StormeAI like a <strong>clinic receptionist.</strong></h2>
          </div>
          <p>Connect your patient channels, add approved clinic information, define booking rules, and customize how conversations should progress.</p>
        </div>
        <div className="setup-grid">
          {setupSteps.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-stats-band" aria-label="StormeAI stats">
        <h2>Patient chats stay open, even after hours.</h2>
        <div>
          <strong>24/7<span>patient chat coverage</span></strong>
          <strong>1<span>shared dashboard</span></strong>
          <strong>6<span>core assistant workflows</span></strong>
          <strong>∞<span>patient messages</span></strong>
        </div>
      </section>

      <section className="landing-section landing-pricing-section editorial-pricing" id="pricing">
        <div>
          <p className="landing-kicker"><span /> Pricing</p>
          <h2><strong>One plan</strong> for StormeAI clinic support.</h2>
          <p>Includes AI patient chat assistance, clinic workspaces, unlimited conversations, approved knowledge setup, booking request flows, and priority intake tools.</p>
          <div className="price-box">
            <span>All-in package</span>
            <strong>Custom</strong>
            <p>monthly plan based on your clinic setup</p>
            <Link className="primary-button" to="/auth/sign-up">Get pricing <ArrowRight size={17} /></Link>
          </div>
        </div>
        <div className="receipt-card">
          <div className="receipt-head">
            <span>StormeAI · Plan receipt</span>
            <span>Clinic Growth</span>
          </div>
          {pricingItems.map((item, index) => (
            <div className="receipt-row" key={item}><span>0{index + 1}</span><strong>{item}</strong><Check size={17} /></div>
          ))}
          <div className="receipt-total"><span>Included</span><strong>Everything above</strong></div>
        </div>
      </section>

      <section className="landing-section faq-section" id="faq">
        <div>
          <p className="landing-kicker"><span /> FAQ</p>
          <h2>Things clinic operators actually ask.</h2>
          <a className="contact-pill" href="mailto:hello@stormeai.com"><Mail size={16} /> hello@stormeai.com</a>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer], index) => (
            <article key={question} className={index === 0 ? "open" : ""}>
              <div><h3>{question}</h3><span>{index === 0 ? "x" : "+"}</span></div>
              {index === 0 && <p>{answer}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section final-cta">
        <div>
          <p className="landing-kicker"><span /> Ready when you are</p>
          <h2>Let every patient chat get an answer. <strong>Instantly.</strong></h2>
          <p>Launch StormeAI for patient questions, appointment requests, follow-ups, and priority intake workflows.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/auth/sign-up"><MessageSquareText size={17} /> Try a live chat</Link>
            <a className="ghost-button" href="mailto:hello@stormeai.com">Book a 15-min demo</a>
          </div>
        </div>
        <div className="final-orb"><MessageSquareText size={48} /></div>
      </section>

      <footer className="landing-footer editorial-footer">
        <div>
          <Link className="auth-brand" to="/">
            <span><Sparkles size={18} /></span>
            StormeAI
          </Link>
          <p>AI chat assistance for clinics. Real intake, real bookings, real follow-up.</p>
        </div>
        <div>
          <strong>Product</strong>
          <a href="#product">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div>
          <strong>Channels</strong>
          <a href="#product">Phone/SMS</a>
          <a href="#product">Messenger</a>
          <a href="#product">Web widget</a>
        </div>
        <div>
          <strong>Company</strong>
          <a href="#faq">FAQ</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
        </div>
        <div>
          <strong>Contact</strong>
          <a href="mailto:hello@stormeai.com">hello@stormeai.com</a>
          <span>Messenger · SMS · Web widget</span>
        </div>
      </footer>
    </main>
  );
}

function AppLayout() {
  const { clinicId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem("stormeai-sidebar-width") || 292));

  useEffect(() => {
    if (clinicId && getWorkspaceSelection().clinicId !== clinicId) setSelectedClinic(clinicId);
  }, [clinicId]);

  function startSidebarResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    document.body.classList.add("sidebar-resizing");

    function resize(moveEvent: PointerEvent) {
      const nextWidth = Math.min(380, Math.max(220, startWidth + moveEvent.clientX - startX));
      setSidebarWidth(nextWidth);
      localStorage.setItem("stormeai-sidebar-width", String(Math.round(nextWidth)));
    }

    function stopResize() {
      document.body.classList.remove("sidebar-resizing");
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize, { once: true });
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`} style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}>
      <button className="sidebar-menu-toggle" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar menu">
        <Menu size={21} />
        <span>Menu</span>
      </button>
      {sidebarOpen && <button className="sidebar-scrim" type="button" aria-label="Close sidebar menu" onClick={() => setSidebarOpen(false)} />}
      <Sidebar onNavigate={() => setSidebarOpen(false)} onClose={() => setSidebarOpen(false)} onResizeStart={startSidebarResize} />
      <main className="main-panel">
        <Outlet />
      </main>
      <FloatingPatientChat />
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
  if (session && location.pathname !== "/auth/update-password") return <DashboardRedirect />;

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

function FloatingPatientChat() {
  const [open, setOpen] = useState(false);
  const [receptionists, setReceptionists] = useState<ReceptionistOption[]>([]);
  const [selectedReceptionistId, setSelectedReceptionistId] = useState(getWorkspaceSelection().receptionistId || "");

  useEffect(() => {
    let mounted = true;
    async function loadReceptionists() {
      const clinicId = getWorkspaceSelection().clinicId;
      if (!clinicId) return;
      try {
        const items = await listReceptionists(clinicId);
        if (!mounted) return;
        setReceptionists(items);
        const current = getWorkspaceSelection().receptionistId || items[0]?.receptionistId || "";
        setSelectedReceptionistId(current);
        if (current) persistWorkspaceSelection({ clinicId, receptionistId: current });
      } catch {
        if (mounted) setReceptionists([]);
      }
    }
    void loadReceptionists();
    return subscribeWorkspaceSelection(() => void loadReceptionists());
  }, []);

  function switchReceptionist(receptionistId: string) {
    const clinicId = getWorkspaceSelection().clinicId;
    setSelectedReceptionistId(receptionistId);
    persistWorkspaceSelection({ clinicId, receptionistId });
  }

  const selectedReceptionist = receptionists.find((item) => item.receptionistId === selectedReceptionistId);
  const selectedReceptionistName = selectedReceptionist?.name || "Meng";

  return (
    <div className={`floating-chat-shell ${open ? "open" : ""}`}>
      {open && (
        <div className="floating-chat-panel">
          <div className="floating-chat-selector">
            <label>AI receptionist</label>
            <select value={selectedReceptionistId} onChange={(event) => switchReceptionist(event.target.value)}>
              {receptionists.map((item) => <option key={item.receptionistId} value={item.receptionistId}>{item.name} · Default AI Model</option>)}
            </select>
          </div>
          <PatientChatWidget key={selectedReceptionistId || "default-receptionist"} receptionistName={selectedReceptionistName} />
        </div>
      )}
      <button className="floating-chat-button" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="patient-chat-widget">
        <MessageSquareText size={22} />
        <span>{open ? "Hide preview" : "AI Receptionist preview"}</span>
      </button>
    </div>
  );
}

function Sidebar({ onNavigate, onClose, onResizeStart }: { onNavigate?: () => void; onClose?: () => void; onResizeStart?: (event: React.PointerEvent<HTMLButtonElement>) => void }) {
  const navigate = useNavigate();
  const { clinicId } = useParams();
  const { session } = useAuthState();
  const [activeClinicId, setActiveClinicId] = useState(clinicId || getWorkspaceSelection().clinicId || "");

  useEffect(() => subscribeWorkspaceSelection(() => setActiveClinicId(getWorkspaceSelection().clinicId || "")), []);
  useEffect(() => { if (clinicId) setActiveClinicId(clinicId); }, [clinicId]);

  async function logout() {
    await supabase?.auth.signOut();
    navigate("/auth/sign-in", { replace: true });
  }

  return (
    <aside className="sidebar">
      <button className="sidebar-close-button" type="button" onClick={onClose} aria-label="Close sidebar menu"><X size={18} /></button>
      <div className="brand-lockup">
        <div className="brand-mark"><Sparkles size={22} /></div>
        <div>
          <p className="brand-name">StormeAI</p>
          <p className="brand-subtitle">Clinic receptionist</p>
        </div>
      </div>

      <ClinicSwitcher />

      <nav className="nav-list">
        {navItems.map((item) => {
          const path = activeClinicId ? clinicPagePath(activeClinicId, item.path) : "/dashboard";
          return (
            <NavLink className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} to={path} key={item.label} onClick={onNavigate}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-card account-card">
        <div className="status-dot" />
        <div>
          <strong>{session?.user.email || "Signed in"}</strong>
          <span>Receptionist online · 2.1s avg response</span>
        </div>
      </div>

      <button className="sidebar-logout" type="button" onClick={() => { onNavigate?.(); void logout(); }}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
      <button className="sidebar-resize-handle" type="button" aria-label="Resize sidebar" onPointerDown={onResizeStart} />
    </aside>
  );
}

function ClinicSwitcher() {
  const navigate = useNavigate();
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
    navigate(clinicPagePath(clinicId, currentClinicPageSlug(window.location.pathname)), { replace: true });
  }

  const activeClinic = clinics.find((clinic) => clinic.clinicId === selected);

  return (
    <div className="clinic-switcher">
      <div className="clinic-switcher-header">
        <span>Active clinic</span>
        {activeClinic && <strong>{activeClinic.role}</strong>}
      </div>
      <select aria-label="Switch active clinic" value={selected} onChange={(event) => switchClinic(event.target.value)}>
        {clinics.map((clinic) => <option key={clinic.clinicId} value={clinic.clinicId}>{clinic.clinicName} · {clinic.role}</option>)}
      </select>
      <p>{status}</p>
    </div>
  );
}

function PageHeader(_props: { eyebrow: string; title: string; action?: string }) {
  return null;
}

function clinicPagePath(clinicId: string, page: string) {
  return `/${page.replace(/^\//, "")}/${clinicId}`;
}

function currentClinicPageSlug(pathname: string) {
  const page = pathname.split("/").filter(Boolean)[0];
  const known = navItems.some((item) => item.path === page);
  return known ? page : "dashboard";
}

function DashboardRedirect() {
  const clinicId = getWorkspaceSelection().clinicId;
  return <Navigate to={clinicId ? clinicPagePath(clinicId, "dashboard") : "/clinics"} replace />;
}

function LegacyClinicPageRedirect({ page }: { page: string }) {
  const params = useParams();
  const clinicId = params.clinicId || getWorkspaceSelection().clinicId;
  return <Navigate to={clinicId ? clinicPagePath(clinicId, page) : "/clinics"} replace />;
}

function DashboardPage() {
  const { clinicId } = useParams();
  const [stats, setStats] = useState({
    chats: 0,
    sessions: 0,
    appointments: 0,
    requestedAppointments: 0,
    confirmedAppointments: 0,
    knowledge: 0,
    marketingContacts: 0,
    receptionistCount: 0,
  });
  const [trend, setTrend] = useState<Array<{ label: string; chats: number; appointments: number }>>([]);
  const [status, setStatus] = useState("Loading analytics…");

  async function loadDashboardStats() {
    const activeClinicId = clinicId || getWorkspaceSelection().clinicId;
    if (!activeClinicId) return setStatus("Choose a clinic first.");
    if (clinicId && getWorkspaceSelection().clinicId !== clinicId) setSelectedClinic(clinicId);
    if (!supabase) return setStatus("Supabase is not configured.");

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const [messages, sessions, appointments, requested, confirmed, knowledge, receptionists, recentMessages, recentAppointments, appointmentContacts] = await Promise.all([
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("clinic_id", activeClinicId),
      supabase.from("chat_sessions").select("id", { count: "exact", head: true }).eq("clinic_id", activeClinicId),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", activeClinicId),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", activeClinicId).eq("status", "requested"),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", activeClinicId).eq("status", "confirmed"),
      supabase.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("clinic_id", activeClinicId),
      listReceptionists(activeClinicId).then((items) => ({ count: items.length, data: items, error: null })).catch((error) => ({ count: 0, data: [], error })),
      supabase.from("chat_messages").select("created_at").eq("clinic_id", activeClinicId).gte("created_at", since.toISOString()),
      supabase.from("appointments").select("created_at,requested_start_at,scheduled_start_at").eq("clinic_id", activeClinicId).limit(500),
      supabase.from("appointments").select("patients(id,email,phone)").eq("clinic_id", activeClinicId),
    ]);

    const contactKeys = new Set<string>();
    ((appointmentContacts.data || []) as any[]).forEach((row) => {
      const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
      const key = patient?.id || patient?.email || patient?.phone;
      if (key && (patient?.email || patient?.phone)) contactKeys.add(String(key));
    });

    setStats({
      chats: messages.count || 0,
      sessions: sessions.count || 0,
      appointments: appointments.count || 0,
      requestedAppointments: requested.count || 0,
      confirmedAppointments: confirmed.count || 0,
      knowledge: knowledge.count || 0,
      marketingContacts: contactKeys.size,
      receptionistCount: receptionists.count || 0,
    });
    setTrend(buildDashboardTrend(recentMessages.data || [], recentAppointments.data || []));
    setStatus("Clinic analytics loaded.");
  }

  useEffect(() => {
    void loadDashboardStats();
  }, [clinicId]);

  const activeClinicId = clinicId || getWorkspaceSelection().clinicId || "";
  const healthScore = Math.min(100, Math.round(((stats.knowledge ? 30 : 0) + (stats.receptionistCount ? 25 : 0) + (stats.appointments ? 25 : 0) + (stats.sessions ? 20 : 0))));
  const [animatedHealthScore, setAnimatedHealthScore] = useState(0);
  const conversionRate = stats.sessions ? Math.round((stats.appointments / stats.sessions) * 100) : 0;

  useEffect(() => {
    let frame = 0;
    let start: number | null = null;
    const duration = 1450;
    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedHealthScore(Math.round(healthScore * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setAnimatedHealthScore(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [healthScore, activeClinicId]);

  return (
    <>
      <section className="hero-grid dashboard-hero-grid">
        <div className="hero-card dashboard-command-card">
          <div className="hero-content">
            <span className="badge teal">Clinic operating overview</span>
            <h2>StormeAI command center</h2>
            <p>Track chat activity, appointment demand, patient marketing contacts, knowledge readiness, and integrations from one dashboard.</p>
            <div className="hero-actions">
              <NavLink className="primary-button" to={clinicPagePath(activeClinicId, "appointments")}>Review bookings <ArrowRight size={17} /></NavLink>
              <NavLink className="ghost-button" to={clinicPagePath(activeClinicId, "marketing")}>Open marketing</NavLink>
            </div>
          </div>
        </div>
        <Panel title="Clinic readiness" subtitle={status} icon={ShieldCheck}>
          <div className="readiness-ring" style={{ "--score": String(healthScore) } as React.CSSProperties}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="readiness-ring-track" cx="60" cy="60" r="48" pathLength="100" />
              <circle className="readiness-ring-progress" cx="60" cy="60" r="48" pathLength="100" />
            </svg>
            <strong>{animatedHealthScore}%</strong><span>ready</span>
          </div>
          <ConfigList items={[["AI receptionists", String(stats.receptionistCount)], ["Knowledge sources", String(stats.knowledge)], ["Marketing contacts", String(stats.marketingContacts)], ["Booking conversion", `${conversionRate}%`]]} />
        </Panel>
      </section>

      <section className="metrics-grid dashboard-metrics-grid">
        <MetricCard label="Chat messages" value={String(stats.chats)} delta="All patient/staff messages" tone="blue" />
        <MetricCard label="Chat sessions" value={String(stats.sessions)} delta="Patient conversations" tone="teal" />
        <MetricCard label="Appointments" value={String(stats.appointments)} delta={`${stats.requestedAppointments} requested · ${stats.confirmedAppointments} confirmed`} tone="green" />
        <MetricCard label="Marketing contacts" value={String(stats.marketingContacts)} delta="From appointment patients" tone="teal" />
        <MetricCard label="Knowledge docs" value={String(stats.knowledge)} delta="Approved sources for answers" tone="blue" />
      </section>

      <section className="content-grid two-one dashboard-analytics-grid">
        <Panel title="7-day activity trend" subtitle="Chats and appointment requests" icon={Activity}>
          <DashboardLineChart data={trend} />
        </Panel>
        <Panel title="Sidebar page data" subtitle="Live counts from each workspace area" icon={LayoutDashboard}>
          <DashboardAreaList activeClinicId={activeClinicId} stats={stats} />
        </Panel>
      </section>

      <section className="content-grid two-col dashboard-analytics-grid">
        <Panel title="Appointments pipeline" subtitle="Request status overview" icon={CalendarCheck}>
          <DashboardBars items={[
            { label: "Requested", value: stats.requestedAppointments, tone: "blue" },
            { label: "Confirmed", value: stats.confirmedAppointments, tone: "green" },
            { label: "Total", value: stats.appointments, tone: "teal" },
          ]} />
        </Panel>
        <Panel title="Growth opportunities" subtitle="Where staff can act next" icon={Sparkles}>
          <DashboardActionCards activeClinicId={activeClinicId} stats={stats} />
        </Panel>
      </section>
    </>
  );
}

function buildDashboardTrend(messages: Array<{ created_at?: string }>, appointments: Array<{ created_at?: string; requested_start_at?: string | null; scheduled_start_at?: string | null }>) {
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString("en-US", { weekday: "short" }), chats: 0, appointments: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  messages.forEach((item) => {
    const key = item.created_at?.slice(0, 10);
    const day = key ? byKey.get(key) : undefined;
    if (day) day.chats += 1;
  });
  appointments.forEach((item) => {
    const appointmentDate = item.scheduled_start_at || item.requested_start_at || item.created_at;
    const key = appointmentDate?.slice(0, 10);
    const day = key ? byKey.get(key) : undefined;
    if (day) day.appointments += 1;
  });
  return days;
}

function DashboardLineChart({ data }: { data: Array<{ label: string; chats: number; appointments: number }> }) {
  return (
    <div className="dashboard-recharts-card">
      <ResponsiveContainer width="100%" height={310}>
        <ComposedChart data={data} margin={{ top: 18, right: 12, left: -18, bottom: 8 }}>
          <defs>
            <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.26} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 800 }} />
          <YAxis yAxisId="chats" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 800 }} />
          <YAxis yAxisId="appointments" orientation="right" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#0f766e", fontSize: 12, fontWeight: 800 }} />
          <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 18px 38px rgba(15,23,42,.12)", fontWeight: 800 }} />
          <Legend iconType="circle" wrapperStyle={{ fontWeight: 850, color: "#334155" }} />
          <RechartsBar yAxisId="appointments" dataKey="appointments" name="Appointments" radius={[10, 10, 0, 0]} fill="#14b8a6" barSize={26} />
          <Area yAxisId="chats" type="monotone" dataKey="chats" name="Chats" stroke="#2563eb" strokeWidth={3} fill="url(#chatGradient)" activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}


function DashboardBars({ items }: { items: Array<{ label: string; value: number; tone: string }> }) {
  return (
    <div className="dashboard-recharts-card compact-chart">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={items} margin={{ top: 12, right: 18, left: -18, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 800 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 800 }} />
          <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 18px 38px rgba(15,23,42,.12)", fontWeight: 800 }} />
          <RechartsBar dataKey="value" name="Appointments" radius={[12, 12, 0, 0]} fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


function DashboardAreaList({ activeClinicId, stats }: { activeClinicId: string; stats: { sessions: number; appointments: number; knowledge: number; marketingContacts: number; receptionistCount: number } }) {
  const rows = [
    ["Chats", `${stats.sessions} sessions`, "chats", MessageSquareText],
    ["Appointments", `${stats.appointments} requests`, "appointments", CalendarCheck],
    ["Marketing", `${stats.marketingContacts} contacts`, "marketing", Megaphone],
    ["Knowledge Base", `${stats.knowledge} sources`, "knowledge-base", DatabaseZap],
    ["AI Receptionist", `${stats.receptionistCount} personas`, "ai-receptionist", RobotEmojiIcon],
    ["Integrations", "Widget + channels", "integrations", Globe2],
  ] as const;
  return <div className="dashboard-area-list">{rows.map(([label, value, page, Icon]) => <NavLink key={label} to={clinicPagePath(activeClinicId, page)}><Icon size={18} /><span>{label}</span><strong>{value}</strong><ChevronRight size={16} /></NavLink>)}</div>;
}

function DashboardActionCards({ activeClinicId, stats }: { activeClinicId: string; stats: { requestedAppointments: number; marketingContacts: number; knowledge: number } }) {
  return <div className="dashboard-action-cards">
    <NavLink to={clinicPagePath(activeClinicId, "appointments")}><strong>Confirm booking requests</strong><span>{stats.requestedAppointments} waiting for staff review</span></NavLink>
    <NavLink to={clinicPagePath(activeClinicId, "marketing")}><strong>Send patient notice</strong><span>{stats.marketingContacts} contacts available for campaigns</span></NavLink>
    <NavLink to={clinicPagePath(activeClinicId, "knowledge-base")}><strong>Improve answers</strong><span>{stats.knowledge ? `${stats.knowledge} sources active` : "Add your first approved FAQ"}</span></NavLink>
  </div>;
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
      persistWorkspaceSelection({ clinicId, receptionistId: nextReceptionistId });
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
      if (loaded.clinicId || loaded.receptionistId) persistWorkspaceSelection({ clinicId: loaded.clinicId, receptionistId: loaded.receptionistId });
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
    persistWorkspaceSelection({ clinicId: selectedClinicId || undefined, receptionistId });
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

  async function addReceptionist(event?: FormEvent) {
    event?.preventDefault();
    if (!selectedClinicId) return setStatus("Choose a clinic before adding a receptionist.");
    const name = newReceptionistName.trim() || "New Receptionist";
    setSaving(true);
    try {
      const newId = await createReceptionist(selectedClinicId, name);
      await refreshReceptionists(selectedClinicId, newId);
      const loaded = await loadReceptionistSettings(selectedClinicId, newId);
      setSettings(loaded);
      setCreateReceptionistOpen(false);
      setNewReceptionistName("");
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

  const [promptOpen, setPromptOpen] = useState(false);
  const [createReceptionistOpen, setCreateReceptionistOpen] = useState(false);
  const [newReceptionistName, setNewReceptionistName] = useState("");
  const activeReceptionist = receptionists.find((item) => item.receptionistId === selectedReceptionistId);

  return (
    <section className="ai-receptionist-modern-page">
      <div className="ai-receptionist-hero">
        <div className="ai-orb"><span className="robot-hero-emoji" aria-hidden="true">🤖</span></div>
        <div>
          <span className="badge teal"><Sparkles size={14} /> StormeAI persona builder</span>
          <h1>AI Receptionist Studio</h1>
          <p>Design the clinic’s chat-only front desk persona, booking behavior, operating rules, and approved-knowledge boundaries.</p>
        </div>
        <button className="primary-button add-receptionist-button" type="button" onClick={() => setCreateReceptionistOpen(true)} disabled={saving}>{saving ? "Creating…" : <><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg> Add receptionist</>}</button>
      </div>

      <section className="ai-receptionist-grid">
        <aside className="persona-panel">
          <div className="persona-panel-head">
            <p className="eyebrow">Personas</p>
            <strong>{receptionists.length} receptionist{receptionists.length === 1 ? "" : "s"}</strong>
          </div>
          <div className="persona-list">
            {receptionists.length ? receptionists.map((item) => (
              <button className={`persona-card ${item.receptionistId === selectedReceptionistId ? "active" : ""}`} key={item.receptionistId} type="button" onClick={() => void switchReceptionist(item.receptionistId)}>
                <span className="persona-avatar" aria-hidden="true">🤖</span>
                <div><strong>{item.name}</strong><span>Default AI Model</span></div>
                {item.receptionistId === selectedReceptionistId && <Check size={16} />}
              </button>
            )) : <p className="empty-state">No receptionist personas yet.</p>}
          </div>
          <div className="persona-insight-card">
            <MessageSquareText size={20} />
            <div><strong>Chat-only receptionist</strong><span>No diagnosis, no prescriptions, appointment requests only.</span></div>
          </div>
        </aside>

        <main className="receptionist-config-panel">
          <div className="config-panel-topbar">
            <div>
              <p className="eyebrow">Configuration</p>
              <h2>{settings.name || activeReceptionist?.name || "Receptionist"}</h2>
              <span>{status}</span>
            </div>
            <button className="ghost-button prompt-preview-trigger modern" type="button" onClick={() => setPromptOpen(true)}><ClipboardLike size={16} /> Prompt preview</button>
          </div>
          <ReceptionistSettingsForm value={settings} loading={loading} saving={saving} status={status} onChange={setSettings} onSave={handleSave} />
        </main>

        <aside className="ai-live-summary-panel">
          <div className="summary-ai-card">
            <div className="ai-pulse"><span className="robot-summary-emoji" aria-hidden="true">🤖</span></div>
            <h3>{settings.name || "Meng"}</h3>
            <span>{settings.clinicName || "Selected clinic"}</span>
          </div>
          <div className="summary-stat-list">
            <div><span>Model</span><strong>Default AI Model</strong></div>
            <div><span>Knowledge mode</span><strong>{settings.useApprovedKnowledgeOnly ? "Approved only" : "Flexible"}</strong></div>
            <div><span>Booking</span><strong>{settings.offerAppointmentWhenRelevant ? "Enabled" : "Disabled"}</strong></div>
            <div><span>Language</span><strong>{settings.languageStyle || "English / Taglish"}</strong></div>
          </div>
          <div className="mini-chat-preview-card">
            <strong>Patient preview</strong>
            <div className="mini-chat-bubble assistant">Hi! I’m {settings.name || "Meng"}, the clinic AI receptionist. How can I help?</div>
            <div className="mini-chat-bubble patient">I want to book an appointment.</div>
            <div className="mini-chat-bubble assistant">Please tap Redirect to enter appointment details clearly.</div>
          </div>
        </aside>
      </section>



      {createReceptionistOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add AI receptionist">
          <div className="prompt-modal create-modal ai-receptionist-create-modal">
            <div className="prompt-modal-header">
              <div className="ai-modal-title-row">
                <span className="ai-modal-robot" aria-hidden="true">🤖</span>
                <div>
                  <p className="eyebrow">AI Receptionist</p>
                  <h2>Add receptionist</h2>
                  <span>Create a new chat-only receptionist persona for this clinic. You can customize tone, language, booking rules, and knowledge behavior after creating it.</span>
                </div>
              </div>
              <button className="ghost-button" type="button" onClick={() => { setCreateReceptionistOpen(false); setNewReceptionistName(""); }}>Close</button>
            </div>
            <form className="ai-receptionist-create-form" onSubmit={(event) => void addReceptionist(event)}>
              <label className="full-field">Receptionist name<input value={newReceptionistName} onChange={(event) => setNewReceptionistName(event.target.value)} placeholder="Dark Lord" autoFocus /></label>
              <div className="ai-create-info-card">
                <strong>Default AI Model</strong>
                <span>This receptionist will use the clinic’s local default model and stay within StormeAI’s chat-only receptionist scope.</span>
              </div>
              <button className="primary-button full-field" type="submit" disabled={saving}>{saving ? "Creating…" : "Create receptionist"}</button>
            </form>
          </div>
        </div>
      )}

      {promptOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Live prompt preview">
          <div className="prompt-modal ai-prompt-modal">
            <div className="prompt-modal-header">
              <div>
                <p className="eyebrow">Live prompt preview</p>
                <h2>{settings.name} system behavior</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setPromptOpen(false)}>Close</button>
            </div>
            <div className="prompt-box live-preview modal-preview">{promptPreview}</div>
            <div className="config-list compact-list">
              <ConfigList items={[["Model", "Default AI Model"], ["Knowledge", settings.useApprovedKnowledgeOnly ? "Approved only" : "Flexible"], ["Bookings", settings.offerAppointmentWhenRelevant ? "Enabled" : "Disabled"]]} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ChatsPage() {
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading chat history…");
  const [search, setSearch] = useState("");

  async function loadSessions(preferredSessionId?: string) {
    const clinicId = getWorkspaceSelection().clinicId;
    if (!supabase || !clinicId) {
      setSessions([]);
      setMessages([]);
      setSelectedSessionId("");
      setLoading(false);
      setStatus("Choose or create a clinic first.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id,status,channel,last_message_at,created_at,handoff_requested,emergency_flag")
      .eq("clinic_id", clinicId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setStatus(`Failed to load chats: ${error.message}`);
      setLoading(false);
      return;
    }

    const rows = (data || []).map((row) => ({
      id: row.id,
      status: row.status,
      channel: row.channel,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      handoffRequested: row.handoff_requested,
      emergencyFlag: row.emergency_flag,
    }));
    setSessions(rows);
    const nextSelected = preferredSessionId || selectedSessionId || rows[0]?.id || "";
    setSelectedSessionId(nextSelected);
    setStatus(`${rows.length} chat session${rows.length === 1 ? "" : "s"} found.`);
    setLoading(false);
    if (nextSelected) await loadMessages(nextSelected);
    else setMessages([]);
  }

  async function loadMessages(sessionId: string) {
    const clinicId = getWorkspaceSelection().clinicId;
    if (!supabase || !clinicId) return;
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id,sender,body,created_at")
      .eq("clinic_id", clinicId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      setStatus(`Failed to load messages: ${error.message}`);
      return;
    }

    setMessages((data || []).map((row) => ({ id: row.id, sender: row.sender, body: row.body, createdAt: row.created_at })));
  }

  useEffect(() => {
    void loadSessions();
    return subscribeWorkspaceSelection(() => void loadSessions());
  }, []);

  function selectSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    void loadMessages(sessionId);
  }

  const selectedSession = sessions.find((session) => session.id === selectedSessionId);
  const filteredSessions = sessions.filter((session) => [session.id, session.channel, session.status, formatChatSessionTitle(session)].join(" ").toLowerCase().includes(search.toLowerCase()));
  const lastMessage = messages[messages.length - 1];
  const patientMessages = messages.filter((message) => message.sender === "patient").length;
  const assistantMessages = messages.filter((message) => message.sender === "assistant").length;

  return (
    <section className="messenger-page">
      <aside className="messenger-sidebar-panel">
        <div className="messenger-sidebar-head">
          <div><p className="eyebrow">Chats</p><h2>Inbox</h2></div>
          <button className="ghost-button compact-icon-button" type="button" onClick={() => void loadSessions(selectedSessionId)}>Refresh</button>
        </div>
        <div className="messenger-search"><MessageSquareText size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chats" /></div>
        <div className="messenger-session-list">
          {loading ? <p className="empty-state">Loading chats…</p> : filteredSessions.length ? filteredSessions.map((session) => (
            <button className={`messenger-session-item ${session.id === selectedSessionId ? "active" : ""}`} type="button" key={session.id} onClick={() => selectSession(session.id)}>
              <span className="messenger-avatar"><UserRound size={22} /></span>
              <div className="messenger-session-copy">
                <strong>{formatChatSessionTitle(session)}</strong>
                <span>{session.channel} · {session.status}</span>
              </div>
              <time>{formatShortChatTime(session.lastMessageAt || session.createdAt)}</time>
            </button>
          )) : <p className="empty-state">No chats found.</p>}
        </div>
      </aside>

      <main className="messenger-thread-panel">
        <header className="messenger-thread-head">
          {selectedSession ? (
            <>
              <div className="messenger-avatar large"><UserRound size={25} /></div>
              <div><strong>{formatChatSessionTitle(selectedSession)}</strong><span>{selectedSession.channel} · Session {selectedSession.id.slice(0, 8)}</span></div>
            </>
          ) : <div><strong>No conversation selected</strong><span>Select a chat from the inbox.</span></div>}
        </header>
        <div className="messenger-thread-body">
          {messages.length ? messages.map((message) => (
            <div className={`messenger-bubble-row ${message.sender}`} key={message.id}>
              {message.sender !== "patient" && <span className="mini-avatar">{message.sender === "assistant" ? "AI" : "S"}</span>}
              <div className="messenger-bubble">
                <p>{message.body}</p>
                <span>{message.sender} · {formatAppointmentTime(message.createdAt)}</span>
              </div>
            </div>
          )) : <div className="messenger-empty-thread"><MessageSquareText size={42} /><h3>No messages selected</h3><p>Choose a patient conversation to view the transcript.</p></div>}
        </div>
      </main>

      <aside className="messenger-details-panel">
        <div className="details-profile-card">
          <div className="messenger-avatar xlarge"><UserRound size={38} /></div>
          <h3>{selectedSession ? formatChatSessionTitle(selectedSession) : "Chat details"}</h3>
          <span>{selectedSession?.status || "No session"}</span>
        </div>
        <div className="details-stat-grid">
          <div><strong>{messages.length}</strong><span>Total messages</span></div>
          <div><strong>{patientMessages}</strong><span>Patient</span></div>
          <div><strong>{assistantMessages}</strong><span>Assistant</span></div>
          <div><strong>{selectedSession ? formatShortChatTime(selectedSession.lastMessageAt || selectedSession.createdAt) : "—"}</strong><span>Last active</span></div>
        </div>
        <div className="details-info-list">
          <div><span>Channel</span><strong>{selectedSession?.channel || "—"}</strong></div>
          <div><span>Session ID</span><strong>{selectedSession?.id.slice(0, 13) || "—"}</strong></div>
          <div><span>Started</span><strong>{selectedSession ? formatAppointmentTime(selectedSession.createdAt) : "—"}</strong></div>
          <div><span>Last message</span><strong>{lastMessage ? formatAppointmentTime(lastMessage.createdAt) : "—"}</strong></div>
        </div>
      </aside>
    </section>
  );
}

function formatShortChatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatChatSessionTitle(session: ChatSessionRow) {
  if (session.emergencyFlag) return "Urgent patient chat";
  if (session.handoffRequested) return "Handoff requested";
  return `Patient chat ${session.id.slice(0, 8)}`;
}

function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Loading clinic knowledge…");
  const [form, setForm] = useState({ title: "", sourceType: "faq", content: "", sourceUrl: "" });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [existingAttachmentPath, setExistingAttachmentPath] = useState("");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const approvedCount = documents.filter((source) => source.status === "approved" || source.status === "indexed").length;
  const filteredDocuments = documents.filter((source) => {
    const matchesSearch = [source.title, source.sourceType, source.status, source.content].join(" ").toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = sourceFilter === "all" || source.sourceType === sourceFilter || source.status === sourceFilter;
    return matchesSearch && matchesFilter;
  });

  async function loadDocuments() {
    const clinicId = getWorkspaceSelection().clinicId;
    if (!supabase || !clinicId) {
      setDocuments([]);
      setLoading(false);
      setStatus("Choose or create a clinic first.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("id,title,source_type,content,status,updated_at,file_path")
      .eq("clinic_id", clinicId)
      .order("updated_at", { ascending: false });

    if (error) {
      setStatus(`Failed to load knowledge: ${error.message}`);
      setLoading(false);
      return;
    }

    setDocuments((data || []).map((row) => ({
      id: row.id,
      title: row.title,
      sourceType: row.source_type,
      content: row.content || "",
      status: row.status,
      updatedAt: row.updated_at,
      filePath: row.file_path || undefined,
    })));
    setStatus(`${data?.length || 0} source${data?.length === 1 ? "" : "s"} ready for receptionist answers.`);
    setLoading(false);
  }

  useEffect(() => {
    void loadDocuments();
    return subscribeWorkspaceSelection(() => void loadDocuments());
  }, []);

  function openAddSource() {
    setEditingSourceId(null);
    setAttachmentFile(null);
    setExistingAttachmentPath("");
    setForm({ title: "", sourceType: "faq", content: "", sourceUrl: "" });
    setCreateModalOpen(true);
  }

  function openEditSource(source: KnowledgeDocument) {
    setEditingSourceId(source.id);
    setAttachmentFile(null);
    setExistingAttachmentPath(source.filePath || "");
    setForm({ title: source.title, sourceType: source.sourceType, content: source.content, sourceUrl: source.filePath || "" });
    setCreateModalOpen(true);
  }

  async function addDocument(event: FormEvent) {
    event.preventDefault();
    const clinicId = getWorkspaceSelection().clinicId;
    if (!supabase || !clinicId) return setStatus("Choose a clinic before adding knowledge.");
    if (!form.title.trim()) return setStatus("Title is required.");
    if (!form.content.trim() && !attachmentFile && !existingAttachmentPath) return setStatus("Add content or attach a document.");

    setSaving(true);
    let nextFilePath = existingAttachmentPath || "";
    if (attachmentFile) {
      const safeName = attachmentFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const uploadPath = `${clinicId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("knowledge-documents").upload(uploadPath, attachmentFile, { upsert: false, contentType: attachmentFile.type || undefined });
      if (uploadError) {
        setStatus(`Attachment upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      nextFilePath = uploadPath;
    }

    const payload = {
      title: form.title.trim(),
      source_type: form.sourceType,
      content: form.content.trim() || (nextFilePath ? `Attached document: ${attachmentFile?.name || nextFilePath.split("/").pop()}` : ""),
      source_url: form.sourceUrl.trim() || null,
      file_path: nextFilePath || null,
      status: "approved",
    };
    const { error } = editingSourceId
      ? await supabase.from("knowledge_documents").update(payload).eq("id", editingSourceId).eq("clinic_id", clinicId)
      : await supabase.from("knowledge_documents").insert({ clinic_id: clinicId, ...payload });

    if (error) setStatus(`${editingSourceId ? "Update" : "Add"} source failed: ${error.message}`);
    else {
      setForm({ title: "", sourceType: "faq", content: "", sourceUrl: "" });
      setAttachmentFile(null);
      setExistingAttachmentPath("");
      setEditingSourceId(null);
      setCreateModalOpen(false);
      setStatus(editingSourceId ? "Knowledge source updated and approved." : "Knowledge source added and approved.");
      await loadDocuments();
    }
    setSaving(false);
  }

  async function updateDocumentStatus(id: string, nextStatus: string) {
    if (!supabase) return;
    const { error } = await supabase.from("knowledge_documents").update({ status: nextStatus }).eq("id", id);
    if (error) setStatus(`Update failed: ${error.message}`);
    else await loadDocuments();
  }

  async function deleteDocument(source: KnowledgeDocument) {
    if (!supabase) return;
    const confirmed = window.confirm(`Delete knowledge source “${source.title}”?`);
    if (!confirmed) return;
    const clinicId = getWorkspaceSelection().clinicId;
    const { error } = await supabase.from("knowledge_documents").delete().eq("id", source.id).eq("clinic_id", clinicId);
    if (error) setStatus(`Delete failed: ${error.message}`);
    else {
      setStatus("Knowledge source deleted.");
      await loadDocuments();
    }
  }

  return (
    <section className="knowledge-modern-page">
      <div className="knowledge-hero-card">
        <div className="knowledge-hero-icon"><DatabaseZap size={34} /></div>
        <div>
          <span className="badge teal"><Sparkles size={14} /> Approved clinic knowledge</span>
          <h1>Knowledge base</h1>
          <p>Manage the verified FAQs, policies, services, prices, and notes your AI receptionist can use in patient chats.</p>
        </div>
        <button className="primary-button" type="button" onClick={openAddSource}><Plus size={17} /> Add source</button>
      </div>

      <section className="knowledge-command-grid">
        <div className="knowledge-summary-card primary">
          <p className="eyebrow">Answer safety</p>
          <h2>Approved sources only</h2>
          <span>Receptionist answers clinic-specific questions from this directory and avoids diagnosis or prescriptions.</span>
        </div>
        <div className="knowledge-metric-grid">
          <div><strong>{documents.length}</strong><span>Total sources</span></div>
          <div><strong>{approvedCount}</strong><span>Approved/indexed</span></div>
          <div><strong>{filteredDocuments.length}</strong><span>Visible records</span></div>
          <div><strong>{new Set(documents.map((source) => source.sourceType)).size}</strong><span>Source types</span></div>
        </div>
      </section>

      <section className="knowledge-directory-shell">
        <div className="knowledge-directory-table">
          <div className="knowledge-directory-intro">
            <div>
              <p className="eyebrow">Knowledge directory</p>
              <h2>Manage sources</h2>
              <span>{status}</span>
            </div>
          </div>
          <div className="knowledge-directory-controls">
            <label className="knowledge-directory-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, type, status, content…" /></label>
            <label className="knowledge-directory-filter">Filter<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">All sources</option><option value="approved">Approved</option><option value="indexed">Indexed</option><option value="draft">Draft</option><option value="faq">FAQ</option><option value="service">Service</option><option value="policy">Policy</option><option value="document">Document</option><option value="website">Website</option><option value="note">Note</option></select></label>
          </div>
          <div className="knowledge-table-head"><span>Source</span><span>Type</span><span>Status</span><span>Actions</span></div>
          {loading ? <p className="empty-state knowledge-table-empty">Loading knowledge…</p> : !filteredDocuments.length ? <p className="empty-state knowledge-table-empty">No knowledge source matched your filters.</p> : filteredDocuments.map((source) => (
            <div className="knowledge-table-row" key={source.id}>
              <div className="knowledge-table-source"><span className="knowledge-source-avatar"><FileText size={18} /></span><div><strong>{source.title}</strong><span>{source.filePath ? `Attachment: ${source.filePath.split("/").pop()} · ` : ""}{source.content.slice(0, 130)}{source.content.length > 130 ? "…" : ""}</span></div></div>
              <div><span className="knowledge-type-pill">{source.sourceType}</span></div>
              <div><span className={`badge ${source.status === "approved" || source.status === "indexed" ? "green" : "amber"}`}>{source.status}</span></div>
              <div className="knowledge-table-actions"><button type="button" title="Update" aria-label={`Update ${source.title}`} onClick={() => openEditSource(source)}><Pencil size={15} /></button><button className={`status-toggle ${source.status === "approved" ? "active" : "draft"}`} type="button" title={source.status === "approved" ? "Move to draft" : "Approve"} aria-label={`${source.status === "approved" ? "Move to draft" : "Approve"} ${source.title}`} onClick={() => updateDocumentStatus(source.id, source.status === "approved" ? "draft" : "approved")}>{source.status === "approved" ? <CircleDashed size={15} /> : <Check size={15} />}</button><button className="danger" type="button" title="Delete" aria-label={`Delete ${source.title}`} onClick={() => void deleteDocument(source)}><Trash2 size={15} /></button></div>
            </div>
          ))}
        </div>
        <aside className="knowledge-config-card">
          <div className="knowledge-config-icon"><ShieldCheck size={24} /></div>
          <h3>RAG configuration</h3>
          <ConfigList items={[["Answer mode", "Approved sources only"], ["Source types", "FAQ, service, policy, website, note"], ["Live chat lookup", "Uses active clinic knowledge"], ["Knowledge gaps", "Tell patient to contact clinic"]]} />
        </aside>
      </section>
      {createModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add knowledge source">
          <div className="prompt-modal create-modal">
            <div className="prompt-modal-header">
              <div><p className="eyebrow">Knowledge Base</p><h2>{editingSourceId ? "Update source" : "Add approved source"}</h2></div>
              <button className="ghost-button" type="button" onClick={() => { setCreateModalOpen(false); setEditingSourceId(null); }}>Close</button>
            </div>
            <form className="kb-form modal-form" onSubmit={addDocument}>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Source title, e.g. Dental cleaning pricing" />
              <select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })}>
                <option value="faq">FAQ</option>
                <option value="service">Service</option>
                <option value="policy">Policy</option>
                <option value="document">Document</option>
                <option value="website">Website</option>
                <option value="note">Note</option>
              </select>
              <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Paste approved clinic answer/content here…" />
              <input value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="Optional source URL" />
              <label className="knowledge-attachment-drop">Attachment<input type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv" onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)} /><span>{attachmentFile ? attachmentFile.name : existingAttachmentPath ? `Current: ${existingAttachmentPath.split("/").pop()}` : "Attach PDF, DOC, DOCX, TXT, MD, CSV, etc."}</span></label>
              <button className="primary-button" disabled={saving} type="submit">{saving ? "Saving…" : editingSourceId ? "Update source" : "Add approved source"}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}


function BookingRequestPage() {
  const { clinicId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId") || "";
  const today = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today));
  const [selectedTime, setSelectedTime] = useState("");
  const [step, setStep] = useState<"schedule" | "details">("schedule");
  const [form, setForm] = useState({ patientName: "", contact: "", service: "", note: "" });
  const [status, setStatus] = useState("Choose your preferred date and time. Clinic staff will confirm availability.");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const availableDays = useMemo(() => buildAvailableDays(calendarMonth, today), [calendarMonth, today]);
  const selectedDateLabel = formatLongDate(selectedDate);
  const selectedDateTimeLabel = selectedTime ? `${selectedTime}, ${selectedDateLabel}` : selectedDateLabel;
  const requestedAt = selectedTime ? buildDateTimeValue(selectedDate, selectedTime) : "";

  async function submitAppointment(event: FormEvent) {
    event.preventDefault();
    if (!clinicId) return setStatus("Missing clinic ID.");
    if (!selectedTime) return setStatus("Please choose a time slot first.");
    if (!form.patientName.trim() || !form.contact.trim() || !form.service.trim()) {
      return setStatus("Please complete name, contact, and service requested.");
    }

    setSaving(true);
    setStatus("Submitting appointment request…");
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const endpoint = import.meta.env.DEV ? "/stormeai-local-appointment" : `${String(supabaseUrl).replace(/\/$/, "")}/functions/v1/public-appointment`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": import.meta.env.DEV ? "text/plain;charset=UTF-8" : "application/json" },
        body: JSON.stringify({ clinicId, sessionId, ...form, requestedAt }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Appointment request failed.");
      setSubmitted(true);
      setStatus("Appointment request sent. Clinic staff will confirm availability.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="booking-page calendly-inspired-page">
      <section className="booking-shell">
        <aside className="booking-summary-panel">
          {step === "details" && !submitted && <button className="booking-back-button" type="button" onClick={() => setStep("schedule")}>←</button>}
          <div className="booking-avatar"><span className="robot-hero-emoji" aria-hidden="true">🤖</span></div>
          <p className="booking-host">StormeAI Receptionist</p>
          <h1>Clinic appointment request</h1>
          <div className="booking-meta-list">
            <div><CalendarCheck size={22} /><span>15 min request window</span></div>
            <div><MessageSquareText size={22} /><span>Started from AI chat session</span></div>
            {selectedTime && <div><CalendarCheck size={22} /><span>{selectedDateTimeLabel}</span></div>}
            <div><Globe2 size={22} /><span>Philippine Time</span></div>
          </div>
          <p className="booking-summary-note">Choose a preferred slot and send your details. This does not confirm the appointment yet — clinic staff will review and contact you.</p>
          <div className="booking-footer-links"><span>StormeAI</span><span>No diagnosis · Staff confirmation required</span></div>
        </aside>

        <section className="booking-main-panel">
          {submitted ? (
            <div className="booking-success-state"><Check size={42} /><p className="eyebrow">Request received</p><h2>Clinic staff will confirm your appointment.</h2><p>{status}</p></div>
          ) : step === "schedule" ? (
            <>
              <div className="booking-section-heading"><p className="eyebrow">Select a Date & Time</p><h2>{formatMonthYear(calendarMonth)}</h2></div>
              <div className="booking-scheduler-grid">
                <div className="booking-calendar-card">
                  <div className="booking-calendar-nav">
                    <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}>‹</button>
                    <strong>{formatMonthYear(calendarMonth)}</strong>
                    <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>›</button>
                  </div>
                  <div className="booking-weekdays">{["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => <span key={day}>{day}</span>)}</div>
                  <div className="booking-calendar-grid">
                    {buildCalendarCells(calendarMonth).map((date, index) => date ? (
                      <button
                        type="button"
                        key={formatDateKey(date)}
                        className={`${availableDays.has(formatDateKey(date)) ? "available" : ""} ${selectedDate === formatDateKey(date) ? "selected" : ""}`}
                        disabled={!availableDays.has(formatDateKey(date))}
                        onClick={() => { setSelectedDate(formatDateKey(date)); setSelectedTime(""); }}
                      >{date.getDate()}</button>
                    ) : <span key={`empty-${index}`} />)}
                  </div>
                  <div className="booking-timezone"><strong>Time zone</strong><span><Globe2 size={18} /> Philippine Time ({formatCurrentTime()})</span></div>
                </div>

                <div className="booking-slots-card">
                  <h3>{selectedDateLabel}</h3>
                  <div className="booking-slot-list">
                    {BOOKING_TIME_SLOTS.map((slot) => <button className={selectedTime === slot ? "selected" : ""} type="button" key={slot} onClick={() => setSelectedTime(slot)}>{slot}</button>)}
                  </div>
                  <button className="primary-button booking-next-button" disabled={!selectedTime} type="button" onClick={() => setStep("details")}>Next <ArrowRight size={16} /></button>
                </div>
              </div>
            </>
          ) : (
            <form className="booking-details-form" onSubmit={submitAppointment}>
              <div className="booking-section-heading"><p className="eyebrow">Enter Details</p><h2>Almost done</h2><span>{selectedDateTimeLabel}</span></div>
              <label>Name *<input value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} placeholder="Juan Dela Cruz" /></label>
              <label>Phone or email *<input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="0917 123 4567 or email@example.com" /></label>
              <label>Service requested *<input value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} placeholder="Dental cleaning, consultation, etc." /></label>
              <label>Please share anything that will help staff prepare<textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Optional notes. For emergencies, call emergency services or go to the nearest ER." /></label>
              {sessionId && <p className="booking-linked-chat">Linked to your AI chat session.</p>}
              <p className="booking-terms">By proceeding, you agree that this is an appointment request only and staff confirmation is required.</p>
              <button className="primary-button booking-submit-button" disabled={saving} type="submit">{saving ? "Submitting…" : "Schedule request"}</button>
              <p className="empty-state">{status}</p>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}

const BOOKING_TIME_SLOTS = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM"];

function buildCalendarCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const cells: Array<Date | null> = Array.from({ length: first.getDay() }, () => null);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= days; day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  return cells;
}

function buildAvailableDays(month: Date, today: Date) {
  const days = new Set<string>();
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= total; day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!isPast && date.getDay() !== 0) days.add(formatDateKey(date));
  }
  return days;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatLongDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildDateTimeValue(dateKey: string, timeLabel: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const match = timeLabel.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hour = Number(match?.[1] || 9);
  const minute = Number(match?.[2] || 0);
  const meridiem = match?.[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatCurrentTime() {
  return new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Loading appointments…");
  const [form, setForm] = useState({ patientName: "", contact: "", service: "", requestedAt: "", note: "" });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const requestedCount = appointments.filter((appointment) => appointment.status === "requested").length;
  const confirmedCount = appointments.filter((appointment) => appointment.status === "confirmed").length;
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = [appointment.patientName, appointment.patientContact, appointment.service, appointment.time, appointment.status, appointment.note].join(" ").toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = appointmentFilter === "all" || appointment.status === appointmentFilter;
    return matchesSearch && matchesFilter;
  });

  async function loadAppointments() {
    const clinicId = getWorkspaceSelection().clinicId;
    if (!supabase || !clinicId) {
      setAppointments([]);
      setLoading(false);
      setStatus("Choose or create a clinic first.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id,status,requested_start_at,scheduled_start_at,patient_note,staff_note,source,patients(full_name,email,phone),services(name)")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`Failed to load appointments: ${error.message}`);
      setLoading(false);
      return;
    }

    setAppointments((data || []).map((row: any) => ({
      id: row.id,
      patientName: row.patients?.full_name || "Unknown patient",
      patientContact: row.patients?.phone || row.patients?.email || "No contact yet",
      service: row.services?.name || row.patient_note?.split("\n")[0]?.replace("Service: ", "") || "Service request",
      time: formatAppointmentTime(row.scheduled_start_at || row.requested_start_at),
      status: row.status,
      note: row.staff_note || row.patient_note || "",
    })));
    setStatus(`${data?.length || 0} appointment request${data?.length === 1 ? "" : "s"}.`);
    setLoading(false);
  }

  useEffect(() => {
    void loadAppointments();
    return subscribeWorkspaceSelection(() => void loadAppointments());
  }, []);

  async function createAppointment(event: FormEvent) {
    event.preventDefault();
    const clinicId = getWorkspaceSelection().clinicId;
    if (!supabase || !clinicId) return setStatus("Choose a clinic before creating appointments.");
    if (!form.patientName.trim() || !form.service.trim()) return setStatus("Patient name and service are required.");

    setSaving(true);
    const contact = form.contact.trim();
    const { data: patient, error: patientError } = await supabase.from("patients").insert({
      clinic_id: clinicId,
      full_name: form.patientName.trim(),
      email: contact.includes("@") ? contact : null,
      phone: contact && !contact.includes("@") ? contact : null,
    }).select("id").single();

    if (patientError) {
      setStatus(`Patient create failed: ${patientError.message}`);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("appointments").insert({
      clinic_id: clinicId,
      patient_id: patient.id,
      status: "requested",
      requested_start_at: form.requestedAt ? new Date(form.requestedAt).toISOString() : null,
      patient_note: [`Service: ${form.service.trim()}`, form.note.trim()].filter(Boolean).join("\n"),
      source: "admin",
    });

    if (error) setStatus(`Appointment create failed: ${error.message}`);
    else {
      setForm({ patientName: "", contact: "", service: "", requestedAt: "", note: "" });
      setCreateModalOpen(false);
      setStatus("Appointment request created.");
      await loadAppointments();
    }
    setSaving(false);
  }

  async function updateAppointmentStatus(id: string, nextStatus: string) {
    if (!supabase) return;
    const { error } = await supabase.from("appointments").update({ status: nextStatus }).eq("id", id);
    if (error) setStatus(`Status update failed: ${error.message}`);
    else await loadAppointments();
  }

  return (
    <section className="appointments-modern-page">
      <div className="appointments-hero-card">
        <div className="appointments-hero-icon"><CalendarCheck size={34} /></div>
        <div>
          <span className="badge teal"><Sparkles size={14} /> Booking request inbox</span>
          <h1>Appointments</h1>
          <p>Review patient booking requests, confirm schedules, and keep every receptionist-created appointment organized.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setCreateModalOpen(true)}><Plus size={17} /> Create request</button>
      </div>

      <section className="appointments-command-grid">
        <div className="appointments-summary-card primary">
          <p className="eyebrow">Scheduling workflow</p>
          <h2>Staff approval required</h2>
          <span>StormeAI collects requests through the booking flow. Staff review, confirm, reschedule, or complete them here.</span>
        </div>
        <div className="appointments-metric-grid">
          <div><strong>{appointments.length}</strong><span>Total requests</span></div>
          <div><strong>{requestedCount}</strong><span>Needs review</span></div>
          <div><strong>{confirmedCount}</strong><span>Confirmed</span></div>
          <div><strong>{filteredAppointments.length}</strong><span>Visible records</span></div>
        </div>
      </section>

      <section className="appointments-directory-shell">
        <div className="appointments-directory-table">
          <div className="appointments-directory-intro">
            <div>
              <p className="eyebrow">Appointment directory</p>
              <h2>Manage bookings</h2>
              <span>{status}</span>
            </div>
          </div>
          <div className="appointments-directory-controls">
            <label className="appointments-directory-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, service, contact, note…" /></label>
            <label className="appointments-directory-filter">Filter<select value={appointmentFilter} onChange={(event) => setAppointmentFilter(event.target.value)}><option value="all">All appointments</option><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="rescheduled">Rescheduled</option><option value="canceled">Canceled</option><option value="completed">Completed</option><option value="no_show">No-show</option></select></label>
          </div>
          <AppointmentTable rows={filteredAppointments} loading={loading} onStatusChange={updateAppointmentStatus} />
        </div>
        <aside className="appointments-config-card">
          <div className="appointments-config-icon"><ClipboardList size={24} /></div>
          <h3>Scheduling rules</h3>
          <ConfigList items={[["Default status", "Requested"], ["Staff approval", "Required"], ["Required fields", "Name, contact, service, time"], ["Confirmation", "Manual staff confirmation"]]} />
        </aside>
      </section>
      {createModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create appointment request">
          <div className="prompt-modal create-modal">
            <div className="prompt-modal-header">
              <div><p className="eyebrow">Appointments</p><h2>Create request</h2></div>
              <button className="ghost-button" type="button" onClick={() => setCreateModalOpen(false)}>Close</button>
            </div>
            <form className="appointment-form modal-form" onSubmit={createAppointment}>
              <input value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} placeholder="Patient name" />
              <input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="Phone or email" />
              <input value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} placeholder="Service requested" />
              <input type="datetime-local" value={form.requestedAt} onChange={(event) => setForm({ ...form, requestedAt: event.target.value })} />
              <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Optional patient/staff note" />
              <button className="primary-button" disabled={saving} type="submit">{saving ? "Creating…" : "Create request"}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}


type MarketingContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastService: string;
  lastVisit: string;
  appointmentCount: number;
};

type MarketingAttachment = { filename: string; content: string; contentType?: string; size: number };

function MarketingPage() {
  const [contacts, setContacts] = useState<MarketingContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("Loading appointment contacts…");
  const [composerOpen, setComposerOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState("all");
  const [campaign, setCampaign] = useState({
    channel: "email",
    audience: "all",
    fromName: "StormeAI Clinic",
    replyTo: "",
    subject: "Clinic promo",
    message: "Hi! We have a new clinic promo/notice. Reply here or contact the clinic to learn more.",
    includeFooter: true,
  });
  const [attachments, setAttachments] = useState<MarketingAttachment[]>([]);

  async function loadContacts() {
    const clinicId = getWorkspaceSelection().clinicId;
    if (!supabase || !clinicId) {
      setContacts([]);
      setSelectedIds([]);
      setLoading(false);
      setStatus("Choose a clinic first.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id,patient_note,created_at,requested_start_at,scheduled_start_at,patients(id,full_name,email,phone)")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`Failed to load marketing contacts: ${error.message}`);
      setLoading(false);
      return;
    }

    const byKey = new Map<string, MarketingContact>();
    (data || []).forEach((row: any) => {
      const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
      const email = String(patient?.email || "").trim();
      const phone = String(patient?.phone || "").trim();
      const key = patient?.id || email || phone;
      if (!key || (!email && !phone)) return;
      const service = String(row.patient_note || "").split("\n")[0]?.replace("Service: ", "") || "Appointment patient";
      const existing = byKey.get(String(key));
      if (existing) {
        existing.appointmentCount += 1;
        return;
      }
      byKey.set(String(key), {
        id: String(key),
        name: patient?.full_name || "Patient",
        email,
        phone,
        lastService: service,
        lastVisit: row.scheduled_start_at || row.requested_start_at || row.created_at,
        appointmentCount: 1,
      });
    });

    const nextContacts = Array.from(byKey.values());
    setContacts(nextContacts);
    setSelectedIds(nextContacts.map((contact) => contact.id));
    setStatus(`${nextContacts.length} previous patient contact${nextContacts.length === 1 ? "" : "s"} loaded from appointments.`);
    setLoading(false);
  }

  useEffect(() => {
    void loadContacts();
    return subscribeWorkspaceSelection(() => void loadContacts());
  }, []);

  const searchedContacts = contacts.filter((contact) => {
    const matchesSearch = [contact.name, contact.email, contact.lastService].join(" ").toLowerCase().includes(patientSearch.trim().toLowerCase());
    const matchesFilter = patientFilter === "all" || (patientFilter === "email" ? Boolean(contact.email) : selectedIds.includes(contact.id));
    return matchesSearch && matchesFilter;
  });
  const emailContacts = contacts.filter((contact) => contact.email);
  const selectedContacts = contacts.filter((contact) => selectedIds.includes(contact.id));
  const selectedEmailContacts = selectedContacts.filter((contact) => contact.email);

  function toggleContact(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function loadAttachments(files: FileList | null) {
    if (!files?.length) return;
    const next = await Promise.all(Array.from(files).slice(0, 5).map(async (file) => ({
      filename: file.name,
      contentType: file.type || undefined,
      size: file.size,
      content: await fileToBase64(file),
    })));
    setAttachments(next);
  }

  async function sendEmailCampaign() {
    const clinicId = getWorkspaceSelection().clinicId;
    if (!supabase || !clinicId) return setStatus("Choose a clinic first.");
    if (!selectedEmailContacts.length) return setStatus("Select at least one patient with an email address.");
    if (!campaign.subject.trim() || !campaign.message.trim()) return setStatus("Subject and message are required.");

    setSending(true);
    setStatus("Sending campaign with Resend…");
    const payload = {
      clinicId,
      to: selectedEmailContacts.map((contact) => contact.email),
      subject: campaign.subject,
      body: campaign.includeFooter ? `${campaign.message}\n\n— Sent by the clinic via StormeAI` : campaign.message,
      fromName: campaign.fromName,
      replyTo: campaign.replyTo || undefined,
      attachments,
    };
    const { data: sessionData } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(`${String(supabaseUrl).replace(/\/$/, "")}/functions/v1/send-marketing-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
        ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const resendMessage = data?.result?.message || data?.result?.error || data?.result?.name;
      setStatus(`Send failed: ${data?.error || resendMessage || response.statusText}`);
    } else {
      setStatus(`Campaign sent to ${data?.sent || selectedEmailContacts.length} email recipient${selectedEmailContacts.length === 1 ? "" : "s"}.`);
      setComposerOpen(false);
    }
    setSending(false);
  }

  return (
    <section className="marketing-modern-page">
      <div className="marketing-hero-card-modern">
        <div className="marketing-hero-icon"><Megaphone size={34} /></div>
        <div>
          <span className="badge teal"><Sparkles size={14} /> Previous patient campaigns</span>
          <h1>Marketing</h1>
          <p>Build email campaigns with Resend and target previous patients from appointment history.</p>
        </div>
        <button className="primary-button" type="button" disabled={!contacts.length} onClick={() => setComposerOpen(true)}><Plus size={17} /> Create campaign</button>
      </div>

      <section className="marketing-command-grid-modern">
        <div className="marketing-summary-card-modern primary">
          <p className="eyebrow">Campaign workflow</p>
          <h2>Email via Resend</h2>
          <span>Send promos, clinic notices, and reminders to previous patients using verified email contacts and Resend delivery.</span>
        </div>
        <div className="marketing-metric-grid-modern">
          <div><strong>{contacts.length}</strong><span>Total contacts</span></div>
          <div><strong>{selectedIds.length}</strong><span>Selected patients</span></div>
          <div><strong>{emailContacts.length}</strong><span>Email-ready</span></div>
          <div><strong>{searchedContacts.length}</strong><span>Visible contacts</span></div>
        </div>
      </section>

      <section className="marketing-directory-shell-modern">
        <div className="marketing-directory-table-modern">
          <div className="marketing-directory-intro-modern">
            <div>
              <p className="eyebrow">Patient marketing directory</p>
              <h2>Manage audience</h2>
              <span>{status}</span>
            </div>
          </div>
          <div className="marketing-directory-controls-modern">
            <label className="marketing-directory-search-modern"><Search size={17} /><input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Search patient, email, service…" /></label>
            <label className="marketing-directory-filter-modern">Filter<select value={patientFilter} onChange={(event) => setPatientFilter(event.target.value)}><option value="all">All contacts</option><option value="selected">Selected</option><option value="email">Has email</option></select></label>
          </div>
          <div className="marketing-selection-bar-modern">
            <span>{selectedIds.length} selected · {selectedEmailContacts.length} email-ready</span>
            <div><button type="button" onClick={() => setSelectedIds(contacts.map((contact) => contact.id))}>Select all</button><button type="button" onClick={() => setSelectedIds([])}>Clear</button></div>
          </div>
          <div className="marketing-table-head-modern"><span>Patient</span><span>Reach</span><span>History</span><span>Select</span></div>
          {loading ? <p className="empty-state marketing-table-empty-modern">Loading patients…</p> : searchedContacts.length ? searchedContacts.map((contact) => (
            <label className="marketing-table-row-modern" key={contact.id}>
              <div className="marketing-table-patient-modern"><span className="marketing-patient-avatar-modern"><UserRound size={26} /></span><div><strong>{contact.name}</strong><span>{contact.lastService}</span></div></div>
              <div className="marketing-table-reach-modern"><span>{contact.email || "No email"}</span></div>
              <div className="marketing-table-history-modern"><strong>{contact.appointmentCount}</strong><span>{formatAppointmentTime(contact.lastVisit)}</span></div>
              <div className="marketing-table-check-modern"><input type="checkbox" checked={selectedIds.includes(contact.id)} onChange={() => toggleContact(contact.id)} /></div>
            </label>
          )) : <p className="empty-state marketing-table-empty-modern">No previous patient details matched your filters.</p>}
        </div>
        <aside className="marketing-config-card-modern">
          <div className="marketing-config-icon-modern"><Users size={24} /></div>
          <h3>Campaign center</h3>
          <ConfigList items={[["Email recipients", String(selectedEmailContacts.length)], ["Email provider", "Resend"], ["Attachments", `${attachments.length}/5 files`], ["Audience source", "Appointment history"]]} />
          <div className="marketing-side-actions-modern">
            <button className="primary-button" type="button" disabled={!contacts.length} onClick={() => setComposerOpen(true)}>Create campaign</button>
          </div>
        </aside>
      </section>

      {composerOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create marketing campaign">
          <div className="prompt-modal create-modal marketing-modal campaign-composer-modal">
            <div className="campaign-composer-hero">
              <div className="campaign-composer-icon"><Megaphone size={28} /></div>
              <div>
                <p className="eyebrow">Marketing campaign</p>
                <h2>Create promo, discount, or notice</h2>
                <span>Email-only delivery through Resend · {selectedEmailContacts.length} selected recipient{selectedEmailContacts.length === 1 ? "" : "s"}</span>
              </div>
              <button className="ghost-button" type="button" onClick={() => setComposerOpen(false)}>Close</button>
            </div>
            <form className="marketing-form modal-form campaign-composer-form" onSubmit={(event) => event.preventDefault()}>
              <section className="campaign-composer-main">
                <div className="campaign-compose-card">
                  <div className="campaign-card-heading"><span>1</span><div><strong>Delivery setup</strong><p>Choose sender details and recipient scope.</p></div></div>
                  <div className="campaign-grid modern">
                    <label>Channel<select value={campaign.channel} onChange={(event) => setCampaign({ ...campaign, channel: event.target.value })}><option value="email">Email via Resend</option></select></label>
                    <label>Audience<select value={campaign.audience} onChange={(event) => setCampaign({ ...campaign, audience: event.target.value })}><option value="all">All selected patients</option><option value="email-only">Patients with email</option></select></label>
                    <label>From name<input value={campaign.fromName} onChange={(event) => setCampaign({ ...campaign, fromName: event.target.value })} placeholder="Clinic name" /></label>
                    <label>Reply-to email<input value={campaign.replyTo} onChange={(event) => setCampaign({ ...campaign, replyTo: event.target.value })} placeholder="clinic@example.com" /></label>
                  </div>
                </div>

                <div className="campaign-compose-card">
                  <div className="campaign-card-heading"><span>2</span><div><strong>Message content</strong><p>Write a clear clinic-approved email.</p></div></div>
                  <label>Subject<input value={campaign.subject} onChange={(event) => setCampaign({ ...campaign, subject: event.target.value })} placeholder="Summer cleaning discount" /></label>
                  <label>Body<textarea value={campaign.message} onChange={(event) => setCampaign({ ...campaign, message: event.target.value })} placeholder="Write your promo, discount, or clinic notice…" /></label>
                  <label className="attachment-drop modern-drop"><input type="file" multiple onChange={(event) => void loadAttachments(event.target.files)} /><span>{attachments.length ? attachments.map((file) => file.filename).join(", ") : "Drop or choose promo image/PDF · optional up to 5 files"}</span></label>
                  <label className="checkbox-row modern-checkbox"><input type="checkbox" checked={campaign.includeFooter} onChange={(event) => setCampaign({ ...campaign, includeFooter: event.target.checked })} /> Include StormeAI clinic footer</label>
                </div>
              </section>

              <aside className="campaign-preview-panel">
                <div className="campaign-preview-top">
                  <span className="badge teal">Live preview</span>
                  <strong>{selectedEmailContacts.length} recipients</strong>
                </div>
                <div className="campaign-email-preview">
                  <div><span>From</span><strong>{campaign.fromName || "Clinic"}</strong></div>
                  <div><span>Subject</span><strong>{campaign.subject || "Untitled campaign"}</strong></div>
                  <p>{campaign.message}</p>
                  {campaign.includeFooter && <small>— Sent by the clinic via StormeAI</small>}
                </div>
                <div className="campaign-send-card">
                  <ConfigList items={[["Provider", "Resend"], ["Recipients", String(selectedEmailContacts.length)], ["Attachments", `${attachments.length}/5`]]} />
                  <button className="primary-button" type="button" disabled={sending || !selectedEmailContacts.length} onClick={() => void sendEmailCampaign()}>{sending ? "Sending…" : `Send with Resend (${selectedEmailContacts.length})`}</button>
                </div>
              </aside>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


function IntegrationsPage() {
  const [selectedClinicId, setSelectedClinicId] = useState(getWorkspaceSelection().clinicId || "");
  const [selectedWidgetReceptionistId, setSelectedWidgetReceptionistId] = useState(getWorkspaceSelection().receptionistId || "");
  const [widgetReceptionists, setWidgetReceptionists] = useState<ReceptionistOption[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState("Loading AI receptionists…");
  const [scriptCopied, setScriptCopied] = useState(false);
  const clinicId = selectedClinicId || "CLINIC_UUID";
  const receptionistId = selectedWidgetReceptionistId || "OPTIONAL_RECEPTIONIST_UUID";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://YOUR_SUPABASE_PROJECT.supabase.co";
  const widgetUrl = `${window.location.origin}/stormeai-widget.js`;
  const localChatUrl = `${window.location.origin}/stormeai-local-chat`;
  const localWidgetAttrs = import.meta.env.DEV ? `
  data-chat-mode="local-ollama"
  data-local-chat-url="${localChatUrl}"` : "";
  const snippet = `<script
  async
  src="${widgetUrl}"
  data-api-url="${supabaseUrl}"${localWidgetAttrs}
  data-clinic-id="${clinicId}"
  data-receptionist-id="${receptionistId}"
  data-title="Clinic chat"
  data-greeting="Hi! I’m your clinic AI receptionist. How can I help?">
</script>`;
  const activeWidgetReceptionist = widgetReceptionists.find((item) => item.receptionistId === selectedWidgetReceptionistId);

  async function loadWidgetReceptionists() {
    const selection = getWorkspaceSelection();
    const nextClinicId = selection.clinicId || "";
    setSelectedClinicId(nextClinicId);
    if (!nextClinicId) {
      setWidgetReceptionists([]);
      setSelectedWidgetReceptionistId("");
      setIntegrationStatus("Choose a clinic first, then select an AI receptionist for the widget.");
      return;
    }
    try {
      const items = await listReceptionists(nextClinicId);
      setWidgetReceptionists(items);
      const preferredId = selection.receptionistId && items.some((item) => item.receptionistId === selection.receptionistId) ? selection.receptionistId : items[0]?.receptionistId || "";
      setSelectedWidgetReceptionistId(preferredId);
      if (preferredId) persistWorkspaceSelection({ clinicId: nextClinicId, receptionistId: preferredId });
      setIntegrationStatus(items.length ? `${items.length} AI receptionist${items.length === 1 ? "" : "s"} available for this widget.` : "No AI receptionists found for this clinic yet.");
    } catch (error) {
      setIntegrationStatus(error instanceof Error ? error.message : "Failed to load AI receptionists.");
    }
  }

  useEffect(() => {
    void loadWidgetReceptionists();
    return subscribeWorkspaceSelection(() => void loadWidgetReceptionists());
  }, []);

  async function copyWidgetScript() {
    await navigator.clipboard.writeText(snippet);
    setScriptCopied(true);
    window.setTimeout(() => setScriptCopied(false), 1600);
  }

  function chooseWidgetReceptionist(receptionistId: string) {
    setSelectedWidgetReceptionistId(receptionistId);
    if (selectedClinicId) persistWorkspaceSelection({ clinicId: selectedClinicId, receptionistId });
  }

  return (
    <section className="integrations-modern-page">
      <div className="integrations-hero-card">
        <div className="integrations-hero-icon"><Globe2 size={34} /></div>
        <div>
          <span className="badge teal"><Sparkles size={14} /> Patient channel setup</span>
          <h1>Integrations</h1>
          <p>Connect StormeAI to clinic websites and choose which AI Receptionist powers each embedded widget.</p>
        </div>
        <button className={`primary-button copy-script-button ${scriptCopied ? "copied" : ""}`} type="button" onClick={() => void copyWidgetScript()}>{scriptCopied ? "Copied!" : "Copy widget script"}</button>
      </div>

      <section className="integrations-command-grid">
        <div className="integrations-summary-card primary">
          <p className="eyebrow">Primary channel</p>
          <h2>Website chat widget</h2>
          <span>Pick any AI Receptionist for this clinic, then copy the widget script. The selected receptionist ID is included in the embed.</span>
        </div>
        <div className="integrations-metric-grid">
          <div><strong>1</strong><span>Channel listed</span></div>
          <div><strong>{widgetReceptionists.length}</strong><span>Receptionists</span></div>
          <div><strong>{import.meta.env.DEV ? "Local" : "Cloud"}</strong><span>Widget mode</span></div>
          <div><strong>Chat</strong><span>Receptionist scope</span></div>
        </div>
      </section>

      <section className="integrations-directory-shell">
        <div className="integrations-directory-table">
          <div className="integrations-directory-intro">
            <div>
              <p className="eyebrow">Integration directory</p>
              <h2>Manage channels</h2>
              <span>{integrationStatus}</span>
            </div>
          </div>
          <div className="widget-receptionist-picker">
            <div>
              <p className="eyebrow">Widget AI Receptionist</p>
              <h3>{activeWidgetReceptionist?.name || "Select receptionist"}</h3>
              <span>This receptionist will answer chats from the copied website widget.</span>
            </div>
            <label>Choose receptionist<select value={selectedWidgetReceptionistId} onChange={(event) => chooseWidgetReceptionist(event.target.value)} disabled={!widgetReceptionists.length}>{widgetReceptionists.length ? widgetReceptionists.map((item) => <option key={item.receptionistId} value={item.receptionistId}>{item.name}</option>) : <option value="">No receptionists available</option>}</select></label>
          </div>
          <div className="integrations-table-head"><span>Channel</span><span>Status</span><span>Setup</span><span>Action</span></div>
          <div className="integrations-table-row active">
            <div className="integrations-table-channel"><span className="integrations-channel-avatar"><Globe2 size={20} /></span><div><strong>Website chat widget</strong><span>Embed on the clinic website before the closing body tag.</span></div></div>
            <div><span className="integration-status-pill ready">Ready</span></div>
            <div className="integrations-table-setup"><span>Clinic: {clinicId}</span><span>Receptionist: {activeWidgetReceptionist?.name || receptionistId}</span></div>
            <div className="integrations-table-actions"><button className={scriptCopied ? "copied" : ""} type="button" onClick={() => void copyWidgetScript()}>{scriptCopied ? "Copied" : "Copy script"}</button></div>
          </div>

        </div>

        <aside className="integrations-config-card">
          <div className="integrations-config-icon"><Globe2 size={24} /></div>
          <h3>Website widget</h3>
          <ConfigList items={[["Clinic", clinicId], ["Receptionist", activeWidgetReceptionist?.name || receptionistId], ["Receptionist ID", receptionistId], ["API URL", supabaseUrl], ["Local gateway", import.meta.env.DEV ? "Enabled" : "Production"]]} />
        </aside>
      </section>


    </section>
  );
}

function ClipboardLike({ size = 18 }: { size?: number }) {
  return <FileText size={size} />;
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
      <div className="chat-header"><div className="avatar robot-chat-avatar"><span aria-hidden="true">🤖</span></div><div><strong>AI Receptionist</strong><span>StormeAI receptionist</span></div></div>
      <div className="bubble patient">Do you offer dental cleaning tomorrow?</div>
      <div className="bubble ai">Yes. Dental cleaning is available. Would you like me to collect your preferred time?</div>
      <div className="quick-replies"><span>Morning</span><span>Afternoon</span><span>Ask staff</span></div>
    </div>
  );
}

function ConfigList({ items }: { items: [string, string][] }) {
  return <div className="config-list">{items.map(([label, value]) => <div className="config-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function SourceRow(source: { title: string; meta: string; status: string }) {
  return <div className="source-row"><div><strong>{source.title}</strong><span>{source.meta}</span></div><span className={`badge ${source.status === "Review" ? "amber" : "green"}`}>{source.status}</span></div>;
}

function formatAppointmentTime(value?: string | null) {
  if (!value) return "No preferred time";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function AppointmentTable({ rows, loading, onStatusChange }: { rows: AppointmentInboxRow[]; loading: boolean; onStatusChange: (id: string, status: string) => void }) {
  if (loading) return <p className="empty-state appointments-table-empty">Loading appointments…</p>;
  if (!rows.length) return <p className="empty-state appointments-table-empty">No appointment requests matched your filters.</p>;

  return (
    <div className="appointments-table">
      <div className="appointments-table-head"><span>Patient</span><span>Schedule</span><span>Status</span><span>Update</span></div>
      {rows.map((row) => (
        <div className="appointments-table-row" key={row.id}>
          <div className="appointments-table-patient"><span className="appointments-patient-avatar"><UserRound size={26} /></span><div><strong>{row.patientName}</strong><span>{row.service} · {row.patientContact}</span>{row.note && <em>{row.note}</em>}</div></div>
          <div className="appointments-table-time">{row.time}</div>
          <div><span className={`appointment-status-pill ${row.status}`}>{row.status.replace("_", " ")}</span></div>
          <div className="appointments-table-actions"><select value={row.status} onChange={(event) => onStatusChange(row.id, event.target.value)}><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="rescheduled">Rescheduled</option><option value="canceled">Canceled</option><option value="completed">Completed</option><option value="no_show">No-show</option></select></div>
        </div>
      ))}
    </div>
  );
}

function Bar({ label, value, width }: { label: string; value: string; width: string }) {
  return <div className="bar-row"><div className="bar-label"><span>{label}</span><strong>{value}</strong></div><div className="bar-track"><div style={{ width: `${width}%` }} /></div></div>;
}

export default App;
