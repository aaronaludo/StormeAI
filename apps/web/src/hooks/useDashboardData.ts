import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export type DashboardMetric = {
  label: string;
  value: string;
  delta: string;
};

export type DashboardData = {
  loading: boolean;
  error?: string;
  clinicName: string;
  metrics: DashboardMetric[];
  recentAppointments: { patient: string; service: string; status: string; time: string }[];
  knowledgeGaps: number;
};

const fallbackData: DashboardData = {
  loading: false,
  clinicName: "Storme Dental Clinic",
  metrics: [
    { label: "Chats today", value: "48", delta: "demo data" },
    { label: "Booking requests", value: "12", delta: "demo data" },
    { label: "Human handoffs", value: "4", delta: "demo data" },
    { label: "Knowledge gaps", value: "7", delta: "demo data" },
  ],
  recentAppointments: [],
  knowledgeGaps: 7,
};

export function useDashboardData(clinicId?: string): DashboardData {
  const [data, setData] = useState<DashboardData>({ ...fallbackData, loading: Boolean(clinicId) });

  useEffect(() => {
    if (!clinicId || !supabase) {
      setData({ ...fallbackData, loading: false, error: !supabase ? "Supabase not configured; showing demo data." : undefined });
      return;
    }

    const client = supabase;
    let cancelled = false;
    async function load() {
      setData((current) => ({ ...current, loading: true }));
      const [clinicResult, appointmentsResult, chatsResult, handoffsResult, gapsResult] = await Promise.all([
        client.from("clinics").select("name").eq("id", clinicId).single(),
        client.from("appointments").select("status, scheduled_start_at, requested_start_at, patients(full_name), services(name)").eq("clinic_id", clinicId).limit(5),
        client.from("chat_sessions").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId),
        client.from("chat_sessions").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("handoff_requested", true),
        client.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "draft"),
      ]);

      if (cancelled) return;
      if (clinicResult.error) {
        setData({ ...fallbackData, loading: false, error: clinicResult.error.message });
        return;
      }

      setData({
        loading: false,
        clinicName: clinicResult.data?.name || fallbackData.clinicName,
        metrics: [
          { label: "Chats", value: String(chatsResult.count || 0), delta: "all time" },
          { label: "Booking requests", value: String(appointmentsResult.data?.length || 0), delta: "latest records" },
          { label: "Human handoffs", value: String(handoffsResult.count || 0), delta: "needs staff" },
          { label: "Knowledge gaps", value: String(gapsResult.count || 0), delta: "needs content" },
        ],
        recentAppointments: (appointmentsResult.data || []).map((row: any) => ({
          patient: row.patients?.full_name || "Unknown patient",
          service: row.services?.name || "General appointment",
          status: row.status,
          time: row.scheduled_start_at || row.requested_start_at || "No time set",
        })),
        knowledgeGaps: gapsResult.count || 0,
      });
    }

    void load();
    return () => { cancelled = true; };
  }, [clinicId]);

  return useMemo(() => data, [data]);
}
