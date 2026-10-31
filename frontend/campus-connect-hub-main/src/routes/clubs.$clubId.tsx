import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Megaphone, Phone, Plus } from "lucide-react";
import { useAnnouncements, useClub, useEvents, useMyRegistrations } from "@/hooks/queries";
import { useRole } from "@/context/RoleContext";
import { EmptyState, ErrorState, LoadingCards, SectionTitle } from "@/components/shared/States";
import { ClubAvatar, EventCard } from "@/components/shared/Cards";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AnnouncementDialog, EventDialog } from "@/components/clubs/ClubForms";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/clubs/$clubId")({
  head: () => seo("Club profile", "Club details, upcoming events and announcements at IIIT Nagpur."),
  component: ClubDetail,
});

function ClubDetail() {
  const { clubId } = Route.useParams();
  const { user, can } = useRole();
  const club = useClub(clubId);
  const events = useEvents();
  const ann = useAnnouncements();
  const regs = useMyRegistrations();
  const isLead = can("club_lead", "admin") || (!!user && user.clubIds?.includes(clubId));
  const canAnnounce = can("club_lead", "moderator", "admin") || (!!user && user.clubIds?.includes(clubId));
  if (club.isLoading) return <Skeleton className="h-48 rounded-3xl" />;
  if (club.isError || !club.data) return <ErrorState error={club.error} onRetry={() => club.refetch()} />;
  const c = club.data;
  const isCrispr =
    c?.name?.toLowerCase().includes("crispr") ||
    clubId === "c7" ||
    clubId.toLowerCase().includes("crispr");
  const clubEvents = (events.data ?? [])
    .filter(
      (e) =>
        e.clubId === clubId ||
        (isCrispr && (e.clubId === "c7" || e.title.toLowerCase().includes("demodays")))
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const clubAnn = (ann.data ?? [])
    .filter(
      (a) =>
        a.clubId === clubId ||
        (isCrispr && (a.clubId === "c7" || a.title.toLowerCase().includes("esummit")))
    );

  return (
    <div className="space-y-8">
      <Link to="/clubs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All clubs</Link>
      <section className="rounded-3xl border bg-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <ClubAvatar club={c} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold">{c.name}</h1>
            <p className="text-muted-foreground">{c.tagline}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs"><StatusBadge status={c.recruiting ? "recruiting" : "closed"} label={c.recruiting ? "Recruiting" : "Not recruiting"} /><span className="rounded-full bg-muted px-2.5 py-0.5 capitalize">{c.category}</span><span className="rounded-full bg-muted px-2.5 py-0.5">{c.members} members</span></div>
          </div>
          <div className="flex gap-2">
            {canAnnounce && <AnnouncementDialog clubId={c.id} trigger={<Button variant="outline" size="sm"><Megaphone className="mr-1 h-4 w-4" />Announce</Button>} />}
            {isLead && <EventDialog clubId={c.id} trigger={<Button size="sm"><Plus className="mr-1 h-4 w-4" />New event</Button>} />}
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed">{c.description}</p>

        {/* Club Members / Contacts */}
        {c.clubMembers && c.clubMembers.length > 0 ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Club Leads & Contacts</p>
            <div className="flex flex-wrap gap-3">
              {c.clubMembers.map((m) => (
                <div key={m.name} className="flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 shadow-sm text-sm">
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{m.role}</p>
                  </div>
                  {m.contact && (
                    <a href={`tel:${m.contact}`} className="ml-2 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-mono font-medium text-primary hover:bg-primary/20 transition">
                      <Phone className="h-3 w-3" />{m.contact}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : c.leads && c.leads.length > 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">Leads: {c.leads.join(", ")}</p>
        ) : null}
        {c.coordinator && c.coordinator !== "TBD" && c.coordinator !== "Lead Coordinator" && (
          <p className="mt-2 text-xs text-muted-foreground">Faculty coordinator: {c.coordinator}</p>
        )}
      </section>

      <section>
        <SectionTitle>Events</SectionTitle>
        {events.isLoading ? <LoadingCards /> : clubEvents.length === 0 ? <EmptyState icon={CalendarDays} title="No events yet" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{clubEvents.map((e) => <EventCard key={e.id} event={e} club={c} regStatus={regs.data?.find((r) => r.eventId === e.id)?.status} />)}</div>
        )}
      </section>

      <section>
        <SectionTitle>Announcements</SectionTitle>
        {clubAnn.length === 0 ? <EmptyState icon={Megaphone} title="No announcements" /> : (
          <div className="space-y-3">{clubAnn.map((a) => <div key={a.id} className="rounded-2xl border bg-card p-4"><p className="font-semibold">{a.title}</p><p className="mt-1 text-sm text-muted-foreground">{a.body}</p><p className="mt-2 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p></div>)}</div>
        )}
      </section>
    </div>
  );
}
