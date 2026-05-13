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
  organizationName: string;
  metrics: DashboardMetric[];
  recentAppointments: { patient: string; service: string; status: string; time: string }[];
  knowledgeGaps: number;
};

const fallbackData: DashboardData = {
  loading: false,
  organizationName: "Storme Dental Organization",
  metrics: [
    { label: "Chats today", value: "48", delta: "demo data" },
    { label: "Booking requests", value: "12", delta: "demo data" },
    { label: "Human handoffs", value: "4", delta: "demo data" },
    { label: "Knowledge gaps", value: "7", delta: "demo data" },
  ],
  recentAppointments: [],
  knowledgeGaps: 7,
};

export function useDashboardData(organizationId?: string): DashboardData {
  const [data, setData] = useState<DashboardData>({ ...fallbackData, loading: Boolean(organizationId) });

  useEffect(() => {
    if (!organizationId || !supabase) {
      setData({ ...fallbackData, loading: false, error: !supabase ? "Supabase not configured; showing demo data." : undefined });
      return;
    }

    const client = supabase;
    let cancelled = false;
    async function load() {
      setData((current) => ({ ...current, loading: true }));
      const [organizationResult, appointmentsResult, chatsResult, handoffsResult, gapsResult] = await Promise.all([
        client.from("organizations").select("name").eq("id", organizationId).single(),
        client.from("appointments").select("status, scheduled_start_at, requested_start_at, patients(full_name), services(name)").eq("organization_id", organizationId).limit(5),
        client.from("chat_sessions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        client.from("chat_sessions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("handoff_requested", true),
        client.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "draft"),
      ]);

      if (cancelled) return;
      if (organizationResult.error) {
        setData({ ...fallbackData, loading: false, error: organizationResult.error.message });
        return;
      }

      setData({
        loading: false,
        organizationName: organizationResult.data?.name || fallbackData.organizationName,
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
  }, [organizationId]);

  return useMemo(() => data, [data]);
}
