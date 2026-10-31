import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Search, Users } from "lucide-react";
import { useClubs } from "@/hooks/queries";
import { EmptyState, ErrorState, LoadingCards, PageHeader } from "@/components/shared/States";
import { SubNav, clubTabs } from "@/components/shared/SubNav";
import { ClubAvatar } from "@/components/shared/Cards";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import type { ClubCategory } from "@/types";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clubs/")({
  head: () => seo("Clubs", "Discover technical, cultural and sports clubs at IIIT Nagpur and see who's recruiting."),
  component: Clubs,
});

const cats: (ClubCategory | "all")[] = ["all", "technical", "cultural", "sports", "other"];

function Clubs() {
  const clubs = useClubs();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof cats)[number]>("all");
  const list = (clubs.data ?? []).filter((c) => (cat === "all" || c.category === cat) && (c.name + c.tagline).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader eyebrow="Clubs & Events" title="Find your people" />
      <SubNav items={clubTabs} />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clubs" className="pl-9" aria-label="Search clubs" /></div>
        <div className="flex gap-1.5 overflow-x-auto">
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm capitalize", cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{c}</button>)}
        </div>
      </div>
      {clubs.isLoading ? <LoadingCards count={6} /> : clubs.isError ? <ErrorState error={clubs.error} onRetry={() => clubs.refetch()} /> :
        list.length === 0 ? <EmptyState icon={Users} title="No clubs match" body="Try a different search or category." /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <Link key={c.id} to="/clubs/$clubId" params={{ clubId: c.id }} className="flex flex-col justify-between rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div>
                  <div className="flex items-start gap-3">
                    <ClubAvatar club={c} />
                    <div className="min-w-0 flex-1"><p className="font-bold">{c.name}</p><p className="text-xs capitalize text-muted-foreground">{c.category} · {c.members} members</p></div>
                    {c.recruiting && <StatusBadge status="recruiting" />}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.tagline}</p>
                </div>

                {/* Leads & Contacts preview */}
                {c.clubMembers && c.clubMembers.length > 0 && (
                  <div className="mt-4 border-t pt-3 text-xs">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">Leads & Contacts</p>
                    <div className="space-y-1">
                      {c.clubMembers.map((m) => (
                        <div key={m.name} className="flex items-center justify-between text-muted-foreground">
                          <span className="font-medium text-foreground">{m.name} <span className="text-[10px] text-muted-foreground capitalize">({m.role})</span></span>
                          {m.contact && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary">
                              <Phone className="h-2.5 w-2.5" />{m.contact}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
