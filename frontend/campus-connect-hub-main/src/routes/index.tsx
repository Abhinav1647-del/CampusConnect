import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarPlus, Megaphone, PlusCircle, ShoppingBag, Star, UtensilsCrossed } from "lucide-react";
import { useAnnouncements, useClubs, useEvents, useListings, useMenu, useNotices } from "@/hooks/queries";
import { useRole } from "@/context/RoleContext";
import { EmptyState, ErrorState, LoadingCards, SectionTitle } from "@/components/shared/States";
import { EventCard, ListingCard } from "@/components/shared/Cards";
import { VegDot } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { currentPeriod, periodLabel, timeAgo, todayISO, to12Hour } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Connect — IIIT Nagpur" },
      { name: "description", content: "Today's mess menu, upcoming events, club news and CampusCart listings at IIIT Nagpur." },
      { property: "og:title", content: "Campus Connect — IIIT Nagpur" },
      { property: "og:description", content: "Your campus in one place: mess, clubs, events and student marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const quick = [
  { to: "/mess/menu", label: "Weekly menu", icon: UtensilsCrossed },
  { to: "/mess", label: "Rate a dish", icon: Star },
  { to: "/events", label: "Browse events", icon: CalendarPlus },
  { to: "/campuscart/create", label: "Sell an item", icon: PlusCircle },
] as const;

function Home() {
  const { user } = useRole();
  const today = todayISO();
  const menu = useMenu(today);
  const events = useEvents();
  const clubs = useClubs();
  const ann = useAnnouncements();
  const listings = useListings();
  const notices = useNotices();
  const period = currentPeriod();
  const meal = Array.isArray(menu.data?.meals) ? menu.data.meals.find((m) => m.period === period) : undefined;
  const upcoming = Array.isArray(events.data) ? events.data.filter((e) => new Date(e.date) > new Date()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3) : [];
  const recent = Array.isArray(listings.data) ? listings.data.filter((l) => l.status === "available").slice(0, 4) : [];
  const clubById = (id: string) => Array.isArray(clubs.data) ? clubs.data.find((c) => c.id === id) : undefined;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-sidebar p-6 text-sidebar-foreground md:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sidebar-primary/20 blur-2xl" aria-hidden />
        <p className="text-sm opacity-75">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},</p>
        <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">{user?.name.split(" ")[0] ?? "there"} 👋</h1>
        <div className="relative mt-6 rounded-2xl bg-sidebar-accent p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-primary">Up next · {periodLabel[period]}</p>
            {meal && <span className="text-xs opacity-75">{to12Hour(meal.start)} – {to12Hour(meal.end)}</span>}
          </div>
          {menu.isLoading ? <Skeleton className="h-6 w-2/3 bg-sidebar" /> : menu.isError ? <p className="text-sm">Menu couldn't load.</p> : !meal ? (
            <p className="text-sm opacity-80">Today's menu hasn't been published yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {Array.isArray(meal.dishes) && meal.dishes.length > 0 ? (
                meal.dishes.map((d) => <li key={d.id} className="flex items-center gap-1.5 rounded-full bg-sidebar px-3 py-1 text-sm"><VegDot veg={d.veg} />{d.name}</li>)
              ) : (
                <li className="text-sm opacity-80">No dishes listed for this meal.</li>
              )}
            </ul>
          )}
          <Link to="/mess" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sidebar-primary hover:underline">Full menu & ratings <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quick.map((q) => (
          <Link key={q.label} to={q.to} className="flex items-center gap-3 rounded-2xl border bg-card p-4 font-medium transition hover:border-primary hover:shadow-md">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><q.icon className="h-5 w-5" /></span>
            <span className="text-sm">{q.label}</span>
          </Link>
        ))}
      </section>

      {(notices.data ?? []).some((n) => n.important) && (
        <section>
          <SectionTitle>Important notices</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {notices.data!.filter((n) => n.important).map((n) => (
              <div key={n.id} className="rounded-2xl border-l-4 border-accent bg-card p-4">
                <p className="font-semibold">{n.title}</p><p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-2 text-xs capitalize text-muted-foreground">{n.scope} · {timeAgo(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle action={<Link to="/events" className="text-sm font-semibold text-primary hover:underline">All events</Link>}>Upcoming events</SectionTitle>
        {events.isLoading ? <LoadingCards /> : events.isError ? <ErrorState error={events.error} onRetry={() => events.refetch()} /> :
          upcoming.length === 0 ? <EmptyState title="No upcoming events" /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((e) => <EventCard key={e.id} event={e} club={clubById(e.clubId)} />)}</div>
          )}
      </section>

      <section>
        <SectionTitle action={<Link to="/clubs" className="text-sm font-semibold text-primary hover:underline">All clubs</Link>}>Club announcements</SectionTitle>
        {ann.isLoading ? <LoadingCards count={2} /> : (ann.data ?? []).length === 0 ? <EmptyState icon={Megaphone} title="No announcements yet" /> : (
          <div className="grid gap-3 md:grid-cols-3">
            {ann.data!.slice(0, 3).map((a) => (
              <Link key={a.id} to="/clubs/$clubId" params={{ clubId: a.clubId }} className="rounded-2xl border bg-card p-4 hover:border-primary">
                <p className="text-xs font-semibold text-primary">{clubById(a.clubId)?.name}</p>
                <p className="mt-1 font-semibold">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle action={<Link to="/campuscart" className="text-sm font-semibold text-primary hover:underline">Marketplace</Link>}>Fresh on CampusCart</SectionTitle>
        {listings.isLoading ? <LoadingCards count={4} className="lg:grid-cols-4" /> : recent.length === 0 ? <EmptyState icon={ShoppingBag} title="Nothing listed yet" /> : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{recent.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        )}
      </section>
    </div>
  );
}
