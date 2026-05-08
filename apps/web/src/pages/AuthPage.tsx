import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "update-password";

type AuthPageProps = {
  mode: AuthMode;
};

const authCopy: Record<AuthMode, { eyebrow: string; title: string; subtitle: string; cta: string }> = {
  "sign-in": {
    eyebrow: "Welcome back",
    title: "Sign in to your clinic dashboard",
    subtitle: "Manage patient chats, appointments, clinic knowledge, and receptionist settings in one secure workspace.",
    cta: "Sign in",
  },
  "sign-up": {
    eyebrow: "Start your workspace",
    title: "Create your StormeAI account",
    subtitle: "Set up a chat-only AI receptionist for your clinic — safe answers, bookings, and human handoffs.",
    cta: "Create account",
  },
  "forgot-password": {
    eyebrow: "Account recovery",
    title: "Reset your password",
    subtitle: "Enter your clinic account email and we’ll send a secure password reset link.",
    cta: "Send reset link",
  },
  "update-password": {
    eyebrow: "New password",
    title: "Create a new password",
    subtitle: "Use the recovery link from your email, then set a fresh password for your workspace.",
    cta: "Update password",
  },
};

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Ready when you are.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = authCopy[mode];
  const showPassword = mode !== "forgot-password";
  const helperLinks = useMemo(() => getHelperLinks(mode), [mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!supabase) {
      setStatus("Supabase frontend env vars are missing. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart Vite.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Working on it…");

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setStatus("Signed in. Opening your dashboard…");
        navigate("/dashboard", { replace: true });
        return;
      }

      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        setStatus("Account created. Check your email if confirmation is enabled, then continue to onboarding.");
        return;
      }

      if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setStatus("Reset link sent. Please check your inbox and spam folder.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("Password updated. You can now continue to the dashboard.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-hero-panel">
        <Link className="auth-brand" to="/auth/sign-in">
          <span><Sparkles size={18} /></span>
          StormeAI
        </Link>
        <div>
          <span className="badge teal">Chat-only AI receptionist</span>
          <h1>Give every clinic a safer, faster front desk.</h1>
          <p>Inspired by modern two-column SaaS auth pages: clear value on one side, focused secure form on the other.</p>
        </div>
        <div className="auth-proof-list">
          <Proof icon={ShieldCheck} text="No diagnosis or prescription behavior" />
          <Proof icon={Mail} text="Patient inquiries and appointment requests in one inbox" />
          <Proof icon={LockKeyhole} text="Supabase Auth-backed workspace access" />
        </div>
      </section>

      <section className="auth-form-panel">
        <form className="auth-card modern" onSubmit={submit}>
          <span className="auth-eyebrow">{copy.eyebrow}</span>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>

          {!isSupabaseConfigured && (
            <div className="auth-alert">Missing Supabase frontend env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>
          )}

          {mode !== "update-password" && (
            <label>
              Email address
              <input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} required />
            </label>
          )}

          {showPassword && (
            <label>
              Password
              <input
                type="password"
                value={password}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          )}

          {mode === "sign-in" && <Link className="inline-auth-link right" to="/auth/forgot-password">Forgot password?</Link>}

          <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait…" : copy.cta}
            <ArrowRight size={17} />
          </button>

          <p className="auth-status">{status}</p>

          <div className="auth-switcher">
            {helperLinks.map((link) => (
              <Link key={link.href} to={link.href}>{link.label}</Link>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}

function getHelperLinks(mode: AuthMode) {
  if (mode === "sign-in") return [{ href: "/auth/sign-up", label: "New clinic? Create an account" }];
  if (mode === "sign-up") return [{ href: "/auth/sign-in", label: "Already have an account? Sign in" }];
  if (mode === "forgot-password") return [{ href: "/auth/sign-in", label: "Back to sign in" }];
  return [{ href: "/auth/sign-in", label: "Back to sign in" }];
}

function Proof({ icon: Icon, text }: { icon: React.ComponentType<{ size?: number }>; text: string }) {
  return (
    <div className="auth-proof-item">
      <span><Icon size={16} /></span>
      <strong>{text}</strong>
      <Check size={15} />
    </div>
  );
}
