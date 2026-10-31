import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Flag, Heart, Trash2 } from "lucide-react";
import { useAction, useListing, useMyRequests } from "@/hooks/queries";
import { campusCartService } from "@/services/campusCartService";
import { useRole } from "@/context/RoleContext";
import { ErrorState, LoadingCards } from "@/components/shared/States";
import { ListingImage } from "@/components/shared/Cards";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { conditionLabel, inr, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campuscart/$listingId")({
  head: () => ({ meta: [
    { title: "Listing — CampusCart" },
    { name: "description", content: "Item for sale on CampusCart, the IIIT Nagpur student marketplace." },
    { property: "og:title", content: "Listing — CampusCart" },
    { property: "og:description", content: "Item for sale on CampusCart, the IIIT Nagpur student marketplace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ListingPage,
});

function ListingPage() {
  const { listingId } = Route.useParams();
  const navigate = useNavigate();
  const q = useListing(listingId);
  const { user, saved, toggleSaved, can } = useRole();
  const myRequests = useMyRequests();
  const [dialog, setDialog] = useState<"request" | "report" | "delete" | null>(null);
  const [text, setText] = useState("");
  const close = () => { setDialog(null); setText(""); };
  const req = useAction((m: string) => campusCartService.sendRequest(listingId, m), {
    success: "Request sent to the seller",
    invalidate: ["requests", "listing", "listings"],
    onSuccess: () => {
      close();
      myRequests.refetch();
      q.refetch();
    },
  });
  const cancelReq = useAction((reqId: string) => campusCartService.updateRequest(reqId, "cancelled"), {
    success: "Request cancelled",
    invalidate: ["requests", "listing", "listings"],
    onSuccess: () => {
      myRequests.refetch();
      q.refetch();
    },
  });
  const rep = useAction((r: string) => campusCartService.report(listingId, r), { success: "Thanks — a moderator will review it", invalidate: ["reports"], onSuccess: close });
  const status = useAction((s: "available" | "reserved" | "sold") => campusCartService.setStatus(listingId, s), { success: "Listing updated", invalidate: ["listing", "listings"] });
  
  const del = useAction(() => campusCartService.deleteListing(listingId), {
    success: "Listing removed successfully",
    invalidate: ["listings"],
    onSuccess: () => {
      close();
      navigate({ to: "/campuscart" });
    },
  });

  if (q.isLoading) return <LoadingCards count={2} />;
  if (q.isError || !q.data) return <ErrorState error={q.error ?? new Error("Listing not found")} onRetry={() => q.refetch()} />;
  const l = q.data;
  const mine = user?.id === l.sellerId;
  const canDelete = mine || can("moderator", "admin");
  const isSaved = saved.listings.includes(l.id);
  const existingReq = myRequests.data?.sent?.find(
    (r) => r.listingId === l.id && r.status !== "cancelled" && r.status !== "rejected"
  );

  return (
    <div>
      <Link to="/campuscart" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to CampusCart</Link>
      <div className="grid gap-6 md:grid-cols-2">
        <ListingImage listing={l} className="aspect-square rounded-2xl" />
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-extrabold">{l.title}</h1>
            <Button size="icon" variant="outline" aria-label={isSaved ? "Unsave" : "Save"} onClick={() => toggleSaved("listings", l.id)}><Heart className={cn("h-4 w-4", isSaved && "fill-destructive text-destructive")} /></Button>
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-primary">{inr(l.price)}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <StatusBadge status={l.status} />
            <span className="rounded-full bg-muted px-2.5 py-1">{conditionLabel[l.condition]}</span>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm">{l.description}</p>
          <p className="mt-4 text-sm text-muted-foreground">Sold by <span className="font-semibold text-foreground">{mine ? "you" : l.sellerName}</span> · listed {timeAgo(l.createdAt)}</p>
          
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {mine ? (<>
              {l.status !== "available" && <Button variant="outline" onClick={() => status.mutate("available")}>Mark available</Button>}
              {l.status === "available" && <Button variant="outline" onClick={() => status.mutate("reserved")}>Mark reserved</Button>}
              {l.status !== "sold" && <Button onClick={() => status.mutate("sold")}>Mark sold</Button>}
              <Button
                variant="destructive"
                className="gap-1.5 ml-auto"
                onClick={() => setDialog("delete")}
              >
                <Trash2 className="h-4 w-4" /> Remove Listing
              </Button>
            </>) : (<>
              {existingReq ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <Button className="flex-1 cursor-default" disabled variant="secondary">
                    <CheckCircle className="mr-1.5 h-4 w-4 text-emerald-500" />
                    Requested {existingReq.status === "accepted" ? "(Accepted)" : existingReq.status === "completed" ? "(Completed)" : "(Pending)"}
                  </Button>
                  {existingReq.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancelReq.isPending}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => cancelReq.mutate(existingReq.id)}
                    >
                      {cancelReq.isPending ? "Cancelling…" : "Cancel"}
                    </Button>
                  )}
                </div>
              ) : (
                <Button className="flex-1" disabled={l.status !== "available"} onClick={() => setDialog("request")}>{l.status === "available" ? "Request to buy" : "Not available"}</Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDialog("delete")}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                </Button>
              )}
              <Button variant="ghost" onClick={() => setDialog("report")}><Flag className="mr-1 h-4 w-4" />Report</Button>
            </>)}
          </div>
          <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">Meet in a public spot on campus and check the item before paying.</p>
        </div>
      </div>

      {/* Action Dialogs */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          {dialog === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle>Remove this listing?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove &quot;{l.title}&quot; from CampusCart? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={close}>
                  Keep Listing
                </Button>
                <Button
                  variant="destructive"
                  disabled={del.isPending}
                  onClick={() => del.mutate()}
                >
                  {del.isPending ? "Removing…" : "Yes, Remove Listing"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{dialog === "report" ? "Report this listing" : `Message ${l.sellerName}`}</DialogTitle>
              </DialogHeader>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={300}
                placeholder={dialog === "report" ? "What's wrong with this listing?" : "Hi! Is this still available? I can meet near the library."}
              />
              <DialogFooter>
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button
                  disabled={!text.trim() || req.isPending || rep.isPending}
                  onClick={() => (dialog === "report" ? rep.mutate(text.trim()) : req.mutate(text.trim()))}
                >
                  {dialog === "report" ? "Submit report" : "Send request"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
