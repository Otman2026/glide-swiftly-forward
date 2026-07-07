import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { applyPrintBrand } from "@/lib/company";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  component: AppGate,
});

function AppGate() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    applyPrintBrand().catch(() => {});
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("customer_id, driver_id")
        .eq("id", session.user.id)
        .maybeSingle();
      if (p?.customer_id) navigate({ to: "/portal" });
      else if (p?.driver_id) navigate({ to: "/driver" });
    })();
  }, [session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return <DashboardLayout />;
}
