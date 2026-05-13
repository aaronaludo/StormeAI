import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export type OrganizationOnboardingInput = {
  name: string;
  slug: string;
  organizationType: string;
  email: string;
  city: string;
  country: string;
};

export type OrganizationWorkspace = { id: string; name: string; slug: string };

export async function createOrganizationWorkspace(input: OrganizationOnboardingInput): Promise<OrganizationWorkspace> {
  if (!supabase) throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in before creating an organization workspace.");

  const { data, error } = await supabase
    .rpc("create_organization_workspace", {
      organization_name: input.name,
      organization_slug: input.slug,
      organization_type: input.organizationType,
      organization_email: input.email,
      organization_city: input.city,
      organization_country: input.country || "PH",
    })
    .single();

  if (error) throw new Error(formatSupabaseError(error.message));
  if (!data) throw new Error("Organization workspace was not returned after creation.");

  return data as OrganizationWorkspace;
}

function formatSupabaseError(message: string) {
  if (message.includes("duplicate key") && message.includes("organizations_slug_key")) {
    return "That organization slug is already taken. Try changing the organization name or slug.";
  }

  if (message.includes("violates check constraint") && message.includes("organizations_slug_check")) {
    return "Organization slug can only use lowercase letters, numbers, and hyphens.";
  }

  return message;
}
