import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CalendarCheck, Clock, Heart, ShoppingBag, Star, UtensilsCrossed } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { useListings, useMyRegistrations, useNotifications, useRatingHistory, useEvents } from "@/hooks/queries";
import { LoadingCards, PageHeader, SectionTitle } from "@/components/shared/States";
import { ListingCard } from "@/components/shared/Cards";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { fmtDate, roleLabel, timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => seo("Profile", "Your Campus Connect profile, registrations, listings and notifications."),
  component: Profile,
});

function Profile() {
  const { user, saved } = useRole();
  const listings = useListings(); const regs = useMyRegistrations(); const events = useEvents();
  const notes = useNotifications(); const hist = useRatingHistory();
  if (!user) return <LoadingCards count={2} />;

  const isMessWorker = user.role === "mess_admin";
  const myListings = (listings.data ?? []).filter((l) => l.sellerId === user.id);
  const savedListings = (listings.data ?? []).filter((l) => saved.listings.includes(l.id));
  const activeRegs = (regs.data ?? []).filter((r) => r.status !== "cancelled");

  const stats = [
    { icon: CalendarCheck, n: activeRegs.length, l: "Events" },
    { icon: ShoppingBag, n: myListings.length, l: "Listings" },
    { icon: Star, n: hist.data?.mine.length ?? 0, l: "Ratings" },
    { icon: Heart, n: savedListings.length, l: "Saved" },
  ];

  return (
    <div>
      <PageHeader title="Profile" />
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary font-display text-2xl font-extrabold text-primary-foreground">
            {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-extrabold">{user.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <span className={cn(
              "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
              isMessWorker ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-accent/20"
            )}>
              {isMessWorker ? "Mess Worker / Operations" : roleLabel[user.role]}
            </span>
          </div>
        </div>

        {/* Show workplace/staff info for mess worker; education details only for students */}
        {isMessWorker ? (
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Designation</dt>
              <dd className="font-semibold">Mess Worker & Operator</dd>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Work Unit</dt>
              <dd className="font-semibold">Central Dining Hall</dd>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Department</dt>
              <dd className="font-semibold">Mess Operations</dd>
            </div>
          </dl>
        ) : (
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[["Roll no.", user.rollNo], ["Branch", user.branch], ["Year", user.year ? `Year ${user.year}` : "—"], ["Hostel", user.hostel]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-muted p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Mess Worker Quick Actions Desk */}
      {isMessWorker ? (
        <section className="mt-6 rounded-2xl border bg-card p-5">
          <h3 className="font-display font-semibold text-base mb-3">Mess Staff Operations Desk</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/admin/mess"
              className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition shadow-sm"
            >
              <div>
                <p className="font-semibold text-sm text-foreground">Manage Daily Menu</p>
                <p className="text-xs text-muted-foreground">Edit breakfast, lunch, snacks & dinner dishes</p>
              </div>
              <UtensilsCrossed className="h-5 w-5 text-primary shrink-0" />
            </Link>
            <Link
              to="/mess/dining"
              className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition shadow-sm"
            >
              <div>
                <p className="font-semibold text-sm text-foreground">Dining Info & Schedule</p>
                <p className="text-xs text-muted-foreground">Review meal hours and crowd tracker status</p>
              </div>
              <Clock className="h-5 w-5 text-primary shrink-0" />
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {stats.map(({ icon: I, n, l }) => (
              <div key={l} className="rounded-xl border bg-card p-3 text-center">
                <I className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-display text-xl font-extrabold">{n}</p>
                <p className="text-[11px] text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>

          <section className="mt-8">
            <SectionTitle>My event registrations</SectionTitle>
            {activeRegs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No registrations yet. <Link to="/events" className="font-semibold text-primary">Browse events</Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {activeRegs.map((r) => {
                  const e = events.data?.find((x) => x.id === r.eventId);
                  return (
                    <li key={r.eventId}>
                      <Link
                        to="/events/$eventId"
                        params={{ eventId: r.eventId }}
                        className="flex items-center justify-between gap-2 rounded-xl border bg-card p-3 text-sm hover:border-primary"
                      >
                        <span className="font-medium">{e?.title ?? "Event"}</span>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          {e && fmtDate(e.date)}
                          <StatusBadge status={r.status} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <SectionTitle action={<Link to="/campuscart/my-activity" className="text-sm font-semibold text-primary">Requests</Link>}>
              My listings
            </SectionTitle>
            {myListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven't listed anything. <Link to="/campuscart/create" className="font-semibold text-primary">Sell an item</Link>
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {myListings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </section>

          {savedListings.length > 0 && (
            <section className="mt-8">
              <SectionTitle>Saved items</SectionTitle>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {savedListings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-8">
        <SectionTitle>Notifications</SectionTitle>
        <ul className="space-y-2">
          {(notes.data ?? []).map((n) => (
            <li
              key={n.id}
              className={cn("flex items-start gap-3 rounded-xl border bg-card p-3 text-sm", !n.read && "border-l-4 border-l-primary")}
            >
              <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1">
                <p>{n.title}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
