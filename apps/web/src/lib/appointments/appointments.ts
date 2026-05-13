export type AppointmentStatus = "requested" | "confirmed" | "rescheduled" | "canceled" | "completed" | "no_show";

export type AppointmentRequestInput = {
  organizationId: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  serviceId?: string;
  providerId?: string;
  preferredStartAt?: string;
  patientNote?: string;
};

export type AppointmentDraft = {
  patient: { organization_id: string; full_name: string; email?: string; phone?: string };
  appointment: {
    organization_id: string;
    status: AppointmentStatus;
    service_id?: string;
    provider_id?: string;
    requested_start_at?: string;
    patient_note?: string;
    source: "chat";
  };
};

export function buildAppointmentDraft(input: AppointmentRequestInput): AppointmentDraft {
  return {
    patient: {
      organization_id: input.organizationId,
      full_name: input.patientName,
      email: input.patientEmail,
      phone: input.patientPhone,
    },
    appointment: {
      organization_id: input.organizationId,
      status: "requested",
      service_id: input.serviceId,
      provider_id: input.providerId,
      requested_start_at: input.preferredStartAt,
      patient_note: input.patientNote,
      source: "chat",
    },
  };
}

export function validateAppointmentRequest(input: AppointmentRequestInput) {
  const missing: string[] = [];
  if (!input.organizationId) missing.push("organizationId");
  if (!input.patientName) missing.push("patientName");
  if (!input.patientEmail && !input.patientPhone) missing.push("patientEmail or patientPhone");
  if (!input.serviceId) missing.push("serviceId");
  if (!input.preferredStartAt) missing.push("preferredStartAt");
  return { ok: missing.length === 0, missing };
}

export function appointmentStatusLabel(status: AppointmentStatus) {
  return status.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
}
