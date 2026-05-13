import { FormEvent, useEffect, useState } from "react";
import { Building2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getWorkspaceSelection, persistWorkspaceSelection } from "../lib/workspaceSelection";
import { getUserOrganization } from "../lib/organizationWorkspaces";

type AccountProfile = {
  fullName: string;
  phone: string;
  roleTitle: string;
  timezone: string;
  emailNotifications: boolean;
  appointmentAlerts: boolean;
  handoffAlerts: boolean;
};

type OrganizationProfile = {
  id: string;
  name: string;
  slug: string;
  organizationType: string;
  email: string;
  phone: string;
  websiteUrl: string;
  city: string;
  country: string;
  timezone: string;
};

const defaultProfile: AccountProfile = {
  fullName: "",
  phone: "",
  roleTitle: "Organization owner",
  timezone: "Asia/Manila",
  emailNotifications: true,
  appointmentAlerts: true,
  handoffAlerts: true,
};

const defaultOrganizationProfile: OrganizationProfile = {
  id: "",
  name: "",
  slug: "",
  organizationType: "",
  email: "",
  phone: "",
  websiteUrl: "",
  city: "",
  country: "PH",
  timezone: "Asia/Manila",
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "organization";
}

export function AccountSettingsPage() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);
  const [organization, setOrganization] = useState<OrganizationProfile>(defaultOrganizationProfile);
  const [organizationStatus, setOrganizationStatus] = useState("Loading organization settings…");
  const [status, setStatus] = useState("Manage your login, profile, and notification preferences.");

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      if (!supabase) return;
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) {
        setStatus(error.message);
        return;
      }
      const user = data.user;
      const metadata = user?.user_metadata || {};
      const appMetadata = user?.app_metadata || {};
      setCurrentEmail(user?.email || "");
      setNewEmail(user?.email || "");
      setProfile({
        fullName: String(metadata.full_name || ""),
        phone: String(metadata.phone || ""),
        roleTitle: String(metadata.role_title || appMetadata.role || "Organization owner"),
        timezone: String(metadata.timezone || "Asia/Manila"),
        emailNotifications: metadata.email_notifications !== false,
        appointmentAlerts: metadata.appointment_alerts !== false,
        handoffAlerts: metadata.handoff_alerts !== false,
      });
    }
    void loadUser();
    return () => { mounted = false; };
  }, []);


  useEffect(() => {
    void loadOrganization();
  }, []);

  async function loadOrganization() {
    if (!supabase) {
      setOrganizationStatus("Supabase is not configured.");
      return;
    }

    try {
      const organizations = await getUserOrganization();
      const selectedId = getWorkspaceSelection().organizationId;
      const current = organizations.find((item) => item.organizationId === selectedId) || organizations[0];
      if (!current) {
        setOrganization(defaultOrganizationProfile);
        setOrganizationStatus("Create an organization first before editing its settings.");
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,slug,organization_type,email,phone,website_url,city,country,timezone")
        .eq("id", current.organizationId)
        .single();

      if (error) throw error;

      setOrganization({
        id: data.id,
        name: data.name || "",
        slug: data.slug || slugify(data.name || "organization"),
        organizationType: data.organization_type || "",
        email: data.email || "",
        phone: data.phone || "",
        websiteUrl: data.website_url || "",
        city: data.city || "",
        country: data.country || "PH",
        timezone: data.timezone || "Asia/Manila",
      });
      persistWorkspaceSelection({ ...getWorkspaceSelection(), organizationId: data.id });
      setOrganizationStatus("Update your organization profile here.");
    } catch (error) {
      setOrganizationStatus(error instanceof Error ? error.message : "Failed to load organization settings.");
    }
  }

  async function saveOrganization(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return setOrganizationStatus("Supabase is not configured.");
    if (!organization.id) return setOrganizationStatus("Create an organization first before saving settings.");

    const nextSlug = slugify(organization.slug || organization.name);
    const { error } = await supabase.from("organizations").update({
      name: organization.name.trim(),
      slug: nextSlug,
      organization_type: organization.organizationType.trim() || null,
      email: organization.email.trim() || null,
      phone: organization.phone.trim() || null,
      website_url: organization.websiteUrl.trim() || null,
      city: organization.city.trim() || null,
      country: organization.country.trim() || "PH",
      timezone: organization.timezone.trim() || "Asia/Manila",
    }).eq("id", organization.id);

    if (error) return setOrganizationStatus(error.message);
    setOrganization((current) => ({ ...current, slug: nextSlug }));
    setOrganizationStatus("Organization settings saved.");
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return setStatus("Supabase is not configured.");

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profile.fullName,
        phone: profile.phone,
        role_title: profile.roleTitle,
        timezone: profile.timezone,
        email_notifications: profile.emailNotifications,
        appointment_alerts: profile.appointmentAlerts,
        handoff_alerts: profile.handoffAlerts,
      },
    });

    setStatus(error ? error.message : "Account profile saved.");
  }

  async function changeEmail(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return setStatus("Supabase is not configured.");
    if (!newEmail || newEmail === currentEmail) return setStatus("Enter a new email address first.");

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setStatus(error ? error.message : "Email change requested. Check both email inboxes if confirmation is enabled.");
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return setStatus("Supabase is not configured.");
    if (newPassword.length < 8) return setStatus("Password must be at least 8 characters.");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setStatus(error ? error.message : "Password updated successfully.");
    if (!error) setNewPassword("");
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Account settings</h1>
        </div>
        <div className="topbar-actions">
          <span className="badge teal">Signed in</span>
        </div>
      </header>

      <section className="account-settings-grid">
        <form className="settings-panel wide" onSubmit={saveOrganization}>
          <SectionTitle icon={Building2} title="Organization" subtitle="Edit the organization connected to this account and its agents." />
          <p className="settings-status">{organizationStatus}</p>
          <div className="form-grid">
            <label>Organization name<input value={organization.name} onChange={(e) => setOrganization({ ...organization, name: e.target.value, slug: slugify(e.target.value) })} placeholder="Storme Dental Organization" /></label>
            <label>Route slug<input value={organization.slug} onChange={(e) => setOrganization({ ...organization, slug: slugify(e.target.value) })} placeholder="storme-dental" /></label>
            <label>Organization type<input value={organization.organizationType} onChange={(e) => setOrganization({ ...organization, organizationType: e.target.value })} placeholder="Dental Organization" /></label>
            <label>Public email<input type="email" value={organization.email} onChange={(e) => setOrganization({ ...organization, email: e.target.value })} placeholder="hello@organization.com" /></label>
            <label>Phone<input value={organization.phone} onChange={(e) => setOrganization({ ...organization, phone: e.target.value })} placeholder="+63..." /></label>
            <label>Website<input value={organization.websiteUrl} onChange={(e) => setOrganization({ ...organization, websiteUrl: e.target.value })} placeholder="https://example.com" /></label>
            <label>City<input value={organization.city} onChange={(e) => setOrganization({ ...organization, city: e.target.value })} placeholder="Makati" /></label>
            <label>Country<input value={organization.country} onChange={(e) => setOrganization({ ...organization, country: e.target.value })} placeholder="PH" /></label>
            <label>Organization timezone<input value={organization.timezone} onChange={(e) => setOrganization({ ...organization, timezone: e.target.value })} placeholder="Asia/Manila" /></label>
          </div>
          <button className="primary-button" type="submit" disabled={!organization.id}>Save organization</button>
        </form>

        <form className="settings-panel wide" onSubmit={saveProfile}>
          <SectionTitle icon={UserRound} title="Profile" subtitle="Used for workspace identity and staff notifications." />
          <p className="settings-status">{status}</p>
          <div className="form-grid">
            <label>Full name<input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} placeholder="Aaron Aludo" /></label>
            <label>Phone<input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+63..." /></label>
            <label>Role title<input value={profile.roleTitle} onChange={(e) => setProfile({ ...profile, roleTitle: e.target.value })} /></label>
            <label>Timezone<input value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} /></label>
          </div>
          <div className="settings-toggle-grid">
            <Toggle label="Email notifications" checked={profile.emailNotifications} onChange={(value) => setProfile({ ...profile, emailNotifications: value })} />
            <Toggle label="Appointment alerts" checked={profile.appointmentAlerts} onChange={(value) => setProfile({ ...profile, appointmentAlerts: value })} />
            <Toggle label="Human handoff alerts" checked={profile.handoffAlerts} onChange={(value) => setProfile({ ...profile, handoffAlerts: value })} />
          </div>
          <button className="primary-button" type="submit">Save profile</button>
        </form>

        <div className="settings-stack">
          <form className="settings-panel" onSubmit={changeEmail}>
            <SectionTitle icon={Mail} title="Change email" subtitle={`Current: ${currentEmail || "loading…"}`} />
            <label>New email<input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></label>
            <button className="ghost-button" type="submit">Request email change</button>
          </form>

          <form className="settings-panel" onSubmit={changePassword}>
            <SectionTitle icon={ShieldCheck} title="Change password" subtitle="Use at least 8 characters." />
            <label>New password<input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" /></label>
            <button className="ghost-button" type="submit">Update password</button>
          </form>
        </div>
      </section>
    </>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number }>; title: string; subtitle: string }) {
  return (
    <div className="settings-section-title">
      <span><Icon size={18} /></span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="settings-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}
