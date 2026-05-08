import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClinicWorkspace } from "../lib/supabase";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ClinicOnboardingPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("Storme Dental Clinic");
  const [clinicType, setClinicType] = useState("Dental Clinic");
  const [email, setEmail] = useState("hello@clinic.com");
  const [city, setCity] = useState("Makati");
  const [country, setCountry] = useState("PH");
  const [status, setStatus] = useState("Create the clinic workspace after signing in.");
  const slug = useMemo(() => slugify(name), [name]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const clinic = await createClinicWorkspace({ name, slug, clinicType, email, city, country });
      setStatus(`Created clinic workspace: ${clinic.name}. Opening dashboard…`);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create clinic workspace. Please try again.");
    }
  }

  return (
    <div className="onboarding-layout">
      <form className="onboarding-card" onSubmit={submit}>
        <span className="badge teal">Clinic onboarding</span>
        <h1>Create your clinic workspace</h1>
        <p>{status}</p>
        <div className="form-grid">
          <label>Clinic name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Slug<input value={slug} readOnly /></label>
          <label>Clinic type<input value={clinicType} onChange={(e) => setClinicType(e.target.value)} /></label>
          <label>Public email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>City<input value={city} onChange={(e) => setCity(e.target.value)} /></label>
          <label>Country<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
        </div>
        <button className="primary-button" type="submit">Create workspace</button>
      </form>
    </div>
  );
}
