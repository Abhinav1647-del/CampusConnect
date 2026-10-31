import { Link } from "@tanstack/react-router";
import { BookOpen, Calculator, CalendarDays, Cpu, Heart, Lamp, MapPin, PenTool, ShoppingBag } from "lucide-react";
import type { Club, ClubEvent, Listing, ListingCategory } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { conditionLabel, fmtDateTime, inr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import bookImage from "@/assets/marketplace-book.jpg";
import calculatorImage from "@/assets/marketplace-calculator.jpg";
import lampImage from "@/assets/marketplace-lamp.jpg";
import arduinoImage from "@/assets/marketplace-arduino.jpg";
import drawingImage from "@/assets/marketplace-drawing.jpg";
import kettleImage from "@/assets/marketplace-kettle.jpg";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/context/RoleContext";
import { cn } from "@/lib/utils";

export const categoryIcon: Record<ListingCategory, typeof BookOpen> = {
  textbooks: BookOpen, calculators: Calculator, electronics: Cpu, stationery: PenTool, hostel: Lamp,
};
const chartBg: Record<string, string> = { "1": "bg-chart-1", "2": "bg-chart-2", "3": "bg-chart-3", "4": "bg-chart-4", "5": "bg-chart-5" };

export function ClubAvatar({ club, className }: { club: Pick<Club, "name" | "color">; className?: string }) {
  return (
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display font-extrabold text-primary-foreground", chartBg[club.color], className)}>
      {club.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
    </span>
  );
}

const samplePhotos: Record<string, string> = { l1: bookImage, l2: calculatorImage, l3: lampImage, l4: arduinoImage, l5: drawingImage, l6: kettleImage, l7: bookImage };

export function ListingImage({ listing, className }: { listing: Pick<Listing, "images" | "category" | "title"> & { id?: string }; className?: string }) {
  const src = listing.images[0] ?? (listing.id ? samplePhotos[listing.id] : undefined);
  if (src) return <img src={src} alt={listing.title} loading="lazy" width={512} height={512} className={cn("object-cover", className)} />;
  return (
    <div className={cn("grid place-items-center bg-muted", className)}>
      <ShoppingBag className="h-10 w-10 text-muted-foreground" aria-hidden />
    </div>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  const { saved, toggleSaved } = useRole();
  const isSaved = saved.listings.includes(listing.id);
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition duration-200 motion-safe:hover:-translate-y-1 hover:border-primary/30">
      <Link to="/campuscart/$listingId" params={{ listingId: listing.id }} className="block">
        <ListingImage listing={listing} className="aspect-square w-full border-b" />
        <div className="p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-display text-lg font-extrabold">{inr(listing.price)}</span>
            {listing.status !== "available" && <StatusBadge status={listing.status} />}
          </div>
          <p className="line-clamp-2 text-sm font-medium">{listing.title}</p>
          <p className="mt-2 text-xs text-muted-foreground">{conditionLabel[listing.condition]}</p>
          <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{listing.sellerName}</p>
        </div>
      </Link>
      <Button size="icon" variant="secondary" onClick={() => toggleSaved("listings", listing.id)} aria-label={isSaved ? "Remove bookmark" : "Bookmark listing"} aria-pressed={isSaved}
        className="absolute right-3 top-3 h-9 w-9 rounded-full border bg-card/90 hover:bg-card">
        <Heart className={cn("h-4 w-4", isSaved ? "fill-destructive text-destructive" : "text-muted-foreground")} />
      </Button>
    </div>
  );
}

export function eventState(e: ClubEvent) {
  const past = new Date(e.date) < new Date();
  const closed = new Date(e.deadline) < new Date();
  const isUnlimited = e.isUnlimited === true || e.capacity === null || e.capacity === 0 || e.capacity === undefined;
  const full = !isUnlimited && e.capacity !== null && e.capacity !== undefined ? e.registered >= e.capacity : false;
  return { past, closed, full, isUnlimited };
}

export function EventCard({ event, club, regStatus }: { event: ClubEvent; club?: Club | undefined; regStatus?: string | undefined }) {
  const { past, full, isUnlimited } = eventState(event);
  const hasCap = !isUnlimited && event.capacity !== null && event.capacity !== undefined && event.capacity > 0;
  const pct = hasCap ? Math.min(100, Math.round((event.registered / event.capacity!) * 100)) : 0;
  const isDemoDays = event.title.toLowerCase().includes("demodays") || event.id === "e-demodays";
  return (
    <Link to="/events/$eventId" params={{ eventId: event.id }} className="flex flex-col rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-3 flex items-start gap-3">
        {club && !club.name.toLowerCase().includes("robotics") ? (
          <ClubAvatar club={club} className="h-10 w-10 text-sm" />
        ) : isDemoDays ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 font-display font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
            CR
          </span>
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 font-display font-extrabold text-primary text-xs">
            IO
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{event.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {club?.name && !club.name.toLowerCase().includes("robotics")
              ? club.name
              : (event.clubName && !event.clubName.toLowerCase().includes("robotics")
                ? event.clubName
                : (event.clubId === "c7" || isDemoDays ? "CRISPR" : "Iotics"))}
          </p>
        </div>
        {!isDemoDays && (
          regStatus ? (
            <StatusBadge status={regStatus} />
          ) : past ? (
            <StatusBadge status="past" />
          ) : full ? (
            <StatusBadge status="full" label="Full" />
          ) : null
        )}
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> {fmtDateTime(event.date)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {event.venue}</p>
      {!past && !isDemoDays && (
        hasCap ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{event.registered}/{event.capacity} registered</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" aria-label="Capacity filled" />
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium text-foreground">{event.registered} registered</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">No seat limit</span>
          </div>
        )
      )}
    </Link>
  );
}
