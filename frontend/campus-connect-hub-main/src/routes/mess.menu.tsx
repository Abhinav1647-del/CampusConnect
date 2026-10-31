import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWeekMenu } from "@/hooks/queries";
import { EmptyState, ErrorState, LoadingCards, PageHeader } from "@/components/shared/States";
import { SubNav, messTabs } from "@/components/shared/SubNav";
import { MealCard } from "@/components/mess/MealCard";
import { Button } from "@/components/ui/button";
import { fmtDate, mondayOf, shiftISO, todayISO } from "@/lib/format";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mess/menu")({
  head: () => seo("Weekly menu", "The full week's breakfast, lunch, snacks and dinner menu at the IIIT Nagpur mess."),
  component: WeekMenu,
});

function WeekMenu() {
  const today = todayISO();
  const [start, setStart] = useState(mondayOf(today));
  const [day, setDay] = useState(today);
  const week = useWeekMenu(start);
  const days = Array.from({ length: 7 }, (_, i) => shiftISO(start, i));
  const selected = days.includes(day) ? day : days[0]!;
  const menu = week.data?.find((m) => m.date === selected);
  const move = (n: number) => { const s = shiftISO(start, n * 7); setStart(s); setDay(s); };

  return (
    <div>
      <PageHeader eyebrow="Mess & Dining" title="Weekly menu" subtitle={`Week of ${fmtDate(start + "T00:00:00", { day: "numeric", month: "long" })}`}
        actions={<>
          <Button size="icon" variant="outline" aria-label="Previous week" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" aria-label="Next week" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
        </>} />
      <SubNav items={messTabs} />
      <div className="mb-6 grid grid-cols-7 gap-1.5" role="tablist">
        {days.map((d) => {
          const dt = new Date(d + "T00:00:00");
          return (
            <button key={d} role="tab" aria-selected={d === selected} onClick={() => setDay(d)}
              className={cn("rounded-xl border bg-card py-2 text-center transition", d === selected ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary", d === today && d !== selected && "border-primary/60")}>
              <span className="block text-[11px] uppercase opacity-75">{dt.toLocaleDateString("en-IN", { weekday: "short" })}</span>
              <span className="block font-display text-lg font-bold">{dt.getDate()}</span>
            </button>
          );
        })}
      </div>
      {week.isLoading ? <LoadingCards count={4} className="lg:grid-cols-2" /> : week.isError ? <ErrorState error={week.error} onRetry={() => week.refetch()} /> :
        !menu || !menu.published ? <EmptyState title="Menu not published" body="This day's menu hasn't been posted yet." /> : (
          <div className="grid gap-4 lg:grid-cols-2">{menu.meals.map((m) => <MealCard key={m.period} meal={m} date={selected} rateable={true} />)}</div>
        )}
    </div>
  );
}
