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
          <BusinessHoursPicker value={settings.businessHours} onChange={(businessHours) => update({ businessHours })} />
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

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function BusinessHoursPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parsed = parseBusinessHours(value);
  const [days, setDays] = useState<string[]>(parsed.days);
  const [openTime, setOpenTime] = useState(parsed.openTime);
  const [closeTime, setCloseTime] = useState(parsed.closeTime);

  useEffect(() => {
    const next = parseBusinessHours(value);
    setDays(next.days);
    setOpenTime(next.openTime);
    setCloseTime(next.closeTime);
  }, [value]);

  function commit(nextDays = days, nextOpen = openTime, nextClose = closeTime) {
    const formattedDays = compactDays(nextDays);
    onChange(nextDays.length ? `${formattedDays}, ${formatTime(nextOpen)}-${formatTime(nextClose)}` : "Closed");
  }

  function toggleDay(day: string) {
    const next = days.includes(day) ? days.filter((item) => item !== day) : [...days, dayOptions.find((item) => item === day)!].sort((a, b) => dayOptions.indexOf(a) - dayOptions.indexOf(b));
    setDays(next);
    commit(next);
  }

  return (
    <div className="business-hours-picker full-field">
      <div className="field-label">Business hours</div>
      <div className="day-chip-grid">
        {dayOptions.map((day) => (
          <button className={days.includes(day) ? "active" : ""} type="button" key={day} onClick={() => toggleDay(day)}>{day}</button>
        ))}
      </div>
      <div className="time-range-grid">
        <label>Opening time<input type="time" value={openTime} onChange={(event) => { setOpenTime(event.target.value); commit(days, event.target.value, closeTime); }} /></label>
        <label>Closing time<input type="time" value={closeTime} onChange={(event) => { setCloseTime(event.target.value); commit(days, openTime, event.target.value); }} /></label>
      </div>
      <p>Saved as: <strong>{value || "Mon-Sat, 9AM-6PM"}</strong></p>
    </div>
  );
}

function parseBusinessHours(value: string) {
  const fallback = { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], openTime: "09:00", closeTime: "18:00" };
  if (!value || value.toLowerCase() === "closed") return fallback;

  const lower = value.toLowerCase();
  const days = dayOptions.filter((day) => lower.includes(day.toLowerCase()));
  if (lower.includes("mon-sat")) days.splice(0, days.length, "Mon", "Tue", "Wed", "Thu", "Fri", "Sat");
  if (lower.includes("mon-fri")) days.splice(0, days.length, "Mon", "Tue", "Wed", "Thu", "Fri");

  const times = [...value.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)].map((match) => toTimeInput(match[1], match[2], match[3]));

  return {
    days: days.length ? days : fallback.days,
    openTime: times[0] || fallback.openTime,
    closeTime: times[1] || fallback.closeTime,
  };
}

function toTimeInput(hourText: string, minuteText?: string, meridiem?: string) {
  let hour = Number(hourText);
  const minute = Number(minuteText || 0);
  const marker = meridiem?.toLowerCase();
  if (marker === "pm" && hour < 12) hour += 12;
  if (marker === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = minuteText || "00";
  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}${minute === "00" ? "" : `:${minute}`}${meridiem}`;
}

function compactDays(days: string[]) {
  const ordered = days.sort((a, b) => dayOptions.indexOf(a) - dayOptions.indexOf(b));
  if (ordered.join(",") === "Mon,Tue,Wed,Thu,Fri,Sat") return "Mon-Sat";
  if (ordered.join(",") === "Mon,Tue,Wed,Thu,Fri") return "Mon-Fri";
  return ordered.join(", ");
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number }>; title: string; subtitle: string }) {
  return <div className="settings-mini-heading"><span><Icon size={17} /></span><div><strong>{title}</strong><p>{subtitle}</p></div></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="settings-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}
