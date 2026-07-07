import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Package,
  Truck,
  UserCog,
  Route as RouteIcon,
  Fuel,
  Wrench,
  AlertTriangle,
  Warehouse,
  FolderArchive,
  Wallet,
  BarChart3,
  Crown,
  Sparkles,
  Settings,
  Shield,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  Home,
  MapPin,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "لوحة القيادة",
    items: [
      { to: "/app", label: "الرئيسية", icon: LayoutDashboard },
      { to: "/app/kpi", label: "مؤشرات KPI", icon: BarChart3 },
      { to: "/app/reports", label: "التقارير", icon: FileText },
      { to: "/app/insights", label: "تحليلات ذكية (AI)", icon: Sparkles },
      { to: "/app/notifications", label: "الإشعارات", icon: Bell },
    ],
  },
  {
    title: "CRM",
    items: [
      { to: "/app/customers", label: "العملاء", icon: Users },
      { to: "/app/contracts", label: "العقود", icon: FileText },
    ],
  },
  {
    title: "TMS — النقل",
    items: [
      { to: "/app/orders", label: "أوامر النقل", icon: ClipboardList },
      { to: "/app/shipments", label: "الشحنات", icon: Package },
      { to: "/app/trips", label: "الرحلات", icon: RouteIcon },
      { to: "/app/tracking", label: "التتبع الحي (GPS)", icon: MapPin },
    ],
  },
  {
    title: "FMS — الأسطول",
    items: [
      { to: "/app/vehicles", label: "المركبات", icon: Truck },
      { to: "/app/drivers", label: "السائقون", icon: UserCog },
      { to: "/app/fuel", label: "الوقود", icon: Fuel },
      { to: "/app/maintenance", label: "الصيانة", icon: Wrench },
      { to: "/app/accidents", label: "الحوادث", icon: AlertTriangle },
      { to: "/app/violations", label: "المخالفات", icon: Shield },
    ],
  },
  {
    title: "اللوجستيك والمالية",
    items: [
      { to: "/app/warehouses", label: "المستودعات", icon: Warehouse },
      { to: "/app/documents", label: "الوثائق", icon: FolderArchive },
      { to: "/app/invoices", label: "الفواتير", icon: FileText },
      { to: "/app/finance", label: "المالية", icon: Wallet },
      { to: "/app/billing", label: "الاشتراكات والدفع", icon: CreditCard },
    ],
  },
  {
    title: "الموارد البشرية",
    items: [
      { to: "/app/hr", label: "الموظفون والرواتب", icon: UserCog },
    ],
  },
  {
    title: "الإعدادات",
    items: [
      { to: "/app/settings", label: "الإعدادات", icon: Settings },
      { to: "/app/users", label: "المستخدمون والصلاحيات", icon: Shield },
    ],
  },
  {
    title: "إدارة النظام",
    items: [{ to: "/app/system-owner", label: "SAIFO Owner", icon: Crown }],
  },
];

const PLAN_LABELS: Record<string, string> = {
  trial: "تجربة",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [me, setMe] = useState<{
    full_name: string | null;
    tenant_name: string | null;
    plan: string | null;
    status: string | null;
    ends_at: string | null;
  }>({
    full_name: null,
    tenant_name: null,
    plan: null,
    status: null,
    ends_at: null,
  });

  useEffect(() => {
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, tenant_id")
        .maybeSingle();
      let tenant_name: string | null = null;
      let subscription: { plan: string | null; status: string | null; ends_at: string | null } = {
        plan: null,
        status: null,
        ends_at: null,
      };
      if (profile?.tenant_id) {
        const [{ data: t }, { data: sub }] = await Promise.all([
          supabase.from("tenants").select("name").eq("id", profile.tenant_id).maybeSingle(),
          supabase
            .from("subscriptions")
            .select("plan,status,ends_at")
            .eq("tenant_id", profile.tenant_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        tenant_name = t?.name ?? null;
        subscription = {
          plan: sub?.plan ?? null,
          status: sub?.status ?? null,
          ends_at: sub?.ends_at ?? null,
        };
      }
      setMe({ full_name: profile?.full_name ?? null, tenant_name, ...subscription });
    })();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      setUnread(count ?? 0);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/auth" });
  };

  const remainingTrialDays = me.ends_at
    ? Math.max(0, Math.ceil((new Date(me.ends_at).getTime() - Date.now()) / 86_400_000))
    : null;
  const subscriptionLabel = me.plan
    ? me.plan === "trial" && remainingTrialDays !== null
      ? `تجربة — ${remainingTrialDays} يوم متبقي`
      : `${PLAN_LABELS[me.plan] ?? me.plan} — ${me.status ?? "active"}`
    : null;


  return (
    <div className="flex min-h-screen bg-secondary/40" dir="rtl">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? "flex" : "hidden"
        } fixed inset-y-0 right-0 z-50 w-72 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground lg:static lg:z-auto lg:flex`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-accent">
              <Truck className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-black leading-tight">SAIFO</div>
              <div className="-mt-0.5 text-[10px] font-bold tracking-widest text-accent">
                TRANSPORT ERP
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.title} className="mb-6">
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.to ||
                    (item.to !== "/app" && pathname.startsWith(item.to));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-sidebar-accent text-sidebar-primary-foreground border-r-2 border-sidebar-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-accent text-sm font-bold text-white">
              {(me.full_name ?? "?").charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-sm font-semibold">{me.full_name ?? "مستخدم"}</div>
              <div className="truncate text-[11px] text-sidebar-foreground/60">
                {me.tenant_name ?? "لا توجد شركة"}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="تسجيل الخروج"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              to="/"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary"
              title="الصفحة الرئيسية"
            >
              <Home className="h-4 w-4" />
            </Link>
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="بحث..."
                className="h-10 w-64 rounded-lg border border-border bg-secondary/60 pl-4 pr-10 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 xl:w-96"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subscriptionLabel && (
              <Link
                to="/app/billing"
                className="hidden items-center gap-2 rounded-full bg-success/10 px-3 py-1 hover:bg-success/15 sm:flex"
              >
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-semibold text-success">{subscriptionLabel}</span>
              </Link>
            )}
            <Link
              to="/app/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary"
              title="الإشعارات"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <button
              onClick={handleSignOut}
              title="تسجيل الخروج"
              className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-primary md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
