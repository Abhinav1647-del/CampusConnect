import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { useAction, useMyRequests } from "@/hooks/queries";
import { campusCartService } from "@/services/campusCartService";
import { EmptyState, ErrorState, LoadingCards, PageHeader, SectionTitle } from "@/components/shared/States";
import { SubNav, cartTabs } from "@/components/shared/SubNav";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";
import type { PurchaseRequest, RequestStatus } from "@/types";

export const Route = createFileRoute("/campuscart/my-activity")({
  head: () => seo("My CampusCart activity", "Purchase requests you've sent and received on CampusCart."),
  component: MyActivity,
});

function MyActivity() {
  const q = useMyRequests();
  const upd = useAction(({ id, status }: { id: string; status: RequestStatus }) => campusCartService.updateRequest(id, status), { success: "Request updated", invalidate: ["requests", "listings", "listing"] });
  const row = (r: PurchaseRequest, received: boolean) => (
    <li key={r.id} className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2"><p className="font-semibold">{r.listingTitle}</p><StatusBadge status={r.status} /></div>
      <p className="text-xs text-muted-foreground">{received ? `From ${r.buyerName}` : "Sent by you"} · {timeAgo(r.createdAt)}</p>
      {r.message && <p className="mt-2 text-sm">"{r.message}"</p>}
      {r.status === "pending" && (
        <div className="mt-3 flex gap-2">
          {received ? (<>
            <Button size="sm" onClick={() => upd.mutate({ id: r.id, status: "accepted" })}>Accept</Button>
            <Button size="sm" variant="outline" onClick={() => upd.mutate({ id: r.id, status: "rejected" })}>Decline</Button>
          </>) : <Button size="sm" variant="outline" onClick={() => upd.mutate({ id: r.id, status: "cancelled" })}>Cancel request</Button>}
        </div>
      )}
      {received && r.status === "accepted" && <Button size="sm" className="mt-3" onClick={() => upd.mutate({ id: r.id, status: "completed" })}>Mark as sold</Button>}
    </li>
  );
  return (
    <div>
      <PageHeader eyebrow="CampusCart" title="My activity" />
      <SubNav items={cartTabs} />
      {q.isLoading ? <LoadingCards /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <div className="grid gap-8 lg:grid-cols-2">
          {([["Requests received", q.data?.received ?? [], true], ["Requests sent", q.data?.sent ?? [], false]] as const).map(([t, list, rec]) => (
            <section key={t}>
              <SectionTitle>{t}</SectionTitle>
              {list.length === 0 ? <EmptyState icon={Inbox} title="Nothing here yet" /> : <ul className="space-y-3">{list.map((r) => row(r, rec))}</ul>}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
