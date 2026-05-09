import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Edit3, LayoutDashboard, MapPin, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { createClinicWorkspace, supabase } from "../lib/supabase";
import { listClinicWorkspaces, type ClinicWorkspaceOption } from "../lib/clinicWorkspaces";
import { getWorkspaceSelection, setSelectedClinic, subscribeWorkspaceSelection } from "../lib/workspaceSelection";

type ClinicForm = {
  id?: string;
  name: string;
  clinicType: string;
  email: string;
  city: string;
  country: string;
};

type ClinicStats = {
  appointments: number;
  chats: number;
  knowledge: number;
};

const blankForm: ClinicForm = {
  name: "",
  clinicType: "Dental Clinic",
  email: "",
  city: "",
  country: "PH",
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clinic";
}

export function ClinicOnboardingPage() {
  const [clinics, setClinics] = useState<ClinicWorkspaceOption[]>([]);
  const [clinicStats, setClinicStats] = useState<Record<string, ClinicStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClinicId, setEditingClinicId] = useState<string>();
  const [form, setForm] = useState<ClinicForm>({ ...blankForm });
  const [status, setStatus] = useState("Loading clinics…");
  const [query, setQuery] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "active" | "inactive">("all");
  const slug = useMemo(() => slugify(form.name), [form.name]);
  const activeClinicId = getWorkspaceSelection().clinicId;
  const activeClinic = clinics.find((item) => item.clinicId === activeClinicId);
  const filteredClinics = clinics.filter((clinic) => {
    const matchesSearch = [clinic.clinicName, clinic.clinicSlug, clinic.role].join(" ").toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = directoryFilter === "all" || (directoryFilter === "active" ? clinic.clinicId === activeClinicId : clinic.clinicId !== activeClinicId);
    return matchesSearch && matchesFilter;
  });

  async function loadClinicStats(items: ClinicWorkspaceOption[]) {
    if (!supabase || !items.length) return setClinicStats({});
    const client = supabase;
    const entries = await Promise.all(items.map(async (clinic) => {
      const [appointments, chats, knowledge] = await Promise.all([
        client.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.clinicId),
        client.from("chat_sessions").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.clinicId),
        client.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.clinicId),
      ]);
      return [clinic.clinicId, { appointments: appointments.count || 0, chats: chats.count || 0, knowledge: knowledge.count || 0 }] as const;
    }));
    setClinicStats(Object.fromEntries(entries));
  }

  async function loadClinics() {
    setLoading(true);
    try {
      const items = await listClinicWorkspaces();
      setClinics(items);
      await loadClinicStats(items);
      setStatus(items.length ? `${items.length} clinic workspace${items.length === 1 ? "" : "s"} ready.` : "No clinics yet. Create your first workspace.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load clinics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClinics();
    return subscribeWorkspaceSelection(() => void loadClinics());
  }, []);

  function openCreate() {
    setEditingClinicId(undefined);
    setForm({ ...blankForm });
    setModalOpen(true);
  }

  async function openEdit(clinic: ClinicWorkspaceOption) {
    setEditingClinicId(clinic.clinicId);
    setForm({ id: clinic.clinicId, name: clinic.clinicName, clinicType: "", email: "", city: "", country: "PH" });
    setModalOpen(true);

    if (!supabase) return;
    const { data, error } = await supabase
      .from("clinics")
      .select("id,name,clinic_type,email,city,country")
      .eq("id", clinic.clinicId)
      .single();
    if (error) {
      setStatus(`Failed to load clinic details: ${error.message}`);
      return;
    }
    setForm({
      id: data.id,
      name: data.name || clinic.clinicName,
      clinicType: data.clinic_type || "",
      email: data.email || "",
      city: data.city || "",
      country: data.country || "PH",
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingClinicId) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.from("clinics").update({
          name: form.name.trim(),
          slug,
          clinic_type: form.clinicType.trim() || null,
          email: form.email.trim() || null,
          city: form.city.trim() || null,
          country: form.country.trim() || "PH",
        }).eq("id", editingClinicId);
        if (error) throw error;
        setStatus("Clinic updated.");
      } else {
        const clinic = await createClinicWorkspace({ name: form.name, slug, clinicType: form.clinicType, email: form.email, city: form.city, country: form.country });
        setSelectedClinic(clinic.id);
        setStatus(`Created clinic workspace: ${clinic.name}.`);
      }
      setModalOpen(false);
      await loadClinics();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save clinic.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClinic(clinic: ClinicWorkspaceOption) {
    if (!supabase) return;
    const confirmed = window.confirm(`Delete ${clinic.clinicName}? This removes its clinic workspace and related data.`);
    if (!confirmed) return;

    const { error } = await supabase.from("clinics").delete().eq("id", clinic.clinicId);
    if (error) {
      setStatus(`Delete failed: ${error.message}`);
      return;
    }

    if (getWorkspaceSelection().clinicId === clinic.clinicId) setSelectedClinic(undefined);
    setStatus("Clinic deleted.");
    await loadClinics();
  }

  function switchClinic(clinicId: string) {
    setSelectedClinic(clinicId);
    setStatus("Active clinic updated.");
  }

  return (
    <section className="clinics-modern-page">
      <div className="clinics-hero-card">
        <div>
          <span className="badge teal"><Sparkles size={14} /> StormeAI workspace</span>
          <h1>Clinic workspaces</h1>
          <p>Create, update, switch, and organize clinic accounts for your AI receptionist system.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}><Plus size={17} /> Add clinic</button>
      </div>

      <section className="clinics-command-grid">
        <div className="active-clinic-showcase">
          <div className="clinic-showcase-icon"><Building2 size={30} /></div>
          <div>
            <p className="eyebrow">Active clinic</p>
            <h2>{activeClinic?.clinicName || "No clinic selected"}</h2>
            <span>{activeClinic ? `/${activeClinic.clinicSlug} · ${activeClinic.role}` : "Choose a workspace to activate dashboard routes."}</span>
          </div>
          {activeClinic && <button className="ghost-button" type="button" onClick={() => void openEdit(activeClinic)}>Edit profile</button>}
        </div>
        <div className="clinics-summary-grid refined">
          <div><strong>{clinics.length}</strong><span>Total clinics</span></div>
          <div><strong>{filteredClinics.length}</strong><span>Visible records</span></div>
          <div><strong>{clinics.reduce((sum, clinic) => sum + (clinicStats[clinic.clinicId]?.appointments || 0), 0)}</strong><span>Appointment requests</span></div>
          <div><strong>{clinics.reduce((sum, clinic) => sum + (clinicStats[clinic.clinicId]?.chats || 0), 0)}</strong><span>Chat sessions</span></div>
        </div>
      </section>

      <section className="clinics-crud-shell elevated">
        <div className="clinic-directory-table">
          <div className="clinic-directory-intro">
            <div>
              <p className="eyebrow">Clinic directory</p>
              <h2>Manage clinics</h2>
              <span>{status}</span>
            </div>
          </div>
          <div className="clinic-directory-controls">
            <label className="clinic-directory-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clinic, slug, role…" /></label>
            <label className="clinic-directory-filter">Filter<select value={directoryFilter} onChange={(event) => setDirectoryFilter(event.target.value as "all" | "active" | "inactive")}><option value="all">All clinics</option><option value="active">Active clinic</option><option value="inactive">Inactive clinics</option></select></label>
            <button className="primary-button" type="button" onClick={openCreate}><Plus size={16} /> New clinic</button>
          </div>
          <div className="clinic-table-head"><span>Clinic</span><span>Activity</span><span>Role</span><span>Actions</span></div>
          {loading ? <p className="empty-state clinic-table-empty">Loading clinics…</p> : !filteredClinics.length ? <p className="empty-state clinic-table-empty">No clinic workspace matched your search.</p> : filteredClinics.map((clinic) => {
            const stats = clinicStats[clinic.clinicId] || { appointments: 0, chats: 0, knowledge: 0 };
            const active = activeClinicId === clinic.clinicId;
            return (
              <div className={`clinic-table-row ${active ? "active" : ""}`} key={`table-${clinic.clinicId}`}>
                <div className="clinic-table-name"><span className="clinic-table-avatar">{clinic.clinicName.slice(0, 1).toUpperCase()}</span><div><strong>{clinic.clinicName}</strong><span>/{clinic.clinicSlug}</span></div></div>
                <div className="clinic-table-activity"><span>{stats.appointments} bookings</span><span>{stats.chats} chats</span><span>{stats.knowledge} docs</span></div>
                <div><span className={`clinic-status-pill ${active ? "active" : ""}`}>{active ? "Active" : clinic.role}</span></div>
                <div className="clinic-table-actions"><button type="button" onClick={() => switchClinic(clinic.clinicId)}>Use</button><button type="button" onClick={() => void openEdit(clinic)}>Edit</button><button type="button" className="icon-danger" onClick={() => void deleteClinic(clinic)}><Trash2 size={14} /></button></div>
              </div>
            );
          })}
        </div>
      </section>


      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editingClinicId ? "Update clinic" : "Add clinic"}>
          <div className="prompt-modal create-modal clinic-modal-modern">
            <div className="prompt-modal-header">
              <div><p className="eyebrow">Clinic workspace</p><h2>{editingClinicId ? "Update clinic" : "Add clinic"}</h2><span>Keep clinic identity clean for chat widgets, routes, and staff workspaces.</span></div>
              <button className="ghost-button" type="button" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <form className="clinic-modern-form" onSubmit={submit}>
              <label className="full-field">Clinic name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Storme Dental Clinic" /></label>
              <label>Route slug<input value={slug} readOnly placeholder="clinic-slug" /></label>
              <label>Clinic type<input value={form.clinicType} onChange={(event) => setForm({ ...form, clinicType: event.target.value })} placeholder="Dental Clinic" /></label>
              <label>Public email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="hello@clinic.com" /></label>
              <label>City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Makati" /></label>
              <label>Country<input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="PH" /></label>
              <button className="primary-button full-field" type="submit" disabled={saving}>{saving ? "Saving…" : editingClinicId ? "Update clinic" : "Create clinic"}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
