import { useState } from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction, useClubs } from "@/hooks/queries";
import { clubService, type EventInput } from "@/services/clubService";
import type { ClubEvent } from "@/types";

const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function EventDialog({ clubId: initialClubId, trigger }: { clubId?: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const clubs = useClubs();
  const [selectedClubId, setSelectedClubId] = useState(initialClubId || "c1");
  const effectiveClubId = initialClubId || selectedClubId || (clubs.data?.[0]?.id ?? "c1");

  const wk = new Date(Date.now() + 7 * 864e5);
  const [unlimited, setUnlimited] = useState(false);
  const [f, setF] = useState({
    title: "",
    description: "",
    venue: "",
    date: toLocal(wk),
    deadline: toLocal(new Date(wk.getTime() - 864e5)),
    capacity: "100",
  });
  const [err, setErr] = useState("");

  const m = useAction((e: EventInput) => clubService.createEvent(effectiveClubId, e), {
    success: "Event published successfully",
    invalidate: ["events", "club"],
    onSuccess: () => {
      setOpen(false);
      setUnlimited(false);
      setF({
        title: "",
        description: "",
        venue: "",
        date: toLocal(wk),
        deadline: toLocal(new Date(wk.getTime() - 864e5)),
        capacity: "100",
      });
    },
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = () => {
    const cap = Number(f.capacity);
    if (!effectiveClubId) return setErr("Please select an organizing club.");
    if (f.title.trim().length < 3) return setErr("Title must be at least 3 characters.");
    if (!f.venue.trim()) return setErr("Venue is required.");
    if (!unlimited && (!Number.isInteger(cap) || cap < 1)) return setErr("Capacity must be a positive whole number.");
    if (new Date(f.deadline) > new Date(f.date)) return setErr("Registration deadline must be before the event.");
    setErr("");
    m.mutate({
      title: f.title.trim(),
      description: f.description.trim(),
      venue: f.venue.trim(),
      date: new Date(f.date).toISOString(),
      deadline: new Date(f.deadline).toISOString(),
      capacity: unlimited ? null : cap,
      isUnlimited: unlimited,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          {!initialClubId && (
            <div className="grid gap-1.5">
              <Label htmlFor="eclub">Organising Club</Label>
              <Select value={effectiveClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger id="eclub">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {(clubs.data || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="et">Event Title</Label>
            <Input id="et" placeholder="e.g. Tantra Hackathon 2026" value={f.title} onChange={set("title")} maxLength={100} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ed">Description</Label>
            <Textarea
              id="ed"
              rows={2}
              placeholder="Brief details about the event, rules, eligibility..."
              value={f.description}
              onChange={set("description")}
              maxLength={1000}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev">Venue</Label>
            <Input id="ev" placeholder="e.g. Auditorium / Lab 2 / Football Ground" value={f.venue} onChange={set("venue")} maxLength={100} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edt">Event Date & Time</Label>
              <Input id="edt" type="datetime-local" value={f.date} onChange={set("date")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edl">Registration Deadline</Label>
              <Input id="edl" type="datetime-local" value={f.deadline} onChange={set("deadline")} />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ec">Seat Limit</Label>
              <Button
                type="button"
                variant={unlimited ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setUnlimited(!unlimited)}
              >
                <InfinityIcon className="h-3.5 w-3.5" />
                {unlimited ? "No Seat Limit Enabled" : "No Seat Limit (Open)"}
              </Button>
            </div>
            {unlimited ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary font-medium flex items-center gap-2">
                <InfinityIcon className="h-4 w-4 shrink-0" />
                <span>Open event — as many students can join as want. No seat limit.</span>
              </div>
            ) : (
              <Input id="ec" type="number" min={1} placeholder="e.g. 100" value={f.capacity} onChange={set("capacity")} />
            )}
          </div>

          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={m.isPending}>
            {m.isPending ? "Publishing…" : "Publish Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditEventDialog({ event, trigger }: { event: ClubEvent; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unlimited, setUnlimited] = useState(event.isUnlimited || !event.capacity);
  const [f, setF] = useState({
    title: event.title,
    description: event.description,
    venue: event.venue,
    date: toLocal(new Date(event.date)),
    deadline: toLocal(new Date(event.deadline)),
    capacity: String(event.capacity || 100),
  });
  const [err, setErr] = useState("");

  const m = useAction(
    (e: Partial<EventInput>) => clubService.updateEvent(event.id, e),
    {
      success: "Event updated successfully",
      invalidate: ["events", "event", "club"],
      onSuccess: () => {
        setOpen(false);
      },
    }
  );

  const stopRegistration = () => {
    const nowISO = new Date(Date.now() - 60000).toISOString();
    m.mutate({ deadline: nowISO });
  };

  const submit = () => {
    const cap = Number(f.capacity);
    if (f.title.trim().length < 3) return setErr("Title must be at least 3 characters.");
    if (!f.venue.trim()) return setErr("Venue is required.");
    if (!unlimited && (!Number.isInteger(cap) || cap < 1)) return setErr("Capacity must be a positive number.");
    setErr("");
    m.mutate({
      title: f.title.trim(),
      description: f.description.trim(),
      venue: f.venue.trim(),
      date: new Date(f.date).toISOString(),
      deadline: new Date(f.deadline).toISOString(),
      capacity: unlimited ? null : cap,
      isUnlimited: unlimited,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            Manage Event & Registrations
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Event & Registration Limit</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-t">Title</Label>
            <Input
              id="edit-t"
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-v">Venue</Label>
            <Input
              id="edit-v"
              value={f.venue}
              onChange={(e) => setF({ ...f, venue: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-dt">Event Date & Time</Label>
              <Input
                id="edit-dt"
                type="datetime-local"
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-dl">Registration Deadline</Label>
              <Input
                id="edit-dl"
                type="datetime-local"
                value={f.deadline}
                onChange={(e) => setF({ ...f, deadline: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-c">Capacity (Seats / Spots)</Label>
              <Button
                type="button"
                variant={unlimited ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setUnlimited(!unlimited)}
              >
                <InfinityIcon className="h-3.5 w-3.5" />
                {unlimited ? "No Seat Limit Enabled" : "No Seat Limit (Open)"}
              </Button>
            </div>
            {unlimited ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary font-medium flex items-center gap-2">
                <InfinityIcon className="h-4 w-4 shrink-0" />
                <span>Open event — as many students can join as want. No seat limit.</span>
              </div>
            ) : (
              <>
                <Input
                  id="edit-c"
                  type="number"
                  min={Math.max(1, event.registered)}
                  value={f.capacity}
                  onChange={(e) => setF({ ...f, capacity: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">Currently: {event.registered} registered</p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Stop Registration</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={stopRegistration}
                disabled={m.isPending}
              >
                Close Registration Now
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Immediately prevents new students from signing up for this event.
            </p>
          </div>

          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={m.isPending}>
            {m.isPending ? "Saving Changes…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnnouncementDialog({ clubId, trigger }: { clubId: string; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const m = useAction((a: { title: string; body: string }) => clubService.postAnnouncement(clubId, a), {
    success: "Announcement posted",
    invalidate: ["announcements"],
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setBody("");
    },
  });

  const submit = () => {
    if (title.trim().length < 3 || body.trim().length < 5)
      return setErr("Add a title and a short message.");
    setErr("");
    m.mutate({ title: title.trim(), body: body.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post Club Announcement</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="at">Title</Label>
            <Input id="at" placeholder="Announcement Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ab">Message</Label>
            <Textarea
              id="ab"
              rows={3}
              placeholder="Write the announcement for club members and students..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
            />
          </div>
          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={m.isPending}>
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
