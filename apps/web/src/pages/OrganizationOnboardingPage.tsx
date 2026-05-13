import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Edit3, LayoutDashboard, MapPin, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { createOrganizationWorkspace, supabase } from "../lib/supabase";
import { getUserOrganization, type OrganizationOption } from "../lib/organizationWorkspaces";
import { getWorkspaceSelection, setSelectedOrganization, subscribeWorkspaceSelection } from "../lib/workspaceSelection";

type OrganizationForm = {
  id?: string;
  name: string;
  organizationType: string;
  email: string;
  city: string;
  country: string;
};

type OrganizationStats = {
  appointments: number;
  chats: number;
  knowledge: number;
};

const blankForm: OrganizationForm = {
  name: "",
  organizationType: "Dental Organization",
  email: "",
  city: "",
  country: "PH",
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "organization";
}

export function OrganizationOnboardingPage() {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [organizationStats, setOrganizationStats] = useState<Record<string, OrganizationStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrganizationId, setEditingOrganizationId] = useState<string>();
  const [form, setForm] = useState<OrganizationForm>({ ...blankForm });
  const [status, setStatus] = useState("Loading organizations…");
  const [query, setQuery] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "active" | "inactive">("all");
  const slug = useMemo(() => slugify(form.name), [form.name]);
  const activeOrganizationId = getWorkspaceSelection().organizationId;
  const activeOrganization = organizations.find((item) => item.organizationId === activeOrganizationId);
  const filteredOrganizations = organizations.filter((organization) => {
    const matchesSearch = [organization.organizationName, organization.organizationSlug, organization.role].join(" ").toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = directoryFilter === "all" || (directoryFilter === "active" ? organization.organizationId === activeOrganizationId : organization.organizationId !== activeOrganizationId);
    return matchesSearch && matchesFilter;
  });

  async function loadOrganizationStats(items: OrganizationOption[]) {
    if (!supabase || !items.length) return setOrganizationStats({});
    const client = supabase;
    const entries = await Promise.all(items.map(async (organization) => {
      const [appointments, chats, knowledge] = await Promise.all([
        client.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", organization.organizationId),
        client.from("chat_sessions").select("id", { count: "exact", head: true }).eq("organization_id", organization.organizationId),
        client.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("organization_id", organization.organizationId),
      ]);
      return [organization.organizationId, { appointments: appointments.count || 0, chats: chats.count || 0, knowledge: knowledge.count || 0 }] as const;
    }));
    setOrganizationStats(Object.fromEntries(entries));
  }

  async function loadOrganizations() {
    setLoading(true);
    try {
      const items = await getUserOrganization();
      setOrganizations(items);
      await loadOrganizationStats(items);
      setStatus(items.length ? `${items.length} organization workspace${items.length === 1 ? "" : "s"} ready.` : "No organizations yet. Create your first workspace.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
    return subscribeWorkspaceSelection(() => void loadOrganizations());
  }, []);

  function openCreate() {
    setEditingOrganizationId(undefined);
    setForm({ ...blankForm });
    setModalOpen(true);
  }

  async function openEdit(organization: OrganizationOption) {
    setEditingOrganizationId(organization.organizationId);
    setForm({ id: organization.organizationId, name: organization.organizationName, organizationType: "", email: "", city: "", country: "PH" });
    setModalOpen(true);

    if (!supabase) return;
    const { data, error } = await supabase
      .from("organizations")
      .select("id,name,organization_type,email,city,country")
      .eq("id", organization.organizationId)
      .single();
    if (error) {
      setStatus(`Failed to load organization details: ${error.message}`);
      return;
    }
    setForm({
      id: data.id,
      name: data.name || organization.organizationName,
      organizationType: data.organization_type || "",
      email: data.email || "",
      city: data.city || "",
      country: data.country || "PH",
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingOrganizationId) {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.from("organizations").update({
          name: form.name.trim(),
          slug,
          organization_type: form.organizationType.trim() || null,
          email: form.email.trim() || null,
          city: form.city.trim() || null,
          country: form.country.trim() || "PH",
        }).eq("id", editingOrganizationId);
        if (error) throw error;
        setStatus("Organization updated.");
      } else {
        const organization = await createOrganizationWorkspace({ name: form.name, slug, organizationType: form.organizationType, email: form.email, city: form.city, country: form.country });
        setSelectedOrganization(organization.id);
        setStatus(`Created organization workspace: ${organization.name}.`);
      }
      setModalOpen(false);
      await loadOrganizations();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save organization.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrganization(organization: OrganizationOption) {
    if (!supabase) return;
    const confirmed = window.confirm(`Delete ${organization.organizationName}? This removes its organization workspace and related data.`);
    if (!confirmed) return;

    const { error } = await supabase.from("organizations").delete().eq("id", organization.organizationId);
    if (error) {
      setStatus(`Delete failed: ${error.message}`);
      return;
    }

    if (getWorkspaceSelection().organizationId === organization.organizationId) setSelectedOrganization(undefined);
    setStatus("Organization deleted.");
    await loadOrganizations();
  }

  function switchOrganization(organizationId: string) {
    setSelectedOrganization(organizationId);
    setStatus("Active organization updated.");
  }

  return (
    <section className="organizations-modern-page">
      <div className="organizations-hero-card">
        <div>
          <span className="badge teal"><Sparkles size={14} /> StormeAI workspace</span>
          <h1>Organization workspaces</h1>
          <p>Create, update, switch, and organize organization accounts for your AI agent system.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}><Plus size={17} /> Add organization</button>
      </div>

      <section className="organizations-command-grid">
        <div className="active-organization-showcase">
          <div className="organization-showcase-icon"><Building2 size={30} /></div>
          <div>
            <p className="eyebrow">Active organization</p>
            <h2>{activeOrganization?.organizationName || "No organization selected"}</h2>
            <span>{activeOrganization ? `/${activeOrganization.organizationSlug} · ${activeOrganization.role}` : "Choose a workspace to activate dashboard routes."}</span>
          </div>
          {activeOrganization && <button className="ghost-button" type="button" onClick={() => void openEdit(activeOrganization)}>Edit profile</button>}
        </div>
        <div className="organizations-summary-grid refined">
          <div><strong>{organizations.length}</strong><span>Total organizations</span></div>
          <div><strong>{filteredOrganizations.length}</strong><span>Visible records</span></div>
          <div><strong>{organizations.reduce((sum, organization) => sum + (organizationStats[organization.organizationId]?.appointments || 0), 0)}</strong><span>Appointment requests</span></div>
          <div><strong>{organizations.reduce((sum, organization) => sum + (organizationStats[organization.organizationId]?.chats || 0), 0)}</strong><span>Chat sessions</span></div>
        </div>
      </section>

      <section className="organizations-crud-shell elevated">
        <div className="organization-directory-table">
          <div className="organization-directory-intro">
            <div>
              <p className="eyebrow">Organization directory</p>
              <h2>Manage organizations</h2>
              <span>{status}</span>
            </div>
          </div>
          <div className="organization-directory-controls">
            <label className="organization-directory-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organization, slug, role…" /></label>
            <label className="organization-directory-filter">Filter<select value={directoryFilter} onChange={(event) => setDirectoryFilter(event.target.value as "all" | "active" | "inactive")}><option value="all">All organizations</option><option value="active">Active organization</option><option value="inactive">Inactive organizations</option></select></label>
          </div>
          <div className="organization-table-head"><span>Organization</span><span>Activity</span><span>Role</span><span>Actions</span></div>
          {loading ? <p className="empty-state organization-table-empty">Loading organizations…</p> : !filteredOrganizations.length ? <p className="empty-state organization-table-empty">No organization workspace matched your search.</p> : filteredOrganizations.map((organization) => {
            const stats = organizationStats[organization.organizationId] || { appointments: 0, chats: 0, knowledge: 0 };
            const active = activeOrganizationId === organization.organizationId;
            return (
              <div className={`organization-table-row ${active ? "active" : ""}`} key={`table-${organization.organizationId}`}>
                <div className="organization-table-name"><span className="organization-table-avatar"><Building2 size={26} /></span><div><strong>{organization.organizationName}</strong><span>/{organization.organizationSlug}</span></div></div>
                <div className="organization-table-activity"><span>{stats.appointments} bookings</span><span>{stats.chats} chats</span><span>{stats.knowledge} docs</span></div>
                <div><span className={`organization-status-pill ${active ? "active" : ""}`}>{active ? "Active" : organization.role}</span></div>
                <div className="organization-table-actions"><button type="button" title="Use organization" aria-label={`Use ${organization.organizationName}`} onClick={() => switchOrganization(organization.organizationId)}><LayoutDashboard size={14} /></button><button type="button" title="Edit organization" aria-label={`Edit ${organization.organizationName}`} onClick={() => void openEdit(organization)}><Edit3 size={14} /></button><button type="button" title="Delete organization" aria-label={`Delete ${organization.organizationName}`} className="icon-danger" onClick={() => void deleteOrganization(organization)}><Trash2 size={14} /></button></div>
              </div>
            );
          })}
        </div>
      </section>


      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editingOrganizationId ? "Update organization" : "Add organization"}>
          <div className="prompt-modal create-modal organization-modal-modern">
            <div className="prompt-modal-header">
              <div><p className="eyebrow">Organization workspace</p><h2>{editingOrganizationId ? "Update organization" : "Add organization"}</h2><span>Keep organization identity clean for chat widgets, routes, and staff workspaces.</span></div>
              <button className="ghost-button" type="button" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <form className="organization-modern-form" onSubmit={submit}>
              <label className="full-field">Organization name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Storme Dental Organization" /></label>
              <label>Route slug<input value={slug} readOnly placeholder="organization-slug" /></label>
              <label>Organization type<input value={form.organizationType} onChange={(event) => setForm({ ...form, organizationType: event.target.value })} placeholder="Dental Organization" /></label>
              <label>Public email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="hello@organization.com" /></label>
              <label>City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Makati" /></label>
              <label>Country<input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="PH" /></label>
              <button className="primary-button full-field" type="submit" disabled={saving}>{saving ? "Saving…" : editingOrganizationId ? "Update organization" : "Create organization"}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
