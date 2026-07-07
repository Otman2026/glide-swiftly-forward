import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput({
  value,
  onChange,
  placeholder = "ابحث…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full sm:w-64 ${className}`}>
      <Search className="pointer-events-none absolute inset-y-0 start-2 my-auto h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ps-8 pe-8 h-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute inset-y-0 end-2 my-auto text-muted-foreground hover:text-foreground"
          aria-label="مسح البحث"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Filter rows by matching any listed field against the query (case-insensitive). */
export function matchQuery<T>(rows: T[], q: string, fields: (keyof T)[]): T[] {
  const s = q.trim().toLowerCase();
  if (!s) return rows;
  return rows.filter((r) =>
    fields.some((f) => String((r as Record<string, unknown>)[f as string] ?? "").toLowerCase().includes(s)),
  );
}
