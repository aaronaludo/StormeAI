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

export type ClinicWorkspace = { id: string; name: string; slug: string };

export async function createClinicWorkspace(input: ClinicOnboardingInput): Promise<ClinicWorkspace> {
  if (!supabase) throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in before creating a clinic workspace.");

  const { data, error } = await supabase
    .rpc("create_clinic_workspace", {
      clinic_name: input.name,
      clinic_slug: input.slug,
      clinic_type: input.clinicType,
      clinic_email: input.email,
      clinic_city: input.city,
      clinic_country: input.country || "PH",
    })
    .single();

  if (error) throw new Error(formatSupabaseError(error.message));
  if (!data) throw new Error("Clinic workspace was not returned after creation.");

  return data as ClinicWorkspace;
}

function formatSupabaseError(message: string) {
  if (message.includes("duplicate key") && message.includes("clinics_slug_key")) {
    return "That clinic slug is already taken. Try changing the clinic name or slug.";
  }

  if (message.includes("violates check constraint") && message.includes("clinics_slug_check")) {
    return "Clinic slug can only use lowercase letters, numbers, and hyphens.";
  }

  return message;
}
