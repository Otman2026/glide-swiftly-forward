import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Truck, LogOut, Loader2, CheckCircle2, Play, MapPin, Camera, Wallet, Eraser, Signature,
} from "lucide-react";

export const Route = createFileRoute("/driver")({
  component: DriverPage,
});

type Trip = {
  id: string; trip_number: string; origin: string; destination: string;
  status: string; start_date: string | null; end_date: string | null;
  distance_km: number | null; revenue: number | null; vehicle_id: string | null;
  tenant_id: string;
};

const STATUS_LABEL: Record<string, string> = {
  planned: "مجدولة", in_progress: "جارية", completed: "منتهية", cancelled: "ملغاة",
};

function DriverPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; full_name: string | null; driver_id: string | null; tenant_id: string | null } | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [podTrip, setPodTrip] = useState<Trip | null>(null);
  const [expTrip, setExpTrip] = useState<Trip | null>(null);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { navigate({ to: "/auth" }); return; }
    const { data: p } = await supabase.from("profiles").select("id, full_name, driver_id, tenant_id").eq("id", u.user.id).maybeSingle();
    setProfile(p);
    if (!p?.driver_id) { setLoading(false); return; }
    const [{ data: d }, { data: ts }] = await Promise.all([
      supabase.from("drivers").select("full_name").eq("id", p.driver_id).maybeSingle(),
      supabase.from("trips").select("id, trip_number, origin, destination, status, start_date, end_date, distance_km, revenue, vehicle_id, tenant_id").order("start_date", { ascending: false }),
    ]);
    setDriverName(d?.full_name ?? null);
    setTrips((ts ?? []) as Trip[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function startTrip(id: string) {
    const { error } = await supabase.from("trips").update({ status: "in_progress", start_date: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("بدأت الرحلة");
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
                  <div className="flex flex-wrap gap-2 mt-3">
                    {t.status === "planned" && (
                      <Button size="sm" onClick={() => startTrip(t.id)}><Play className="ms-1 h-3 w-3" />بدء الرحلة</Button>
                    )}
                    {t.status === "in_progress" && (
                      <Button size="sm" onClick={() => setPodTrip(t)} className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle2 className="ms-1 h-3 w-3" />إثبات التسليم
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setExpTrip(t)}>
                      <Wallet className="ms-1 h-3 w-3" />مصروف
                    </Button>
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

      {podTrip && profile && (
        <PodDialog
          trip={podTrip}
          driverId={profile.driver_id!}
          onClose={() => setPodTrip(null)}
          onDone={() => { setPodTrip(null); load(); }}
        />
      )}
      {expTrip && profile && (
        <ExpenseDialog
          trip={expTrip}
          onClose={() => setExpTrip(null)}
          onDone={() => { setExpTrip(null); toast.success("تم تسجيل المصروف"); }}
        />
      )}
    </div>
  );
}

/* ------------------- Proof of Delivery ------------------- */
function PodDialog({
  trip, driverId, onClose, onDone,
}: { trip: Trip; driverId: string; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [receiver, setReceiver] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
    ctx.lineTo(x, y); ctx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const clearSig = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };
  const sigBlob = (): Promise<Blob | null> =>
    new Promise((res) => canvasRef.current!.toBlob((b) => res(b), "image/png"));

  async function submit() {
    setSaving(true);
    try {
      // Upload signature
      const sig = await sigBlob();
      if (sig && sig.size > 500) {
        const path = `${trip.tenant_id}/pod/${trip.id}/signature-${Date.now()}.png`;
        const { error: sErr } = await supabase.storage.from("documents").upload(path, sig, { contentType: "image/png" });
        if (sErr) throw sErr;
        await supabase.from("documents").insert({
          tenant_id: trip.tenant_id, doc_type: "pod_signature",
          title: `توقيع تسليم — ${trip.trip_number}`, file_path: path,
          mime_type: "image/png", file_size: sig.size,
          trip_id: trip.id, driver_id: driverId, notes: receiver ? `المستلم: ${receiver}` : null,
        });
      }
      // Upload photos
      for (const f of photos) {
        const path = `${trip.tenant_id}/pod/${trip.id}/${Date.now()}-${f.name}`;
        const { error: uErr } = await supabase.storage.from("documents").upload(path, f, { contentType: f.type });
        if (uErr) throw uErr;
        await supabase.from("documents").insert({
          tenant_id: trip.tenant_id, doc_type: "pod_photo",
          title: `صورة تسليم — ${trip.trip_number}`, file_path: path,
          mime_type: f.type, file_size: f.size,
          trip_id: trip.id, driver_id: driverId,
        });
      }
      // Complete trip
      const finalNotes = [receiver && `المستلم: ${receiver}`, notes].filter(Boolean).join(" — ");
      const { error: tErr } = await supabase.from("trips").update({
        status: "completed",
        end_date: new Date().toISOString().slice(0, 10),
        notes: finalNotes || null,
      }).eq("id", trip.id);
      if (tErr) throw tErr;
      toast.success("تم إثبات التسليم");
      onDone();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إثبات تسليم — {trip.trip_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>اسم المستلم</Label>
            <Input value={receiver} onChange={(e) => setReceiver(e.target.value)} />
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="flex items-center gap-1"><Signature className="h-4 w-4" />التوقيع الإلكتروني</Label>
              <Button type="button" variant="ghost" size="sm" onClick={clearSig}><Eraser className="h-3 w-3 ms-1" />مسح</Button>
            </div>
            <canvas
              ref={canvasRef}
              width={500} height={180}
              className="w-full h-40 rounded-lg border bg-white touch-none"
              onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={endDraw} onPointerLeave={endDraw}
            />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Camera className="h-4 w-4" />صور التسليم</Label>
            <Input
              type="file" accept="image/*" multiple capture="environment"
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            />
            {photos.length > 0 && <p className="text-xs text-muted-foreground mt-1">{photos.length} صورة محددة</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={submit} disabled={saving} className="bg-success text-success-foreground hover:bg-success/90">
            {saving && <Loader2 className="ms-1 h-4 w-4 animate-spin" />}تأكيد التسليم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------- Expense ------------------- */
function ExpenseDialog({
  trip, onClose, onDone,
}: { trip: Trip; onClose: () => void; onDone: () => void }) {
  const [category, setCategory] = useState("fuel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("أدخل مبلغاً صالحاً");
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      tenant_id: trip.tenant_id,
      expense_date: new Date().toISOString().slice(0, 10),
      category, amount: amt,
      description: `${description || ""} (رحلة ${trip.trip_number})`.trim(),
      vehicle_id: trip.vehicle_id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تسجيل مصروف — {trip.trip_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>الفئة</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fuel">وقود</SelectItem>
                <SelectItem value="toll">رسوم طريق</SelectItem>
                <SelectItem value="parking">وقوف</SelectItem>
                <SelectItem value="repair">إصلاح</SelectItem>
                <SelectItem value="food">طعام</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>المبلغ (MAD)</Label>
            <Input type="number" step="any" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>الوصف</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="ms-1 h-4 w-4 animate-spin" />}حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
