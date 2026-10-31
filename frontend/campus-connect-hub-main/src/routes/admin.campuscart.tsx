import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useAction, useReports } from "@/hooks/queries";
import { campusCartService } from "@/services/campusCartService";
import { EmptyState, ErrorState, LoadingCards, PageHeader } from "@/components/shared/States";
import { SubNav, useAdminTabs } from "@/components/shared/SubNav";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin/campuscart")({
  head: () => seo("CampusCart moderation", "Review reported CampusCart listings."),
  component: AdminCart,
});

function AdminCart() {
  const q = useReports();
  const tabs = useAdminTabs();
  const resolve = useAction(({ id, action }: { id: string; action: "dismiss" | "remove" }) => campusCartService.resolveReport(id, action), { success: "Report resolved", invalidate: ["reports", "listings"] });
  const open = (q.data ?? []).filter((r) => !r.resolved);
  return (
    <div>
      <PageHeader eyebrow="CampusCart Moderator" title="Marketplace Moderation" />
      <SubNav items={tabs} />
      {q.isLoading ? <LoadingCards /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : open.length === 0 ? <EmptyState icon={ShieldCheck} title="No open reports" body="All clear." /> : (
        <ul className="space-y-3">{open.map((r) => (
          <li key={r.id} className="rounded-xl border bg-card p-4">
            <p className="font-semibold">{r.listing?.title ?? "Listing"}</p>
            <p className="text-sm">Reason: {r.reason}</p>
            <p className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => resolve.mutate({ id: r.id, action: "remove" })}>Remove listing</Button>
              <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: r.id, action: "dismiss" })}>Dismiss</Button>
            </div>
          </li>
        ))}</ul>
      )}
    </div>
  );
}
