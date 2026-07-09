import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const location = useLocation();
  const [gateChecked, setGateChecked] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    applyPrintBrand().catch(() => {});
    (async () => {
      const uid = session.user.id;
      const { data: p } = await supabase
        .from("profiles")
        .select("customer_id, driver_id, tenant_id")
        .eq("id", uid)
        .maybeSingle();
      if (p?.customer_id) return navigate({ to: "/portal" });
      if (p?.driver_id) return navigate({ to: "/driver" });

      // License gate — bypass for system owner
      const { data: sysOwner } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "system_owner")
        .maybeSingle();
      if (sysOwner) {
        setGateChecked(true);
        return;
      }

      if (!p?.tenant_id) {
        setGateChecked(true);
        return;
      }

      const nowIso = new Date().toISOString();
      const { data: lic } = await supabase
        .from("license_keys")
        .select("id")
        .eq("tenant_id", p.tenant_id)
        .is("revoked_at", null)
        .not("activated_at", "is", null)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .limit(1)
        .maybeSingle();

      if (!lic && location.pathname !== "/app/license") {
        navigate({ to: "/app/license" });
      }
      setGateChecked(true);
    })();
  }, [session, navigate, location.pathname]);

  if (loading || !session || !gateChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return <DashboardLayout />;
}
