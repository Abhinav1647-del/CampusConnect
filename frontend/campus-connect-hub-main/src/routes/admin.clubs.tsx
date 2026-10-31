import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2, Calendar, MapPin, Users, Megaphone, ExternalLink, Sliders } from "lucide-react";
import { useAction, useClubs, useEvents } from "@/hooks/queries";
import { useRole } from "@/context/RoleContext";
import { clubService } from "@/services/clubService";
import { ErrorState, LoadingCards, PageHeader, SectionTitle } from "@/components/shared/States";
import { SubNav, useAdminTabs } from "@/components/shared/SubNav";
import { EventDialog, EditEventDialog, AnnouncementDialog } from "@/components/clubs/ClubForms";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { fmtDateTime } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin/clubs")({
  head: () => seo("Clubs Admin", "Manage club events, create activities and announcements."),
  component: AdminClubs,
});

function AdminClubs() {
  const clubs = useClubs();
  const events = useEvents();
  const tabs = useAdminTabs();
  const { can } = useRole();

  const isClubLeadOrAdmin = can("club_lead", "admin");
  const canAnnounce = can("club_lead", "moderator", "admin");

  const delEvent = useAction((eventId: string) => clubService.deleteEvent(eventId), {
    success: "Event deleted / cancelled successfully",
    invalidate: ["events"],
  });

  if (clubs.isLoading || events.isLoading) return <LoadingCards />;
  if (clubs.isError) return <ErrorState error={clubs.error} onRetry={() => clubs.refetch()} />;

  const allClubs = clubs.data ?? [];
  const allEvents = events.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageHeader eyebrow="Club Administrator" title="Clubs & Events Management" />
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule and publish new club events, manage attendee limits, and remove cancelled events.
          </p>
        </div>

        {isClubLeadOrAdmin && (
          <EventDialog
            trigger={
              <Button className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> Create New Event
              </Button>
            }
          />
        )}
      </div>

      <SubNav items={tabs} />

      {/* Events Management Table */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle>Active & Upcoming Events ({allEvents.length})</SectionTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage existing events, review capacities, or remove events if cancelled.
            </p>
          </div>

          <EventDialog
            trigger={
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Event
              </Button>
            }
          />
        </div>

        {allEvents.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No events scheduled yet. Click "Create New Event" above to add one.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Title</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allEvents.map((e) => {
                  const club = allClubs.find((c) => c.id === e.clubId || c.name.toLowerCase() === e.clubId.toLowerCase());
                  let displayClubName = club?.name || e.clubName || (e.clubId === "cmv5glw1g000kqcug8m2srca6" ? "Iotics" : e.clubId);
                  if (
                    displayClubName.toLowerCase().includes("robotics") ||
                    displayClubName === "Robotics Club" ||
                    e.title.toLowerCase().includes("workshop") ||
                    e.title.toLowerCase().includes("line follower")
                  ) {
                    displayClubName = "Iotics";
                  }
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-semibold text-foreground">
                        <Link
                          to="/events/$eventId"
                          params={{ eventId: e.id }}
                          className="hover:text-primary hover:underline"
                        >
                          {e.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-medium">
                          {displayClubName}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(e.date)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {e.venue}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {e.registered} / {e.capacity}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <EditEventDialog
                            event={e}
                            trigger={
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label="Manage event and registrations"
                                title="Manage event and registrations"
                              >
                                <Sliders className="h-4 w-4" />
                              </Button>
                            }
                          />

                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Link to="/events/$eventId" params={{ eventId: e.id }}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>

                          <ConfirmButton
                            trigger={
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                aria-label="Delete event"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                            title="Remove this event?"
                            description={`Are you sure you want to cancel and delete "${e.title}"? Registered students will be notified.`}
                            confirmLabel="Delete Event"
                            onConfirm={() => delEvent.mutate(e.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Clubs & Announcements Management */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div>
          <SectionTitle>Tantra Clubs ({allClubs.length})</SectionTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            View clubs and post announcements directly to club notice boards.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allClubs.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border bg-background p-4 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                    {c.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {c.members} members
                  </span>
                </div>
                <h3 className="mt-2 font-bold text-base text-foreground">
                  <Link
                    to="/clubs/$clubId"
                    params={{ clubId: c.id }}
                    className="hover:text-primary hover:underline"
                  >
                    {c.name}
                  </Link>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {c.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
                {canAnnounce && (
                  <AnnouncementDialog
                    clubId={c.id}
                    trigger={
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Megaphone className="h-3 w-3 text-primary" /> Announce
                      </Button>
                    }
                  />
                )}
                <EventDialog
                  clubId={c.id}
                  trigger={
                    <Button size="sm" className="h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Event
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
