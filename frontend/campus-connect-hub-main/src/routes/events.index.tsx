import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Plus } from "lucide-react";
import { useClubs, useEvents, useMyRegistrations } from "@/hooks/queries";
import { useRole } from "@/context/RoleContext";
import { EmptyState, ErrorState, LoadingCards, PageHeader } from "@/components/shared/States";
import { SubNav, clubTabs } from "@/components/shared/SubNav";
import { EventCard } from "@/components/shared/Cards";
import { EventDialog } from "@/components/clubs/ClubForms";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/events/")({
  head: () => seo("Events", "Upcoming workshops, hackathons, fests and sports events at IIIT Nagpur."),
  component: Events,
});

type F = "upcoming" | "mine" | "saved" | "past";

function Events() {
  const events = useEvents();
  const clubs = useClubs();
  const regs = useMyRegistrations();
  const { saved, can } = useRole();
  const [f, setF] = useState<F>("upcoming");
  const now = new Date();

  const isLeadOrAdmin = can("club_lead", "admin");
  const regOf = (id: string) => regs.data?.find((r) => r.eventId === id)?.status;

  const list = (events.data ?? [])
    .filter((e) => {
      const isDemoDays = e.title.toLowerCase().includes("demodays");
      if (isDemoDays && (f === "upcoming" || f === "past")) return true;
      const ed = new Date(e.date);
      const isToday =
        ed.getFullYear() === now.getFullYear() &&
        ed.getMonth() === now.getMonth() &&
        ed.getDate() === now.getDate();
      const past = ed < now && !isToday;
      if (f === "upcoming") return !past;
      if (f === "past") return past;
      if (f === "mine") return !!regOf(e.id);
      return saved.events.includes(e.id);
    })
    .sort((a, b) => (f === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader eyebrow="Clubs & Events" title="Events" />
        {isLeadOrAdmin && (
          <EventDialog
            trigger={
              <Button className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> Add Event
              </Button>
            }
          />
        )}
      </div>

      <SubNav items={clubTabs} />

      <Tabs value={f} onValueChange={(v) => setF(v as F)} className="mb-6">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="mine">Registered</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </Tabs>

      {events.isLoading ? (
        <LoadingCards count={6} />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing here"
          body={
            f === "mine"
              ? "You haven't registered for any events yet."
              : f === "saved"
              ? "Bookmark events to find them here."
              : "No events to show."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              club={
                clubs.data?.find(
                  (c) =>
                    c.id === e.clubId ||
                    (e.clubId === "c7" && c.name.toLowerCase().includes("crispr"))
                )
              }
              regStatus={regOf(e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
