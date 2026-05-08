const CLINIC_KEY = "stormeai:selectedClinicId";
const RECEPTIONIST_KEY = "stormeai:selectedReceptionistId";
const EVENT_NAME = "stormeai-workspace-changed";

export type WorkspaceSelection = {
  clinicId?: string;
  receptionistId?: string;
};

export function getWorkspaceSelection(): WorkspaceSelection {
  return {
    clinicId: localStorage.getItem(CLINIC_KEY) || undefined,
    receptionistId: localStorage.getItem(RECEPTIONIST_KEY) || undefined,
  };
}

export function setSelectedClinic(clinicId?: string) {
  const current = getWorkspaceSelection();
  const nextClinicId = clinicId || undefined;

  if (current.clinicId === nextClinicId && !current.receptionistId) return;

  if (nextClinicId) localStorage.setItem(CLINIC_KEY, nextClinicId);
  else localStorage.removeItem(CLINIC_KEY);
  localStorage.removeItem(RECEPTIONIST_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function setSelectedReceptionist(receptionistId?: string) {
  const current = getWorkspaceSelection();
  const nextReceptionistId = receptionistId || undefined;

  if (current.receptionistId === nextReceptionistId) return;

  if (nextReceptionistId) localStorage.setItem(RECEPTIONIST_KEY, nextReceptionistId);
  else localStorage.removeItem(RECEPTIONIST_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function persistWorkspaceSelection(selection: WorkspaceSelection) {
  const current = getWorkspaceSelection();
  const nextClinicId = selection.clinicId || undefined;
  const nextReceptionistId = selection.receptionistId || undefined;

  if (current.clinicId === nextClinicId && current.receptionistId === nextReceptionistId) return;

  if (nextClinicId) localStorage.setItem(CLINIC_KEY, nextClinicId);
  else localStorage.removeItem(CLINIC_KEY);

  if (nextReceptionistId) localStorage.setItem(RECEPTIONIST_KEY, nextReceptionistId);
  else localStorage.removeItem(RECEPTIONIST_KEY);

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
