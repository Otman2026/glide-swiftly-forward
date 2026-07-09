import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "success" | "info" | "warning" | "danger" | "muted" | "brand";

const TONE_STYLES: Record<
  StatTone,
  { card: string; icon: string; value: string; ring: string; glow: string }
> = {
  success: {
    card: "bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20",
    icon: "bg-success/15 text-success ring-1 ring-success/30",
    value: "text-success",
    ring: "hover:border-success/40",
    glow: "hover:shadow-[0_10px_30px_-10px_var(--success)]",
  },
  info: {
    card: "bg-gradient-to-br from-chart-3/10 via-chart-3/5 to-transparent border-chart-3/20",
    icon: "bg-chart-3/15 text-chart-3 ring-1 ring-chart-3/30",
    value: "text-chart-3",
    ring: "hover:border-chart-3/40",
    glow: "hover:shadow-[0_10px_30px_-10px_var(--chart-3)]",
  },
  warning: {
    card: "bg-gradient-to-br from-warning/15 via-warning/5 to-transparent border-warning/30",
    icon: "bg-warning/20 text-warning-foreground ring-1 ring-warning/40",
    value: "text-foreground",
    ring: "hover:border-warning/50",
    glow: "hover:shadow-[0_10px_30px_-10px_var(--warning)]",
  },
  danger: {
    card: "bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent border-destructive/20",
    icon: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
    value: "text-destructive",
    ring: "hover:border-destructive/40",
    glow: "hover:shadow-[0_10px_30px_-10px_var(--destructive)]",
  },
  brand: {
    card: "bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-accent/20",
    icon: "bg-accent/15 text-accent ring-1 ring-accent/30",
    value: "text-primary",
    ring: "hover:border-accent/40",
    glow: "hover:shadow-[0_10px_30px_-10px_var(--accent)]",
  },
  muted: {
    card: "bg-card border-border",
    icon: "bg-secondary text-muted-foreground ring-1 ring-border",
    value: "text-foreground",
    ring: "hover:border-primary/30",
    glow: "hover:shadow-elegant",
  },
};

export type StatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: StatTone;
  hint?: string;
  suffix?: string;
  to?: string;
  trend?: { direction: "up" | "down"; label: string };
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "muted",
  hint,
  suffix,
  to,
  trend,
}: StatCardProps) {
  const s = TONE_STYLES[tone];

  const body = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        "hover:-translate-y-0.5",
        s.card,
        s.ring,
        s.glow,
      )}
    >
      {/* decorative corner glow */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70",
          s.icon.split(" ")[0], // bg-*/15
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
            s.icon,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
              trend.direction === "up"
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive",
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.label}
          </div>
        )}
      </div>

      <div className="relative mt-4">
        <div className={cn("text-3xl font-black leading-none tracking-tight", s.value)}>
          {typeof value === "number" ? value.toLocaleString("en-US") : value}
          {suffix && (
            <span className="mr-1 text-sm font-bold text-muted-foreground">{suffix}</span>
          )}
        </div>
        <div className="mt-2 text-xs font-semibold text-muted-foreground">{label}</div>
        {hint && (
          <div className="mt-1 text-[11px] text-muted-foreground/70">{hint}</div>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-2xl">
        {body}
      </Link>
    );
  }
  return body;
}
