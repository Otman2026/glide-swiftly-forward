import { Link } from "@tanstack/react-router";
import { Lock, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

export function ReadOnlyBanner() {
  const sub = useSubscription();
  if (sub.loading || !sub.isReadOnly) {
    if (!sub.loading && sub.daysLeft !== null && sub.daysLeft <= 3 && !sub.isExpired) {
      return (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div className="text-sm">
              <span className="font-bold text-warning">تنبيه: </span>
              <span>ينتهي اشتراكك خلال {sub.daysLeft} يوم. جدد الآن لتجنب توقف الخدمة.</span>
            </div>
          </div>
          <Link
            to="/app/billing"
            className="rounded-lg bg-warning px-3 py-1.5 text-xs font-bold text-warning-foreground hover:opacity-90"
          >
            تجديد الاشتراك
          </Link>
        </div>
      );
    }
    return null;
  }
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <Lock className="h-5 w-5 text-destructive" />
        <div className="text-sm">
          <span className="font-bold text-destructive">وضع القراءة فقط: </span>
          <span>انتهى اشتراكك. يمكنك عرض البيانات فقط. جدد الاشتراك لاستئناف العمليات.</span>
        </div>
      </div>
      <Link
        to="/app/billing"
        className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground hover:opacity-90"
      >
        تجديد الاشتراك
      </Link>
    </div>
  );
}
