import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2, Truck, Plus, X, Navigation } from "lucide-react";
import { toast } from "sonner";
import { ClientOnly } from "@tanstack/react-router";

export const Route = createFileRoute("/app/tracking")({
  component: TrackingPage,
});

type Trip = {
  id: string;
  trip_number: string;
  status: string;
  origin: string | null;
  destination: string | null;
  vehicle_id: string | null;
};

type Loc = { latitude: number; longitude: number; recorded_at: string; speed_kmh: number | null };

function TrackingPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selected, setSelected] = useState<Trip | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const loadTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trips")
      .select("id,trip_number,status,origin,destination,vehicle_id")
      .in("status", ["planned", "in_progress", "started"])
      .order("created_at", { ascending: false });
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
  };

  const loadLocations = async (tripId: string) => {
    const { data } = await supabase
      .from("trip_locations")
      .select("latitude,longitude,recorded_at,speed_kmh")
      .eq("trip_id", tripId)
      .order("recorded_at", { ascending: true })
      .limit(500);
    setLocations((data ?? []) as Loc[]);
  };

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadLocations(selected.id);
    const t = setInterval(() => loadLocations(selected.id), 10000);
    return () => clearInterval(t);
  }, [selected]);

  const last = locations[locations.length - 1];

  return (
    <>
      <PageHeader
        title="التتبع الحي (GPS)"
        subtitle="مواقع الشاحنات والرحلات في الوقت الحقيقي"
        action={
          selected && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" /> إضافة موقع
            </button>
          )
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : trips.length === 0 ? (
        <EmptyState icon={Truck} title="لا توجد رحلات نشطة" description="ابدأ رحلة من صفحة الرحلات لتتبعها هنا." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-2">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full rounded-xl border p-3 text-right transition ${
                  selected?.id === t.id ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold">{t.trip_number}</div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{t.status}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{t.origin} → {t.destination}</div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            {!selected ? (
              <div className="flex h-96 items-center justify-center text-muted-foreground">اختر رحلة لعرض المسار</div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{selected.trip_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {locations.length} نقطة مسجلة
                      {last && ` • آخر تحديث: ${new Date(last.recorded_at).toLocaleTimeString("ar")}`}
                      {last?.speed_kmh != null && ` • ${last.speed_kmh} كم/س`}
                    </div>
                  </div>
                  {last && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${last.latitude}&mlon=${last.longitude}#map=14/${last.latitude}/${last.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      <Navigation className="h-3 w-3" /> فتح في الخريطة
                    </a>
                  )}
                </div>
                <ClientOnly fallback={<div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>}>
                  {() => <TripMap locations={locations} />}
                </ClientOnly>
              </>
            )}
          </div>
        </div>
      )}

      {addOpen && selected && (
        <AddLocationDialog
          trip={selected}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            loadLocations(selected.id);
          }}
        />
      )}
    </>
  );
}

function TripMap({ locations }: { locations: Loc[] }) {
  const [Comp, setComp] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      const { MapContainer, TileLayer, Marker, Polyline, Popup } = await import("react-leaflet");
      // fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setComp({ MapContainer, TileLayer, Marker, Polyline, Popup });
    })();
  }, []);

  if (!Comp) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  const { MapContainer, TileLayer, Marker, Polyline, Popup } = Comp;
  const center: [number, number] = locations.length
    ? [locations[locations.length - 1].latitude, locations[locations.length - 1].longitude]
    : [31.6295, -7.9811]; // Marrakech default
  const path = locations.map((l) => [l.latitude, l.longitude]) as [number, number][];

  return (
    <div className="h-96 overflow-hidden rounded-xl" dir="ltr">
      <MapContainer center={center} zoom={locations.length ? 13 : 6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {path.length > 1 && <Polyline positions={path} color="#3b82f6" weight={4} />}
        {locations.length > 0 && (
          <Marker position={center}>
            <Popup>
              آخر موقع<br />
              {new Date(locations[locations.length - 1].recorded_at).toLocaleString("ar")}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

function AddLocationDialog({ trip, onClose, onSaved }: { trip: Trip; onClose: () => void; onSaved: () => void }) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [speed, setSpeed] = useState("");
  const [saving, setSaving] = useState(false);

  const useCurrent = () => {
    if (!navigator.geolocation) return toast.error("الموقع الجغرافي غير مدعوم");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        if (pos.coords.speed != null) setSpeed((pos.coords.speed * 3.6).toFixed(1));
      },
      () => toast.error("تعذّر جلب الموقع"),
    );
  };

  const submit = async () => {
    if (!lat || !lng) return toast.error("أدخل الإحداثيات");
    setSaving(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) {
      toast.error("لا توجد شركة");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("trip_locations").insert({
      trip_id: trip.id,
      tenant_id: profile.tenant_id,
      latitude: Number(lat),
      longitude: Number(lng),
      speed_kmh: speed ? Number(speed) : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل الموقع");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-background p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">إضافة موقع GPS — {trip.trip_number}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <button onClick={useCurrent} className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent/10 py-2 text-sm font-semibold text-accent">
            <MapPin className="h-4 w-4" /> استخدام موقعي الحالي
          </button>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
            <input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <input placeholder="السرعة (كم/س) — اختياري" value={speed} onChange={(e) => setSpeed(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          <button onClick={submit} disabled={saving} className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
