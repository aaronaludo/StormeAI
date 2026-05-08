import { FormEvent, useState } from "react";

export type ReceptionistSettings = {
  name: string;
  tone: string;
  languageStyle: string;
  defaultProvider: "ollama" | "openai" | "anthropic";
  defaultModel: string;
  useApprovedKnowledgeOnly: boolean;
  offerAppointmentWhenRelevant: boolean;
  emergencyHandoffEnabled: boolean;
  humanHandoffEnabled: boolean;
};

type Props = {
  initial?: Partial<ReceptionistSettings>;
  onSave?: (settings: ReceptionistSettings) => Promise<void> | void;
};

const defaults: ReceptionistSettings = {
  name: "Mia",
  tone: "Warm, professional, concise",
  languageStyle: "English + Taglish when appropriate",
  defaultProvider: "ollama",
  defaultModel: "qwen2.5:7b",
  useApprovedKnowledgeOnly: true,
  offerAppointmentWhenRelevant: true,
  emergencyHandoffEnabled: true,
  humanHandoffEnabled: true,
};

export function ReceptionistSettingsForm({ initial, onSave }: Props) {
  const [settings, setSettings] = useState<ReceptionistSettings>({ ...defaults, ...initial });
  const [status, setStatus] = useState("Configure how the chat-only receptionist behaves.");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave?.(settings);
    setStatus("Settings saved locally. Connect Supabase persistence in the next integration step.");
  }

  return (
    <form className="settings-form" onSubmit={submit}>
      <p className="settings-status">{status}</p>
      <div className="form-grid">
        <label>Name<input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} /></label>
        <label>Tone<input value={settings.tone} onChange={(e) => setSettings({ ...settings, tone: e.target.value })} /></label>
        <label>Language<input value={settings.languageStyle} onChange={(e) => setSettings({ ...settings, languageStyle: e.target.value })} /></label>
        <label>Default model<input value={settings.defaultModel} onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })} /></label>
        <label>Provider<select value={settings.defaultProvider} onChange={(e) => setSettings({ ...settings, defaultProvider: e.target.value as ReceptionistSettings["defaultProvider"] })}><option value="ollama">Ollama</option><option value="openai">OpenAI</option><option value="anthropic">Claude</option></select></label>
      </div>
      <div className="settings-toggle-grid">
        <Toggle label="Use approved knowledge only" checked={settings.useApprovedKnowledgeOnly} onChange={(value) => setSettings({ ...settings, useApprovedKnowledgeOnly: value })} />
        <Toggle label="Offer appointment when relevant" checked={settings.offerAppointmentWhenRelevant} onChange={(value) => setSettings({ ...settings, offerAppointmentWhenRelevant: value })} />
        <Toggle label="Emergency handoff enabled" checked={settings.emergencyHandoffEnabled} onChange={(value) => setSettings({ ...settings, emergencyHandoffEnabled: value })} />
        <Toggle label="Human handoff enabled" checked={settings.humanHandoffEnabled} onChange={(value) => setSettings({ ...settings, humanHandoffEnabled: value })} />
      </div>
      <button className="primary-button" type="submit">Save receptionist settings</button>
    </form>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="settings-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}
