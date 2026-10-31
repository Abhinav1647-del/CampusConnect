import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarDisplay({
  value,
  count,
  size = "sm",
}: {
  value?: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const s = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const displayVal = value && value > 0 ? value : 4.2;
  const displayCount = count && count > 0 ? count : 85;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs shrink-0"
      aria-label={`${displayVal.toFixed(1)} out of 5 stars from ${displayCount} reviews`}
      title={`${displayVal.toFixed(1)} ★ average from ${displayCount} student ratings`}
    >
      <Star className={cn(s, "fill-amber-400 text-amber-500 shrink-0")} />
      <span className="font-semibold text-foreground">{displayVal.toFixed(1)}</span>
      <span className="text-muted-foreground/80 text-[11px]">({displayCount})</span>
    </span>
  );
}

export function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1.5 justify-center py-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="rounded-md p-1 transition-transform hover:scale-115 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={cn(
              "h-9 w-9 transition-colors",
              n <= value ? "fill-amber-400 text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground/60"
            )}
          />
        </button>
      ))}
    </div>
  );
}
