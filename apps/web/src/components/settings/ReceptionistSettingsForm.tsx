import { FormEvent, useEffect, useState } from "react";
import { Bot, BrainCircuit, Clock, Languages, MessageSquareText, ShieldCheck } from "lucide-react";
import { defaultReceptionistSettings, type ReceptionistSettingsRecord } from "../../lib/ai/receptionistSettings";

type Props = {
  value?: ReceptionistSettingsRecord;
  loading?: boolean;
  saving?: boolean;
  status?: string;
  onChange?: (settings: ReceptionistSettingsRecord) => void;
  onSave?: (settings: ReceptionistSettingsRecord) => Promise<void> | void;
};

export function ReceptionistSettingsForm({ value, loading, saving, status, onChange, onSave }: Props) {
  const [settings, setSettings] = useState<ReceptionistSettingsRecord>(value || defaultReceptionistSettings);

  useEffect(() => {
    if (value) setSettings(value);
  }, [value]);

  function update(patch: Partial<ReceptionistSettingsRecord>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    onChange?.(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave?.(settings);
  }

  return (
    <form className="settings-form enhanced" onSubmit={submit}>
      <p className="settings-status">{loading ? "Loading saved receptionist settings…" : status || "Configure how the chat-only receptionist behaves."}</p>

      <div className="settings-section-card">
        <SectionHeader icon={Bot} title="Identity and behavior" subtitle="Patient-facing name, tone, and language style." />
        <div className="form-grid">
          <label>Receptionist name<input value={settings.name} onChange={(e) => update({ name: e.target.value })} placeholder="Mia" /></label>
          <label>Tone<input value={settings.tone} onChange={(e) => update({ tone: e.target.value })} placeholder="Warm, professional, concise" /></label>
          <label className="full-field">Language style<input value={settings.languageStyle} onChange={(e) => update({ languageStyle: e.target.value })} placeholder="English, with Taglish when appropriate" /></label>
          <label className="full-field">Greeting message<textarea value={settings.greetingMessage} onChange={(e) => update({ greetingMessage: e.target.value })} rows={3} /></label>
        </div>
      </div>

      <div className="settings-section-card">
        <SectionHeader icon={BrainCircuit} title="AI provider routing" subtitle="Choose the model StormeAI should use for live chat tests." />
        <div className="form-grid">
          <label>Default provider<select value={settings.defaultProvider} onChange={(e) => update({ defaultProvider: e.target.value as ReceptionistSettingsRecord["defaultProvider"] })}><option value="ollama">Ollama</option><option value="openai">OpenAI</option><option value="anthropic">Claude</option></select></label>
          <label>Default model<input value={settings.defaultModel} onChange={(e) => update({ defaultModel: e.target.value })} placeholder="qwen2.5:7b" /></label>
          <label>Fallback provider<select value={settings.fallbackProvider} onChange={(e) => update({ fallbackProvider: e.target.value as ReceptionistSettingsRecord["fallbackProvider"] })}><option value="none">None</option><option value="ollama">Ollama</option><option value="openai">OpenAI</option><option value="anthropic">Claude</option></select></label>
          <label>Fallback model<input value={settings.fallbackModel} onChange={(e) => update({ fallbackModel: e.target.value })} placeholder="Optional" /></label>
        </div>
      </div>

      <div className="settings-section-card">
        <SectionHeader icon={Clock} title="Clinic operating rules" subtitle="Dynamic data the receptionist can use while answering." />
        <div className="form-grid">
          <label>Business hours<input value={settings.businessHours} onChange={(e) => update({ businessHours: e.target.value })} placeholder="Mon-Sat, 9AM-6PM" /></label>
          <label>Escalation contact<input value={settings.escalationContact} onChange={(e) => update({ escalationContact: e.target.value })} placeholder="frontdesk@clinic.com / +63..." /></label>
          <label className="full-field">Booking instructions<textarea value={settings.bookingInstructions} onChange={(e) => update({ bookingInstructions: e.target.value })} rows={3} /></label>
          <label className="full-field">Human handoff instructions<textarea value={settings.handoffInstructions} onChange={(e) => update({ handoffInstructions: e.target.value })} rows={3} /></label>
        </div>
      </div>

      <div className="settings-section-card">
        <SectionHeader icon={ShieldCheck} title="Safety controls" subtitle="Keep StormeAI as a receptionist, not a doctor." />
        <div className="settings-toggle-grid">
          <Toggle label="Use approved knowledge only" checked={settings.useApprovedKnowledgeOnly} onChange={(value) => update({ useApprovedKnowledgeOnly: value })} />
          <Toggle label="Offer appointment when relevant" checked={settings.offerAppointmentWhenRelevant} onChange={(value) => update({ offerAppointmentWhenRelevant: value })} />
          <Toggle label="Emergency handoff enabled" checked={settings.emergencyHandoffEnabled} onChange={(value) => update({ emergencyHandoffEnabled: value })} />
          <Toggle label="Human handoff enabled" checked={settings.humanHandoffEnabled} onChange={(value) => update({ humanHandoffEnabled: value })} />
        </div>
      </div>

      <div className="settings-section-card">
        <SectionHeader icon={MessageSquareText} title="Advanced prompt override" subtitle="Optional extra base prompt appended to generated safety rules." />
        <label>Custom base prompt<textarea value={settings.baseSystemPrompt} onChange={(e) => update({ baseSystemPrompt: e.target.value })} rows={5} placeholder="Optional: add clinic-specific rules here…" /></label>
      </div>

      <button className="primary-button" type="submit" disabled={loading || saving}>{saving ? "Saving…" : "Save receptionist settings"}</button>
    </form>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number }>; title: string; subtitle: string }) {
  return <div className="settings-mini-heading"><span><Icon size={17} /></span><div><strong>{title}</strong><p>{subtitle}</p></div></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="settings-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}
