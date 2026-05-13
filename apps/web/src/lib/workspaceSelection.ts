const ORGANIZATION_KEY = "stormeai:selectedOrganizationId";
const AGENT_KEY = "stormeai:selectedAgentId";
const EVENT_NAME = "stormeai-workspace-changed";

export type WorkspaceSelection = {
  organizationId?: string;
  agentId?: string;
};

export function getWorkspaceSelection(): WorkspaceSelection {
  return {
    organizationId: localStorage.getItem(ORGANIZATION_KEY) || undefined,
    agentId: localStorage.getItem(AGENT_KEY) || undefined,
  };
}

export function setSelectedOrganization(organizationId?: string) {
  const current = getWorkspaceSelection();
  const nextOrganizationId = organizationId || undefined;

  if (current.organizationId === nextOrganizationId && !current.agentId) return;

  if (nextOrganizationId) localStorage.setItem(ORGANIZATION_KEY, nextOrganizationId);
  else localStorage.removeItem(ORGANIZATION_KEY);
  localStorage.removeItem(AGENT_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function setSelectedAgent(agentId?: string) {
  const current = getWorkspaceSelection();
  const nextAgentId = agentId || undefined;

  if (current.agentId === nextAgentId) return;

  if (nextAgentId) localStorage.setItem(AGENT_KEY, nextAgentId);
  else localStorage.removeItem(AGENT_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function persistWorkspaceSelection(selection: WorkspaceSelection) {
  const current = getWorkspaceSelection();
  const nextOrganizationId = selection.organizationId || undefined;
  const nextAgentId = selection.agentId || undefined;

  if (current.organizationId === nextOrganizationId && current.agentId === nextAgentId) return;

  if (nextOrganizationId) localStorage.setItem(ORGANIZATION_KEY, nextOrganizationId);
  else localStorage.removeItem(ORGANIZATION_KEY);

  if (nextAgentId) localStorage.setItem(AGENT_KEY, nextAgentId);
  else localStorage.removeItem(AGENT_KEY);

  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeWorkspaceSelection(listener: () => void) {
  window.addEventListener(EVENT_NAME, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener("storage", listener);
  };
}
