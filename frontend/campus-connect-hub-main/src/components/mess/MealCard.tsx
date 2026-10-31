import { useState } from "react";
import { Clock } from "lucide-react";
import type { Dish, Meal } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarDisplay, StarInput } from "@/components/shared/StarRating";
import { VegDot } from "@/components/shared/StatusBadge";
import { useAction } from "@/hooks/queries";
import { messService } from "@/services/messService";
import { periodLabel, todayISO, to12Hour } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Time constraint: A meal can ONLY be rated if:
 * 1. The date is in the past (before today)
 * 2. It is today AND the current time is past the meal's start time (e.g. 12:00 for lunch)
 * Future days (tomorrow, etc.) or today's upcoming meals CANNOT be rated.
 */
export function isMealServed(dateStr: string, startTime: string): boolean {
  const today = todayISO();
  if (dateStr < today) return true; // Past days are already served
  if (dateStr > today) return false; // Tomorrow and future days CANNOT be rated

  // If today: check whether current time is past the meal start time
  const now = new Date();
  const [startHour = 0, startMin = 0] = startTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const mealStartMinutes = startHour * 60 + startMin;
  return currentMinutes >= mealStartMinutes;
}

export function MealCard({ meal, date, highlight, rateable }: { meal: Meal; date: string; highlight?: boolean; rateable?: boolean }) {
  const [rating, setRating] = useState<Dish | null>(null);
  const served = isMealServed(date, meal.start);
  const canRate = (rateable !== undefined ? rateable : true) && served;
  const isFuture = date > todayISO();

  return (
    <section className={cn("rounded-2xl border bg-card p-4", highlight && "border-primary ring-2 ring-primary/15")} aria-label={periodLabel[meal.period]}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-bold">{periodLabel[meal.period]}</h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{to12Hour(meal.start)} – {to12Hour(meal.end)}</span>
      </div>
      {meal.dishes.length === 0 ? <p className="text-sm text-muted-foreground">No items listed.</p> : (
        <ul className="divide-y">
          {meal.dishes.map((d) => (
            <li key={d.id} className="flex items-center gap-2.5 py-2.5">
              <VegDot veg={d.veg} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.name}</span>
              <StarDisplay value={d.avgRating} count={d.ratingCount} />
              {canRate ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-semibold text-primary border-primary/40 hover:bg-primary hover:text-primary-foreground transition shrink-0"
                  onClick={() => setRating(d)}
                >
                  Rate
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground/60 italic shrink-0">
                  {isFuture ? "Upcoming" : `Opens at ${to12Hour(meal.start)}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {rating && <RateDialog dish={rating} date={date} period={meal.period} startTime={meal.start} onClose={() => setRating(null)} />}
    </section>
  );
}

function RateDialog({ dish, date, period, startTime, onClose }: { dish: Dish; date: string; period: Meal["period"]; startTime: string; onClose: () => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const m = useAction(messService.rate, { success: `Thanks! You rated ${dish.name}.`, invalidate: ["menu", "week", "history"], onSuccess: onClose });
  const submit = () => {
    if (!isMealServed(date, startTime)) {
      return setErr("You can only rate food after the meal has been served.");
    }
    if (stars < 1) return setErr("Pick a star rating first.");
    if (comment.length > 300) return setErr("Feedback must be under 300 characters.");
    setErr(""); m.mutate({ dishId: dish.id, date, period, stars, comment: comment.trim() || undefined });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {dish.name}</DialogTitle>
          <DialogDescription>{periodLabel[period]} · {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <StarInput value={stars} onChange={(v) => { setStars(v); setErr(""); }} />
          <div className="space-y-1.5">
            <Label htmlFor="fb">Feedback (optional)</Label>
            <Textarea id="fb" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Taste, quantity, temperature…" maxLength={320} />
            <p className="text-right text-xs text-muted-foreground">{comment.length}/300</p>
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={m.isPending}>{m.isPending ? "Submitting…" : "Submit rating"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
