import { supabase } from "./supabase";

export type OrganizationOption = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "owner" | "admin" | "staff" | "viewer";
};

type OrganizationWorkspaceRow = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: OrganizationOption["role"];
};

function mapOrganizationRows(rows: OrganizationWorkspaceRow[] | null | undefined): OrganizationOption[] {
  return ((rows || []) as OrganizationWorkspaceRow[]).map((row) => ({
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    organizationSlug: row.organization_slug,
    role: row.role,
  }));
}

export async function ensureDefaultOrganization(): Promise<OrganizationOption | null> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("ensure_default_organization");
  if (error) throw new Error(error.message);

  return mapOrganizationRows(data as OrganizationWorkspaceRow[])[0] || null;
}

export async function getUserOrganization(): Promise<OrganizationOption[]> {
  if (!supabase) throw new Error("Supabase is not configured.");

  await ensureDefaultOrganization();

  const { data, error } = await supabase.rpc("get_user_organization");
  if (error) throw new Error(error.message);

  return mapOrganizationRows(data as OrganizationWorkspaceRow[]);
}
