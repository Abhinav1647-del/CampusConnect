import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, CalendarDays, Clock, Download, MapPin, Sliders, Trash2, Users } from "lucide-react";
import { useAction, useClubs, useEventRegistrations, useEvents, useMyRegistrations } from "@/hooks/queries";
import { useRole } from "@/context/RoleContext";
import { clubService, DEMODAYS_EVENT } from "@/services/clubService";
import { EmptyState, ErrorState, SectionTitle } from "@/components/shared/States";
import { ClubAvatar, eventState } from "@/components/shared/Cards";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { EditEventDialog } from "@/components/clubs/ClubForms";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/format";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/events/$eventId")({
  head: () => seo("Event details", "Event details and registration at IIIT Nagpur."),
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { user, saved, toggleSaved, can } = useRole();
  const events = useEvents();
  const clubs = useClubs();
  const regs = useMyRegistrations();
  const ev =
    events.data?.find((e) => e.id === eventId) ||
    (eventId === "e-demodays" || eventId.toLowerCase().includes("demodays")
      ? DEMODAYS_EVENT
      : undefined);
  const club = clubs.data?.find(
    (c) =>
      c.id === ev?.clubId ||
      (ev?.clubId === "c7" && c.name.toLowerCase().includes("crispr"))
  );
  const isAdmin = can("admin");
  const isClubLead = can("club_lead") && (!!user && !!ev && (user.clubIds?.includes(ev.clubId) || user.clubIds?.length > 0));
  const isLead = isAdmin || isClubLead;
  const attendees = useEventRegistrations(eventId);
  const myReg = regs.data?.find((r) => r.eventId === eventId);
  const [justRegistered, setJustRegistered] = useState(false);
  const [justCancelled, setJustCancelled] = useState(false);
  const inv = ["events", "registrations", "eventRegs"];
  const reg = useAction(() => clubService.register(eventId), {
    success: "You're in!",
    invalidate: inv,
    onSuccess: () => {
      setJustRegistered(true);
      setJustCancelled(false);
      events.refetch();
      attendees.refetch();
      regs.refetch();
    },
  });
  const cancel = useAction(() => clubService.cancel(eventId), {
    success: "Registration cancelled",
    invalidate: inv,
    onSuccess: () => {
      setJustCancelled(true);
      setJustRegistered(false);
      events.refetch();
      attendees.refetch();
      regs.refetch();
    },
  });
  const del = useAction(() => clubService.deleteEvent(eventId), { success: "Event deleted", invalidate: ["events"], onSuccess: () => navigate({ to: "/events" }) });

  if (events.isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (events.isError) return <ErrorState error={events.error} onRetry={() => events.refetch()} />;
  if (!ev) return <EmptyState title="Event not found" action={<Link to="/events" className="text-sm font-semibold text-primary">Browse events</Link>} />;
  
  const isRegistered = (!!myReg || justRegistered) && !justCancelled;
  const effectiveMyReg = isRegistered
    ? (myReg || { eventId, userId: "current", status: "registered" as const, createdAt: new Date().toISOString() })
    : undefined;

  // Real attendee count takes priority if available
  const attendeesCount = attendees.data?.filter((r) => r.status !== "cancelled").length ?? 0;
  const registeredCount = Math.max(ev.registered, attendeesCount, isRegistered ? 1 : 0);
  const effectiveEv = { ...ev, registered: registeredCount };

  const { past, closed, full, isUnlimited } = eventState(effectiveEv);
  const hasCap = !isUnlimited && ev.capacity !== null && ev.capacity !== undefined && ev.capacity > 0;
  const pct = hasCap ? Math.min(100, Math.round((registeredCount / ev.capacity!) * 100)) : 0;
  const isSaved = saved.events.includes(ev.id);
  const isDemoDays = ev.title.toLowerCase().includes("demodays") || ev.id === "e-demodays";

  const exportAttendeesCSV = () => {
    if (!attendees.data || attendees.data.length === 0) return;
    const headers = "Name,Roll No,Branch,Email,Status,Registered At\n";
    const rows = attendees.data
      .map(
        (r) =>
          `"${r.user?.name || r.userId}","${r.user?.rollNo || ""}","${r.user?.branch || ""}","${r.user?.email || ""}","${r.status}","${r.createdAt}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${ev.title.replace(/[^a-zA-Z0-9]/g, "_")}_registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All events</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border bg-card p-6">
          {club && <Link to="/clubs/$clubId" params={{ clubId: club.id }} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ClubAvatar club={club} className="h-8 w-8 text-xs" />{club.name}</Link>}
          <h1 className="text-2xl font-extrabold sm:text-3xl">{ev.title}</h1>
          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{fmtDateTime(ev.date)}</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{ev.venue}</p>
            {!isDemoDays && (
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {full || closed
                  ? "Registration Closed"
                  : `Registration closes ${fmtDateTime(ev.deadline)}`}
              </p>
            )}
          </div>
          <p className="mt-5 whitespace-pre-line leading-relaxed">{ev.description}</p>
        </section>
        <aside className="h-fit space-y-4 rounded-3xl border bg-card p-5 lg:sticky lg:top-6">
          {!isDemoDays && (
            hasCap ? (
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{registeredCount}/{ev.capacity} spots</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <Progress value={pct} />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-muted p-3 text-xs">
                <span className="font-semibold text-foreground">{registeredCount} registered</span>
                <span className="font-semibold text-primary">No seat limit (Open)</span>
              </div>
            )
          )}
          {effectiveMyReg && !isDemoDays && (
            <StatusBadge status={effectiveMyReg.status} label={effectiveMyReg.status === "waitlisted" ? "You're on the waitlist" : "You're registered"} />
          )}
          {!isDemoDays && (
            past ? (
              <p className="text-sm text-muted-foreground">This event has ended{ev.attended !== undefined ? ` · ${ev.attended} attended` : ""}.</p>
            ) : effectiveMyReg ? (
              <ConfirmButton trigger={<Button variant="outline" className="w-full" disabled={cancel.isPending}>Cancel registration</Button>} title="Cancel registration?" description="Your spot will go to the next person on the waitlist." confirmLabel="Cancel registration" onConfirm={() => cancel.mutate(undefined)} />
            ) : (full || closed) ? (
              <Button className="w-full cursor-not-allowed" disabled variant="secondary">
                Registration Closed
              </Button>
            ) : (
              <Button className="w-full" onClick={() => reg.mutate(undefined)} disabled={reg.isPending}>{reg.isPending ? "Registering…" : "Register"}</Button>
            )
          )}
          <Button variant="ghost" className="w-full" onClick={() => toggleSaved("events", ev.id)} aria-pressed={isSaved}><Bookmark className={cn("mr-2 h-4 w-4", isSaved && "fill-primary text-primary")} />{isSaved ? "Saved" : "Save for later"}</Button>
          {isLead && (
            <EditEventDialog
              event={ev}
              trigger={
                <Button variant="outline" className="w-full gap-2">
                  <Sliders className="h-4 w-4" /> Manage Registration & Seats
                </Button>
              }
            />
          )}
          {isLead && <ConfirmButton trigger={<Button variant="ghost" className="w-full text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete event</Button>} title="Delete this event?" description="Registered students will lose their spots. This can't be undone." confirmLabel="Delete" onConfirm={() => del.mutate(undefined)} />}
        </aside>
      </div>

      {/* Registered Students Roster — visible to Club Leads & Campus Admin (ignored for DemoDays) */}
      {isLead && !isDemoDays && (
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Registered Students ({attendees.data?.length ?? 0})</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Visible to Club Leads & Campus Admin for attendance and verification.
              </p>
            </div>
            {(attendees.data ?? []).length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5 self-start sm:self-auto" onClick={exportAttendeesCSV}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            )}
          </div>

          {(attendees.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-medium text-foreground">No students have registered yet</p>
              <p className="text-xs text-muted-foreground mt-1">When students register, their names, roll numbers, and contact details will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>College Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendees.data!.map((r) => (
                    <TableRow key={r.userId}>
                      <TableCell className="font-semibold text-foreground">
                        {r.user?.name ?? r.userId}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {r.user?.rollNo || "—"}
                      </TableCell>
                      <TableCell>{r.user?.branch || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.user?.email || "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
