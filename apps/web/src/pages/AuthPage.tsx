import { FormEvent, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export function AuthPage() {
  const [email, setEmail] = useState("owner@clinic.com");
  const [password, setPassword] = useState("password123");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("Use Supabase Auth to access the clinic workspace.");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase env vars are missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setMessage(result.error ? result.error.message : `${mode === "sign-in" ? "Signed in" : "Signed up"}. Continue to onboarding.`);
  }

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={submit}>
        <span className="badge teal">Supabase Auth</span>
        <h1>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
        <p>{message}</p>
        {!isSupabaseConfigured && <div className="emergency-box">Missing Supabase frontend env vars.</div>}
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="primary-button" type="submit">{mode === "sign-in" ? "Sign in" : "Sign up"}</button>
        <button className="ghost-button" type="button" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>Switch to {mode === "sign-in" ? "sign up" : "sign in"}</button>
      </form>
    </div>
  );
}
