import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { Package, Plus, Trash2, Loader2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExportBar } from "@/components/export-bar";
import { SearchInput, matchQuery } from "@/components/search-input";

export const Route = createFileRoute("/app/inventory")({
  component: InventoryPage,
});

type Warehouse = { id: string; name: string };
type Location = {
  id: string; warehouse_id: string; code: string; name: string | null; zone: string | null;
  capacity_m3: number | null;
};
type Item = {
  id: string; warehouse_id: string; location_id: string | null;
  sku: string; name: string; unit: string | null; quantity: number;
  min_quantity: number | null; unit_cost: number | null;
};
type Movement = {
  id: string; movement_type: string; item_id: string;
  from_warehouse_id: string | null; to_warehouse_id: string | null;
  quantity: number; reference: string | null; notes: string | null; created_at: string;
};

function InventoryPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const { data: profile } = await supabase.from("profiles").select("tenant_id").maybeSingle();
    setTenantId(profile?.tenant_id ?? null);
    const [wh, loc, it, mv] = await Promise.all([
      supabase.from("warehouses").select("id,name").order("name"),
      supabase.from("warehouse_locations").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory_items").select("*").order("created_at", { ascending: false }),
      supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setWarehouses((wh.data as Warehouse[]) ?? []);
    setLocations((loc.data as Location[]) ?? []);
    setItems((it.data as Item[]) ?? []);
    setMovements((mv.data as Movement[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const whById = useMemo(() => new Map(warehouses.map((w) => [w.id, w.name])), [warehouses]);
  const totalStockValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost ?? 0), 0);
  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.min_quantity ?? 0));

  return (
    <>
      <PageHeader
        title="المخزون والحركات"
        subtitle="مواقع التخزين، الأصناف، حركات الاستلام والتسليم والتحويل"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Kpi label="عدد الأصناف" value={items.length.toString()} />
        <Kpi label="مواقع التخزين" value={locations.length.toString()} />
        <Kpi label="قيمة المخزون" value={`${totalStockValue.toLocaleString()} MAD`} />
        <Kpi label="أصناف تحت الحد الأدنى" value={lowStock.length.toString()} tone={lowStock.length ? "danger" : "ok"} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
      ) : (
        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">الأصناف</TabsTrigger>
            <TabsTrigger value="locations">مواقع التخزين</TabsTrigger>
            <TabsTrigger value="movements">الحركات</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <ItemsTab
              tenantId={tenantId} items={items} warehouses={warehouses} locations={locations}
              whById={whById} onChange={loadAll}
            />
          </TabsContent>

          <TabsContent value="locations" className="mt-4">
            <LocationsTab
              tenantId={tenantId} locations={locations} warehouses={warehouses}
              whById={whById} onChange={loadAll}
            />
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <MovementsTab
              tenantId={tenantId} items={items} warehouses={warehouses} movements={movements}
              itemById={itemById} whById={whById} onChange={loadAll}
            />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "danger" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-black ${tone === "danger" ? "text-destructive" : tone === "ok" ? "text-success" : ""}`}>{value}</div>
    </div>
  );
}

/* ---------------- Items ---------------- */
function ItemsTab({
  tenantId, items, warehouses, locations, whById, onChange,
}: {
  tenantId: string | null; items: Item[]; warehouses: Warehouse[]; locations: Location[];
  whById: Map<string, string>; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    warehouse_id: "", location_id: "", sku: "", name: "",
    unit: "pcs", quantity: "0", min_quantity: "0", unit_cost: "0",
  });
  const filtered = useMemo(() => matchQuery(items, q, ["sku", "name"]), [items, q]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return toast.error("لا توجد شركة");
    if (!form.warehouse_id) return toast.error("اختر مستودعاً");
    setSaving(true);
    const { error } = await supabase.from("inventory_items").insert({
      tenant_id: tenantId,
      warehouse_id: form.warehouse_id,
      location_id: form.location_id || null,
      sku: form.sku, name: form.name, unit: form.unit || "pcs",
      quantity: Number(form.quantity) || 0,
      min_quantity: Number(form.min_quantity) || 0,
      unit_cost: Number(form.unit_cost) || 0,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إضافة الصنف");
    setOpen(false);
    setForm({ warehouse_id: "", location_id: "", sku: "", name: "", unit: "pcs", quantity: "0", min_quantity: "0", unit_cost: "0" });
    onChange();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الصنف؟")) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); onChange(); }
  };

  const availLocations = locations.filter((l) => l.warehouse_id === form.warehouse_id);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="ابحث بالرمز أو الاسم…" />
        <div className="flex flex-wrap gap-2">
        <ExportBar
          filename="inventory-items"
          title="جرد المخزون"
          rows={filtered}
          columns={[
            { key: "sku", label: "SKU" },
            { key: "name", label: "الاسم" },
            { key: "warehouse", label: "المستودع", format: (r) => whById.get(r.warehouse_id) ?? "" },
            { key: "quantity", label: "الكمية" },
            { key: "unit", label: "الوحدة" },
            { key: "unit_cost", label: "التكلفة" },
          ]}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" />صنف جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة صنف</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المستودع *</Label>
                  <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v, location_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الموقع</Label>
                  <Select value={form.location_id} onValueChange={(v) => setForm({ ...form, location_id: v })} disabled={!form.warehouse_id}>
                    <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                    <SelectContent>{availLocations.map((l) => <SelectItem key={l.id} value={l.id}>{l.code}{l.name ? ` — ${l.name}` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>SKU *</Label><Input required dir="ltr" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                <div><Label>الاسم *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><Label>الكمية</Label><Input type="number" dir="ltr" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>الوحدة</Label><Input dir="ltr" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div><Label>الحد الأدنى</Label><Input type="number" dir="ltr" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} /></div>
                <div><Label>التكلفة</Label><Input type="number" dir="ltr" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="لا توجد أصناف بعد" description="أضف صنفاً جديداً للبدء." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-right">SKU</th>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">المستودع</th>
                <th className="p-3 text-right">الكمية</th>
                <th className="p-3 text-right">الحد الأدنى</th>
                <th className="p-3 text-right">التكلفة</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const low = Number(i.quantity) <= Number(i.min_quantity ?? 0);
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="p-3 font-mono text-xs" dir="ltr">{i.sku}</td>
                    <td className="p-3 font-semibold">{i.name}</td>
                    <td className="p-3">{whById.get(i.warehouse_id) ?? "—"}</td>
                    <td className={`p-3 font-bold ${low ? "text-destructive" : ""}`} dir="ltr">{Number(i.quantity).toLocaleString()} {i.unit}</td>
                    <td className="p-3 text-muted-foreground" dir="ltr">{i.min_quantity ?? 0}</td>
                    <td className="p-3" dir="ltr">{Number(i.unit_cost ?? 0).toLocaleString()}</td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" onClick={() => remove(i.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------------- Locations ---------------- */
function LocationsTab({
  tenantId, locations, warehouses, whById, onChange,
}: {
  tenantId: string | null; locations: Location[]; warehouses: Warehouse[];
  whById: Map<string, string>; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ warehouse_id: "", code: "", name: "", zone: "", capacity_m3: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return toast.error("لا توجد شركة");
    if (!form.warehouse_id) return toast.error("اختر مستودعاً");
    setSaving(true);
    const { error } = await supabase.from("warehouse_locations").insert({
      tenant_id: tenantId, warehouse_id: form.warehouse_id,
      code: form.code, name: form.name || null, zone: form.zone || null,
      capacity_m3: form.capacity_m3 ? Number(form.capacity_m3) : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم إضافة الموقع");
    setOpen(false);
    setForm({ warehouse_id: "", code: "", name: "", zone: "", capacity_m3: "" });
    onChange();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الموقع؟")) return;
    const { error } = await supabase.from("warehouse_locations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف"); onChange(); }
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4" />موقع جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة موقع تخزين</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>المستودع *</Label>
                <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الرمز *</Label><Input required dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>المنطقة</Label><Input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} /></div>
                <div><Label>السعة (m³)</Label><Input type="number" dir="ltr" value={form.capacity_m3} onChange={(e) => setForm({ ...form, capacity_m3: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {locations.length === 0 ? (
        <EmptyState icon={Package} title="لا توجد مواقع بعد" description="أضف موقع تخزين لبدء تنظيم المستودع." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الرمز</th>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">المستودع</th>
                <th className="p-3 text-right">المنطقة</th>
                <th className="p-3 text-right">السعة</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3 font-mono text-xs" dir="ltr">{l.code}</td>
                  <td className="p-3">{l.name ?? "—"}</td>
                  <td className="p-3">{whById.get(l.warehouse_id) ?? "—"}</td>
                  <td className="p-3">{l.zone ?? "—"}</td>
                  <td className="p-3" dir="ltr">{l.capacity_m3 ? `${Number(l.capacity_m3).toLocaleString()} m³` : "—"}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => remove(l.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------------- Movements ---------------- */
function MovementsTab({
  tenantId, items, warehouses, movements, itemById, whById, onChange,
}: {
  tenantId: string | null; items: Item[]; warehouses: Warehouse[]; movements: Movement[];
  itemById: Map<string, Item>; whById: Map<string, string>; onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    movement_type: "receive", item_id: "", quantity: "", to_warehouse_id: "", reference: "", notes: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return toast.error("لا توجد شركة");
    const qty = Number(form.quantity);
    if (!form.item_id || !qty || qty <= 0) return toast.error("أدخل صنفاً وكمية صالحة");
    const item = itemById.get(form.item_id);
    if (!item) return toast.error("صنف غير موجود");

    setSaving(true);
    let newQty = Number(item.quantity);
    let from: string | null = null;
    let to: string | null = null;

    if (form.movement_type === "receive") {
      newQty += qty; to = item.warehouse_id;
    } else if (form.movement_type === "deliver") {
      newQty -= qty; from = item.warehouse_id;
    } else if (form.movement_type === "transfer") {
      if (!form.to_warehouse_id) { setSaving(false); return toast.error("اختر المستودع الوجهة"); }
      from = item.warehouse_id; to = form.to_warehouse_id;
    } else if (form.movement_type === "adjust") {
      newQty = qty;
    }

    // Update item
    const updates: Partial<Item> = { quantity: newQty };
    if (form.movement_type === "transfer") updates.warehouse_id = form.to_warehouse_id;
    const { error: uerr } = await supabase.from("inventory_items").update(updates).eq("id", form.item_id);
    if (uerr) { setSaving(false); return toast.error(uerr.message); }

    // Insert movement
    const { error } = await supabase.from("stock_movements").insert({
      tenant_id: tenantId,
      movement_type: form.movement_type,
      item_id: form.item_id,
      from_warehouse_id: from,
      to_warehouse_id: to,
      quantity: qty,
      reference: form.reference || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل الحركة");
    setOpen(false);
    setForm({ movement_type: "receive", item_id: "", quantity: "", to_warehouse_id: "", reference: "", notes: "" });
    onChange();
  };

  const typeLabel = (t: string) =>
    ({ receive: "استلام", deliver: "تسليم", transfer: "تحويل", adjust: "تسوية" })[t] ?? t;

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2 justify-end">
        <ExportBar
          filename="stock-movements"
          title="حركات المخزون"
          rows={movements}
          columns={[
            { key: "created_at", label: "التاريخ", format: (r) => new Date(r.created_at).toLocaleString("ar-MA") },
            { key: "movement_type", label: "النوع", format: (r) => typeLabel(r.movement_type) },
            { key: "item", label: "الصنف", format: (r) => itemById.get(r.item_id)?.name ?? "" },
            { key: "quantity", label: "الكمية" },
            { key: "from", label: "من", format: (r) => (r.from_warehouse_id ? (whById.get(r.from_warehouse_id) ?? "") : "") },
            { key: "to", label: "إلى", format: (r) => (r.to_warehouse_id ? (whById.get(r.to_warehouse_id) ?? "") : "") },
            { key: "reference", label: "المرجع" },
          ]}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><ArrowLeftRight className="h-4 w-4" />حركة جديدة</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>تسجيل حركة مخزون</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>نوع الحركة *</Label>
                  <Select value={form.movement_type} onValueChange={(v) => setForm({ ...form, movement_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receive">استلام</SelectItem>
                      <SelectItem value="deliver">تسليم</SelectItem>
                      <SelectItem value="transfer">تحويل</SelectItem>
                      <SelectItem value="adjust">جرد / تسوية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الصنف *</Label>
                  <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({whById.get(i.warehouse_id) ?? ""} — {i.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.movement_type === "transfer" && (
                <div>
                  <Label>المستودع الوجهة *</Label>
                  <Select value={form.to_warehouse_id} onValueChange={(v) => setForm({ ...form, to_warehouse_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{form.movement_type === "adjust" ? "الكمية النهائية *" : "الكمية *"}</Label>
                  <Input required type="number" step="any" dir="ltr" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div><Label>المرجع</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              </div>
              <div><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {movements.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="لا توجد حركات بعد" description="سجّل أول حركة استلام أو تسليم." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">الصنف</th>
                <th className="p-3 text-right">الكمية</th>
                <th className="p-3 text-right">من</th>
                <th className="p-3 text-right">إلى</th>
                <th className="p-3 text-right">المرجع</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3 text-xs text-muted-foreground" dir="ltr">{new Date(m.created_at).toLocaleString("ar-MA")}</td>
                  <td className="p-3 font-semibold">{typeLabel(m.movement_type)}</td>
                  <td className="p-3">{itemById.get(m.item_id)?.name ?? "—"}</td>
                  <td className="p-3 font-bold" dir="ltr">{Number(m.quantity).toLocaleString()}</td>
                  <td className="p-3">{m.from_warehouse_id ? whById.get(m.from_warehouse_id) : "—"}</td>
                  <td className="p-3">{m.to_warehouse_id ? whById.get(m.to_warehouse_id) : "—"}</td>
                  <td className="p-3 text-muted-foreground">{m.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
