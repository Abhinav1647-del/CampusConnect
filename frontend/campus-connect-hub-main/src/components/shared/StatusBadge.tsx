import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  available: "bg-success/15 text-success",
  accepted: "bg-success/15 text-success",
  registered: "bg-success/15 text-success",
  completed: "bg-info/15 text-info",
  sold: "bg-muted text-muted-foreground",
  reserved: "bg-warning/20 text-accent-foreground",
  pending: "bg-warning/20 text-accent-foreground",
  waitlisted: "bg-warning/20 text-accent-foreground",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  removed: "bg-destructive/10 text-destructive",
  recruiting: "bg-success/15 text-success",
  closed: "bg-muted text-muted-foreground",
  full: "bg-destructive/10 text-destructive",
  past: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", styles[status] ?? "bg-muted text-muted-foreground")}>
      {label ?? status}
    </span>
  );
}

export function VegDot({ veg }: { veg: boolean }) {
  return (
    <span aria-label={veg ? "Vegetarian" : "Non-vegetarian"} title={veg ? "Veg" : "Non-veg"}
      className={cn("inline-grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border", veg ? "border-success" : "border-destructive")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", veg ? "bg-success" : "bg-destructive")} />
    </span>
  );
}
