import { supabase } from "./supabase";

export type ClinicWorkspaceOption = {
  clinicId: string;
  clinicName: string;
  clinicSlug: string;
  role: "owner" | "admin" | "staff" | "viewer";
};

type ClinicWorkspaceRow = {
  clinic_id: string;
  clinic_name: string;
  clinic_slug: string;
  role: ClinicWorkspaceOption["role"];
};

export async function listClinicWorkspaces(): Promise<ClinicWorkspaceOption[]> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("list_clinic_workspaces");
  if (error) throw new Error(error.message);

  return ((data || []) as ClinicWorkspaceRow[]).map((row) => ({
    clinicId: row.clinic_id,
    clinicName: row.clinic_name,
    clinicSlug: row.clinic_slug,
    role: row.role,
  }));
}
