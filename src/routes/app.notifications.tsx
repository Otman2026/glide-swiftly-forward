import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, Trash2, Loader2, AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
});

type Notif = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const SEVERITY: Record<string, { icon: any; tint: string; bg: string }> = {
  info: { icon: Info, tint: "text-primary", bg: "bg-primary/10" },
  success: { icon: CheckCircle2, tint: "text-success", bg: "bg-success/10" },
  warning: { icon: AlertTriangle, tint: "text-warning-foreground", bg: "bg-warning/20" },
  error: { icon: XCircle, tint: "text-destructive", bg: "bg-destructive/10" },
};

function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data ?? []) as Notif[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
  };

  const markAllRead = async () => {
    const ids = items.filter((x) => !x.is_read).map((x) => x.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
    toast.success("تم تعليم الكل كمقروء");
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setItems((xs) => xs.filter((x) => x.id !== id));
  };

  const filtered = filter === "unread" ? items.filter((x) => !x.is_read) : items;
  const unreadCount = items.filter((x) => !x.is_read).length;

  return (
    <>
      <PageHeader
        title="الإشعارات"
        subtitle={`${unreadCount} إشعار غير مقروء`}
        action={
          <button
            onClick={markAllRead}
            disabled={!unreadCount}
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> تعليم الكل كمقروء
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "all" ? `الكل (${items.length})` : `غير مقروء (${unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="لا توجد إشعارات" description="ستظهر هنا كل التنبيهات الخاصة بالوثائق المنتهية والصيانة والطلبات." />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const s = SEVERITY[n.severity] ?? SEVERITY.info;
            const Icon = s.icon;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition ${
                  n.is_read ? "border-border bg-card" : "border-accent/40 bg-accent/5"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.bg} ${s.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{n.title}</div>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </div>
                  {n.message && <div className="mt-1 text-sm text-muted-foreground">{n.message}</div>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(n.created_at).toLocaleString("ar")}</span>
                    {n.link && (
                      <Link to={n.link as any} className="font-semibold text-accent hover:underline">
                        فتح →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="تعليم كمقروء"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
