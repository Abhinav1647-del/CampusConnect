import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Edit3 } from "lucide-react";
import { useMenu, useNotices } from "@/hooks/queries";
import { useRole } from "@/context/RoleContext";
import { EmptyState, ErrorState, LoadingCards, PageHeader, SectionTitle } from "@/components/shared/States";
import { SubNav, messTabs } from "@/components/shared/SubNav";
import { MealCard } from "@/components/mess/MealCard";
import { Button } from "@/components/ui/button";
import { currentPeriod, fmtDate, shiftISO, timeAgo, todayISO } from "@/lib/format";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mess/")({
  head: () => seo("Mess & Dining", "Today's mess menu at IIIT Nagpur, dining updates and dish ratings."),
  component: MessPage,
});

function MessPage() {
  const { can } = useRole();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const menu = useMenu(date);
  const notices = useNotices();
  const isToday = date === today;
  const messNotices = (notices.data ?? []).filter((n) => n.scope === "mess");

  return (
    <div>
      <PageHeader eyebrow="Mess & Dining" title="What's cooking" subtitle="Rate dishes to help the mess committee improve." />
      <SubNav items={messTabs} />

      {can("mess_admin", "admin") && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Edit3 className="h-4 w-4 text-primary" />
            <span>Mess Admin: You can update daily foods, dishes, and mess notices.</span>
          </div>
          <Link
            to="/admin/mess"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Update Daily Foods →
          </Link>
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border bg-card p-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label="Previous day" onClick={() => setDate(shiftISO(date, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-36 text-center text-sm font-semibold">{isToday ? "Today" : fmtDate(date + "T00:00:00", { weekday: "short", day: "numeric", month: "short" })}</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label="Next day" onClick={() => setDate(shiftISO(date, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        {!isToday && <Button size="sm" variant="outline" onClick={() => setDate(today)}>Back to today</Button>}
      </div>

      {menu.isLoading ? <LoadingCards count={4} className="lg:grid-cols-2" /> : menu.isError ? <ErrorState error={menu.error} onRetry={() => menu.refetch()} /> :
        !menu.data || !menu.data.published ? <EmptyState title="Menu not published yet" body="The mess committee hasn't posted this day's menu. Check back later." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {menu.data.meals.map((m) => <MealCard key={m.period} meal={m} date={date} highlight={isToday && m.period === currentPeriod()} rateable={true} />)}
          </div>
        )}

      {messNotices.length > 0 && (
        <section className="mt-10">
          <SectionTitle>Mess notices</SectionTitle>
          <div className="space-y-3">
            {messNotices.map((n) => (
              <div key={n.id} className={cn("rounded-2xl border bg-card p-4", n.important && "border-l-4 border-l-accent")}>
                <p className="font-semibold">{n.title}</p><p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
