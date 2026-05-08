import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClinicId, setEditingClinicId] = useState<string>();
  const [form, setForm] = useState<ClinicForm>({ ...blankForm, name: "Storme Dental Clinic", email: "hello@clinic.com", city: "Makati" });
  const [status, setStatus] = useState("Loading clinics…");
  const slug = useMemo(() => slugify(form.name), [form.name]);

  async function loadClinics() {
    setLoading(true);
    try {
      const items = await listClinicWorkspaces();
      setClinics(items);
      setStatus(items.length ? `${items.length} clinic workspace${items.length === 1 ? "" : "s"}.` : "No clinics yet. Create your first workspace.");
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
    <section className="content-grid two-one clinics-page">
      <div className="panel-card">
        <div className="panel-heading">
          <div className="panel-title-row"><div><h3>Clinics</h3><p>{status}</p></div></div>
          <button className="primary-button" type="button" onClick={openCreate}>Add clinic</button>
        </div>
        <div className="clinic-list">
          {loading ? <p className="empty-state">Loading clinics…</p> : clinics.length ? clinics.map((clinic) => (
            <div className={`clinic-management-row ${getWorkspaceSelection().clinicId === clinic.clinicId ? "active" : ""}`} key={clinic.clinicId}>
              <div>
                <strong>{clinic.clinicName}</strong>
                <span>/{clinic.clinicSlug} · {clinic.role}</span>
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => switchClinic(clinic.clinicId)}>Use</button>
                <button type="button" onClick={() => void openEdit(clinic)}>Update</button>
                <button className="danger" type="button" onClick={() => void deleteClinic(clinic)}>Delete</button>
              </div>
            </div>
          )) : <p className="empty-state">No clinics yet. Add your first clinic workspace.</p>}
        </div>
      </div>
      <div className="panel-card">
        <div className="panel-heading"><div className="panel-title-row"><div><h3>Clinic management</h3><p>Create, update, delete, and switch active clinic workspaces.</p></div></div></div>
        <div className="config-list">
          <div className="config-row"><span>Route</span><strong>/clinics</strong></div>
          <div className="config-row"><span>Access</span><strong>Owner/Admin via RLS</strong></div>
          <div className="config-row"><span>Active clinic</span><strong>{clinics.find((item) => item.clinicId === getWorkspaceSelection().clinicId)?.clinicName || "None selected"}</strong></div>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editingClinicId ? "Update clinic" : "Add clinic"}>
          <div className="prompt-modal create-modal">
            <div className="prompt-modal-header">
              <div><p className="eyebrow">Clinics</p><h2>{editingClinicId ? "Update clinic" : "Add clinic"}</h2></div>
              <button className="ghost-button" type="button" onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <form className="appointment-form modal-form" onSubmit={submit}>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Clinic name" />
              <input value={slug} readOnly placeholder="clinic-slug" />
              <input value={form.clinicType} onChange={(event) => setForm({ ...form, clinicType: event.target.value })} placeholder="Clinic type" />
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Public email" />
              <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="City" />
              <input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="Country" />
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingClinicId ? "Update clinic" : "Create clinic"}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
