import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Truck, LogOut, Loader2, CheckCircle2, Play, MapPin } from "lucide-react";

export const Route = createFileRoute("/driver")({
  component: DriverPage,
});

type Trip = {
  id: string; trip_number: string; origin: string; destination: string;
  status: string; start_date: string | null; end_date: string | null;
  distance_km: number | null; revenue: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  planned: "مجدولة", in_progress: "جارية", completed: "منتهية", cancelled: "ملغاة",
};

function DriverPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; full_name: string | null; driver_id: string | null } | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { navigate({ to: "/auth" }); return; }
    const { data: p } = await supabase.from("profiles").select("id, full_name, driver_id").eq("id", u.user.id).maybeSingle();
    setProfile(p);
    if (!p?.driver_id) { setLoading(false); return; }
    const [{ data: d }, { data: ts }] = await Promise.all([
      supabase.from("drivers").select("full_name").eq("id", p.driver_id).maybeSingle(),
      supabase.from("trips").select("id, trip_number, origin, destination, status, start_date, end_date, distance_km, revenue").order("start_date", { ascending: false }),
    ]);
    setDriverName(d?.full_name ?? null);
    setTrips((ts ?? []) as Trip[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const patch: Record<string, string> = { status };
    if (status === "in_progress") patch.start_date = new Date().toISOString().slice(0, 10);
    if (status === "completed") patch.end_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("trips").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث");
    load();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!profile?.driver_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">حسابك غير مرتبط بأي سائق</h1>
          <p className="text-muted-foreground">يجب على مسؤول شركة النقل ربط حسابك بملف السائق.</p>
          <Button variant="outline" onClick={signOut}><LogOut className="ms-2 h-4 w-4" />خروج</Button>
        </div>
      </div>
    );
  }

  const active = trips.filter((t) => t.status === "planned" || t.status === "in_progress");
  const done = trips.filter((t) => t.status === "completed");

  return (
    <div className="min-h-screen bg-secondary/30" dir="rtl">
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold">تطبيق السائق</h1>
          <p className="text-sm opacity-90">{driverName ?? profile.full_name}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-6">
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Play className="h-4 w-4" />رحلاتي الحالية ({active.length})</h2>
          {active.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">لا توجد رحلات نشطة</div>
          ) : (
            <div className="space-y-3">
              {active.map((t) => (
                <div key={t.id} className="rounded-lg border bg-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{t.trip_number}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{t.origin} → {t.destination}</p>
                    </div>
                    <Badge variant={t.status === "in_progress" ? "default" : "outline"}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
                  </div>
                  {t.distance_km && <p className="text-xs text-muted-foreground">المسافة: {t.distance_km} كم</p>}
                  <div className="flex gap-2 mt-3">
                    {t.status === "planned" && (
                      <Button size="sm" onClick={() => updateStatus(t.id, "in_progress")}><Play className="ms-1 h-3 w-3" />بدء الرحلة</Button>
                    )}
                    {t.status === "in_progress" && (
                      <Button size="sm" onClick={() => updateStatus(t.id, "completed")}><CheckCircle2 className="ms-1 h-3 w-3" />تأكيد التسليم</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />رحلاتي المنتهية ({done.length})</h2>
          {done.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm">لا شيء بعد</div>
          ) : (
            <div className="space-y-2">
              {done.slice(0, 20).map((t) => (
                <div key={t.id} className="rounded-lg border bg-card p-3 flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{t.trip_number}</p>
                    <p className="text-xs text-muted-foreground">{t.origin} → {t.destination}</p>
                  </div>
                  <div className="text-left text-xs text-muted-foreground">
                    <p>{t.end_date}</p>
                    {t.distance_km && <p>{t.distance_km} كم</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
