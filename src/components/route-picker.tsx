import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, citiesOf, DEFAULT_COUNTRY, SCOPE_LABELS, SCOPE_TONES, scopeFor } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { MapPin, Flag, ArrowLeftRight } from "lucide-react";

export type RouteValue = {
  origin_country: string | null;
  origin_city: string | null;
  destination_country: string | null;
  destination_city: string | null;
};

type Props = {
  value: RouteValue;
  onChange: (next: RouteValue) => void;
  /** Optional: sync free-text `origin`/`destination` legacy fields */
  onLegacyChange?: (origin: string, destination: string) => void;
};

export function RoutePicker({ value, onChange, onLegacyChange }: Props) {
  const originCountry = value.origin_country ?? DEFAULT_COUNTRY;
  const destCountry = value.destination_country ?? DEFAULT_COUNTRY;
  const originCities = useMemo(() => citiesOf(originCountry), [originCountry]);
  const destCities = useMemo(() => citiesOf(destCountry), [destCountry]);

  const scope = scopeFor(originCountry, destCountry, value.origin_city, value.destination_city);
  const tone = SCOPE_TONES[scope];
  const toneCls =
    tone === "success"
      ? "bg-success/15 text-success ring-1 ring-success/30"
      : tone === "warning"
        ? "bg-warning/20 text-warning-foreground ring-1 ring-warning/40"
        : "bg-chart-3/15 text-chart-3 ring-1 ring-chart-3/30";

  function update(patch: Partial<RouteValue>) {
    const next = { ...value, ...patch };
    onChange(next);
    if (onLegacyChange) {
      const oc = COUNTRIES.find((c) => c.code === (next.origin_country ?? DEFAULT_COUNTRY))?.name_ar ?? "";
      const dc = COUNTRIES.find((c) => c.code === (next.destination_country ?? DEFAULT_COUNTRY))?.name_ar ?? "";
      const o = [next.origin_city, oc].filter(Boolean).join("، ");
      const d = [next.destination_city, dc].filter(Boolean).join("، ");
      onLegacyChange(o, d);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ArrowLeftRight className="h-4 w-4 text-accent" />
          <span>نقطة الانطلاق والوصول</span>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", toneCls)}>
          {SCOPE_LABELS[scope]}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-1 text-xs"><Flag className="h-3 w-3" /> دولة الانطلاق</Label>
          <Select
            value={originCountry}
            onValueChange={(v) => update({ origin_country: v, origin_city: null })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" /> مدينة الانطلاق</Label>
          <Select
            value={value.origin_city ?? ""}
            onValueChange={(v) => update({ origin_city: v })}
          >
            <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
            <SelectContent>
              {originCities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1 text-xs"><Flag className="h-3 w-3" /> دولة الوصول</Label>
          <Select
            value={destCountry}
            onValueChange={(v) => update({ destination_country: v, destination_city: null })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="flex items-center gap-1 text-xs"><MapPin className="h-3 w-3" /> مدينة الوصول</Label>
          <Select
            value={value.destination_city ?? ""}
            onValueChange={(v) => update({ destination_city: v })}
          >
            <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
            <SelectContent>
              {destCities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
