import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";
import { ExportBar } from "@/components/export-bar";
import { Radio, Plus, Loader2, X, Trash2, Pencil, CheckCircle2, XCircle, Settings, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { syncTraccarPositions, testTraccarConnection } from "@/lib/traccar.functions";

export const Route = createFileRoute("/app/gps")({
  component: GpsPage,
});


type Device = {
  id: string;
  device_serial: string;
  device_model: string | null;
  sim_number: string | null;
  vehicle_id: string | null;
  status: string;
  last_seen_at: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  notes: string | null;
  archived_at: string | null;
};
type Vehicle = { id: string; plate_number: string };

function GpsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, v] = await Promise.all([
      supabase.from("gps_devices").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("id,plate_number").is("archived_at", null),
    ]);
    setDevices((d.data ?? []) as Device[]);
    setVehicles((v.data ?? []) as Vehicle[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = devices.filter((d) => (showArchived ? d.archived_at : !d.archived_at));

  const vehicleLabel = (id: string | null) =>
    id ? vehicles.find((v) => v.id === id)?.plate_number ?? "—" : "—";

  const toggleArchive = async (d: Device) => {
    const archive = !d.archived_at;
    const reason = archive ? window.prompt("سبب الأرشفة (اختياري):") ?? "" : "";
    const { error } = await supabase
      .from("gps_devices")
      .update({
        archived_at: archive ? new Date().toISOString() : null,
        archived_reason: archive ? reason : null,
      } as never)
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(archive ? "تم أرشفة الجهاز" : "تم إعادة تفعيل الجهاز");
    load();
  };

  const del = async (d: Device) => {
    if (!confirm(`حذف الجهاز ${d.device_serial}؟`)) return;
    const { error } = await supabase.from("gps_devices").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  };

  return (
    <>
      <PageHeader
        title="أجهزة GPS"
        subtitle="إدارة أجهزة التتبع وربطها بالمركبات"
        action={
          <div className="flex items-center gap-2">
            <ExportBar
              filename="gps-devices"
              title="أجهزة GPS"
              rows={visible}
              columns={[
                { key: "device_serial", label: "الرقم التسلسلي" },
                { key: "device_model", label: "الطراز" },
                { key: "sim_number", label: "رقم الشريحة" },
                { key: "vehicle_id", label: "المركبة", format: (r) => vehicleLabel(r.vehicle_id) },
                { key: "status", label: "الحالة" },
                { key: "last_seen_at", label: "آخر ظهور" },
              ]}
            />
            <button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" /> إضافة جهاز
            </button>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          عرض المؤرشفة
        </label>
        <span className="text-xs text-muted-foreground">
          الإجمالي: {visible.length} جهاز
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
          <Radio className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-bold">لا توجد أجهزة GPS</h3>
          <p className="mt-1 text-sm text-muted-foreground">أضف أول جهاز تتبع لأسطولك</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-right text-xs font-bold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">الرقم التسلسلي</th>
                <th className="px-4 py-3">الطراز</th>
                <th className="px-4 py-3">SIM</th>
                <th className="px-4 py-3">المركبة</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">آخر إحداثيات</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((d) => (
                <tr key={d.id} className={d.archived_at ? "opacity-60" : ""}>
                  <td className="px-4 py-3 font-mono font-semibold">{d.device_serial}</td>
                  <td className="px-4 py-3">{d.device_model ?? "—"}</td>
                  <td className="px-4 py-3">{d.sim_number ?? "—"}</td>
                  <td className="px-4 py-3">{vehicleLabel(d.vehicle_id)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        d.status === "active"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {d.last_latitude && d.last_longitude
                      ? `${Number(d.last_latitude).toFixed(4)}, ${Number(d.last_longitude).toFixed(4)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        title="تعديل"
                        onClick={() => {
                          setEditing(d);
                          setOpen(true);
                        }}
                        className="rounded p-1.5 hover:bg-secondary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title={d.archived_at ? "إعادة تفعيل" : "أرشفة"}
                        onClick={() => toggleArchive(d)}
                        className="rounded p-1.5 hover:bg-secondary"
                      >
                        {d.archived_at ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-warning" />
                        )}
                      </button>
                      <button
                        title="حذف"
                        onClick={() => del(d)}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <DeviceDialog
          device={editing}
          vehicles={vehicles}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}

function DeviceDialog({
  device,
  vehicles,
  onClose,
  onSaved,
}: {
  device: Device | null;
  vehicles: Vehicle[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    device_serial: device?.device_serial ?? "",
    device_model: device?.device_model ?? "",
    sim_number: device?.sim_number ?? "",
    vehicle_id: device?.vehicle_id ?? "",
    status: device?.status ?? "active",
    notes: device?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.device_serial.trim()) return toast.error("الرقم التسلسلي مطلوب");
    setSaving(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .maybeSingle();
    if (!profile?.tenant_id) {
      setSaving(false);
      return toast.error("لا توجد شركة مرتبطة");
    }
    const payload = {
      device_serial: form.device_serial.trim(),
      device_model: form.device_model || null,
      sim_number: form.sim_number || null,
      vehicle_id: form.vehicle_id || null,
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = device
      ? await supabase.from("gps_devices").update(payload).eq("id", device.id)
      : await supabase
          .from("gps_devices")
          .insert({ ...payload, tenant_id: profile.tenant_id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(device ? "تم التحديث" : "تمت الإضافة");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{device ? "تعديل جهاز GPS" : "إضافة جهاز GPS"}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3">
          <Field label="الرقم التسلسلي *">
            <input
              value={form.device_serial}
              onChange={(e) => setForm({ ...form, device_serial: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الطراز">
              <input
                value={form.device_model}
                onChange={(e) => setForm({ ...form, device_model: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="رقم الشريحة (SIM)">
              <input
                value={form.sim_number}
                onChange={(e) => setForm({ ...form, sim_number: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المركبة">
              <select
                value={form.vehicle_id}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                className="input"
              >
                <option value="">— بدون —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الحالة">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input"
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="maintenance">صيانة</option>
              </select>
            </Field>
          </div>
          <Field label="ملاحظات">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[70px]"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
          >
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;border:1px solid hsl(var(--border));border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;background:hsl(var(--background))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
