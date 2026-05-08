export type StormeAiWorkflowEvent =
  | "appointment.created"
  | "appointment.rescheduled"
  | "appointment.canceled"
  | "chat.handoff_requested"
  | "knowledge.gap_detected"
  | "billing.subscription_changed";

export type WorkflowEventPayload = {
  clinicId: string;
  eventType: StormeAiWorkflowEvent;
  payload: Record<string, unknown>;
};

export function buildWorkflowEvent(input: WorkflowEventPayload) {
  return {
    clinic_id: input.clinicId,
    event_type: input.eventType,
    payload: input.payload,
    delivery_status: "pending",
  };
}

export function n8nWebhookPath(eventType: StormeAiWorkflowEvent) {
  return eventType.replaceAll(".", "-");
}
