import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type SubscriptionInfo = {
  loading: boolean;
  status: string | null; // active | trial | expired | canceled | null
  plan: string | null;
  endsAt: string | null;
  daysLeft: number | null;
  isExpired: boolean;
  isReadOnly: boolean;
};

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo>({
    loading: true,
    status: null,
    plan: null,
    endsAt: null,
    daysLeft: null,
    isExpired: false,
    isReadOnly: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setInfo((p) => ({ ...p, loading: false }));
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.tenant_id) {
        if (!cancelled) setInfo((p) => ({ ...p, loading: false }));
        return;
      }
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan,status,ends_at")
        .eq("tenant_id", profile.tenant_id)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!sub) {
        setInfo({
          loading: false,
          status: null,
          plan: null,
          endsAt: null,
          daysLeft: null,
          isExpired: false,
          isReadOnly: false,
        });
        return;
      }
      const endsAt = sub.ends_at as string | null;
      const now = new Date();
      const end = endsAt ? new Date(endsAt) : null;
      const daysLeft = end
        ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const expired =
        sub.status === "expired" ||
        sub.status === "canceled" ||
        (end !== null && end.getTime() < now.getTime());
      setInfo({
        loading: false,
        status: sub.status,
        plan: sub.plan,
        endsAt,
        daysLeft,
        isExpired: expired,
        isReadOnly: expired,
      });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return info;
}
