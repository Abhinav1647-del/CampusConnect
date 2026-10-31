import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useRatingHistory } from "@/hooks/queries";
import { EmptyState, ErrorState, LoadingCards, PageHeader, SectionTitle } from "@/components/shared/States";
import { SubNav, messTabs } from "@/components/shared/SubNav";
import { StarDisplay } from "@/components/shared/StarRating";
import { fmtDate, periodLabel } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/mess/history")({
  head: () => seo("Ratings & history", "Monthly mess rating trends, best and worst dishes, and your own ratings."),
  component: History,
});

function History() {
  const h = useRatingHistory();
  return (
    <div>
      <PageHeader eyebrow="Mess & Dining" title="Ratings & history" />
      <SubNav items={messTabs} />
      {h.isLoading ? <LoadingCards /> : h.isError ? <ErrorState error={h.error} onRetry={() => h.refetch()} /> : !h.data ? null : (
        <div className="space-y-8">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 font-bold">Average rating by month</h2>
            <div className="flex h-44 items-end gap-3">
              {h.data.monthly.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold">{m.avg.toFixed(1)}</span>
                  <div className="w-full max-w-12 rounded-t-lg bg-primary" style={{ height: `${(m.avg / 5) * 120}px` }} title={`${m.count} ratings`} />
                  <span className="text-xs text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-4 md:grid-cols-2">
            {([["Crowd favourites", h.data.top], ["Needs improvement", h.data.bottom]] as const).map(([t, list]) => (
              <section key={t} className="rounded-2xl border bg-card p-5">
                <h2 className="mb-3 font-bold">{t}</h2>
                <ol className="divide-y">{list.map((d, i) => <li key={d.name} className="flex items-center gap-3 py-2 text-sm"><span className="w-5 text-muted-foreground">{i + 1}</span><span className="flex-1">{d.name}</span><StarDisplay value={d.avg} count={d.count} /></li>)}</ol>
              </section>
            ))}
          </div>
          <section>
            <SectionTitle>Your ratings</SectionTitle>
            {h.data.mine.length === 0 ? <EmptyState icon={Star} title="You haven't rated anything yet" body="Tap Rate next to any dish on the menu." /> : (
              <ul className="space-y-2">
                {h.data.mine.map((r) => (
                  <li key={r.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{r.dishName}</span><StarDisplay value={r.stars} /></div>
                    <p className="text-xs text-muted-foreground">{periodLabel[r.period]} · {fmtDate(r.date + "T00:00:00")}</p>
                    {r.comment && <p className="mt-1 text-sm">"{r.comment}"</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
