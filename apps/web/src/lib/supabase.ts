import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export type ClinicOnboardingInput = {
  name: string;
  slug: string;
  clinicType: string;
  email: string;
  city: string;
  country: string;
};

export async function createClinicWorkspace(input: ClinicOnboardingInput) {
  if (!supabase) throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in before creating a clinic workspace.");

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .insert({
      name: input.name,
      slug: input.slug,
      clinic_type: input.clinicType,
      email: input.email,
      city: input.city,
      country: input.country || "PH",
    })
    .select("id,name,slug")
    .single();

  if (clinicError) throw clinicError;

  const { error: memberError } = await supabase.from("clinic_members").insert({
    clinic_id: clinic.id,
    user_id: userData.user.id,
    role: "owner",
  });

  if (memberError) throw memberError;

  await supabase.from("ai_receptionists").insert({ clinic_id: clinic.id, name: "Mia" });
  await supabase.from("billing_subscriptions").insert({ clinic_id: clinic.id, billing_provider: "manual", subscription_status: "trial" });

  return clinic;
}
