import { FormEvent, useEffect, useState } from "react";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";

type AccountProfile = {
  fullName: string;
  phone: string;
  roleTitle: string;
  timezone: string;
  emailNotifications: boolean;
  appointmentAlerts: boolean;
  handoffAlerts: boolean;
};

const defaultProfile: AccountProfile = {
  fullName: "",
  phone: "",
  roleTitle: "Clinic owner",
  timezone: "Asia/Manila",
  emailNotifications: true,
  appointmentAlerts: true,
  handoffAlerts: true,
};

export function AccountSettingsPage() {
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);
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
        roleTitle: String(metadata.role_title || appMetadata.role || "Clinic owner"),
        timezone: String(metadata.timezone || "Asia/Manila"),
        emailNotifications: metadata.email_notifications !== false,
        appointmentAlerts: metadata.appointment_alerts !== false,
        handoffAlerts: metadata.handoff_alerts !== false,
      });
    }
    void loadUser();
    return () => { mounted = false; };
  }, []);

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
