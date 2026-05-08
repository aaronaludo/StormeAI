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
  if (clinicId) localStorage.setItem(CLINIC_KEY, clinicId);
  else localStorage.removeItem(CLINIC_KEY);
  localStorage.removeItem(RECEPTIONIST_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function setSelectedReceptionist(receptionistId?: string) {
  if (receptionistId) localStorage.setItem(RECEPTIONIST_KEY, receptionistId);
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
