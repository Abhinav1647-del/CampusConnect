import { useState } from "react";
import { HandHelping, CheckCircle2, Trash2, Phone, MessageSquare, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/queries";
import { useRole } from "@/context/RoleContext";
import { campusCartService } from "@/services/campusCartService";
import { categoryLabel, inr, timeAgo } from "@/lib/format";
import type { ItemRequest, ItemRequestInput, ListingCategory } from "@/types";

export function RequestItemDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useRole();
  const [f, setF] = useState<ItemRequestInput>({
    title: "",
    description: "",
    category: "textbooks",
    budget: "" as any,
    contact: "",
  });
  const [err, setErr] = useState("");

  const m = useAction(
    (input: ItemRequestInput) => campusCartService.createItemRequest(input, user ? { id: user.id, name: user.name, rollNo: user.rollNo } : undefined),
    {
      success: "Buy request posted! Other students can now see what you need.",
      invalidate: ["itemRequests"],
      onSuccess: () => {
        setOpen(false);
        setF({ title: "", description: "", category: "textbooks", budget: "" as any, contact: "" });
        setErr("");
      },
    }
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = Number(f.budget);
    if (f.title.trim().length < 3) return setErr("Please enter the name of the item you need (at least 3 characters).");
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) return setErr("Please specify a valid budget amount in ₹.");
    if (budgetNum > 100000) return setErr("Budget cannot exceed ₹1,00,000.");
    if (f.description.trim().length < 8) return setErr("Please describe what condition or edition you are looking for (at least 8 characters).");
    setErr("");

    m.mutate({
      title: f.title.trim(),
      description: f.description.trim(),
      category: f.category,
      budget: budgetNum,
      contact: f.contact?.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 shadow-sm font-medium">
            <HandHelping className="h-4 w-4" /> Request an item to buy
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHelping className="h-5 w-5 text-primary" />
            Request an Item to Buy
          </DialogTitle>
          <DialogDescription>
            Can't find what you need? Post a request and campus peers who have the item can reach out to sell it to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="req-title">What are you looking for? *</Label>
            <Input
              id="req-title"
              placeholder="e.g., Casio fx-991EX Calculator, CLRS 3rd Ed..."
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={f.category}
                onValueChange={(v) => setF({ ...f, category: v as ListingCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabel).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-budget">Target Budget (₹) *</Label>
              <Input
                id="req-budget"
                type="number"
                placeholder="500"
                min={1}
                value={f.budget || ""}
                onChange={(e) => setF({ ...f, budget: e.target.value as any })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-desc">Details & Condition Wanted *</Label>
            <Textarea
              id="req-desc"
              rows={3}
              placeholder="Mention semester, course code, acceptable condition, or where on campus you can meet..."
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              maxLength={400}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-contact">Contact Info / Hostel Room (Optional)</Label>
            <Input
              id="req-contact"
              placeholder="e.g., WhatsApp: 9876543210 or Room 304, Boys Hostel A"
              value={f.contact || ""}
              onChange={(e) => setF({ ...f, contact: e.target.value })}
              maxLength={80}
            />
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? "Posting Request..." : "Post Buy Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ItemRequestCard({ item }: { item: ItemRequest }) {
  const { user, can } = useRole();
  const [contactOpen, setContactOpen] = useState(false);
  const isMine = user?.id === item.requesterId;
  const isMod = can("moderator", "admin");

  const fulfill = useAction(() => campusCartService.fulfillItemRequest(item.id), {
    success: "Request marked as fulfilled!",
    invalidate: ["itemRequests"],
  });

  const remove = useAction(() => campusCartService.deleteItemRequest(item.id), {
    success: "Request deleted.",
    invalidate: ["itemRequests"],
  });

  return (
    <div className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <HandHelping className="h-3 w-3" /> Looking to Buy
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
              {categoryLabel[item.category] || item.category}
            </span>
          </div>
          {item.status === "fulfilled" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Fulfilled
            </span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {timeAgo(item.createdAt)}
            </span>
          )}
        </div>

        <h3 className="mt-3 font-display text-base font-semibold text-foreground line-clamp-2">
          {item.title}
        </h3>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">Budget:</span>
          <span className="text-lg font-bold text-primary">Up to {inr(item.budget)}</span>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {item.description}
        </p>
      </div>

      <div className="mt-4 border-t pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{item.requesterName}</p>
            {item.requesterRollNo && (
              <p className="text-[11px] text-muted-foreground">{item.requesterRollNo}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isMine || isMod ? (
              <>
                {item.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => fulfill.mutate({} as any)}
                    disabled={fulfill.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Fulfilled
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate({} as any)}
                  disabled={remove.isPending}
                  title="Delete request"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5" /> I Have This
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Contact Requester
                    </DialogTitle>
                    <DialogDescription>
                      Reach out to {item.requesterName} to sell your item.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-muted-foreground">Offering budget: Up to {inr(item.budget)}</p>
                    </div>

                    {item.requesterContact ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                        <p className="text-xs font-medium text-muted-foreground">Contact details:</p>
                        <p className="mt-1 font-semibold text-foreground flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                          {item.requesterContact}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No phone number provided. You can message {item.requesterName} ({item.requesterRollNo || "Student"}) in campus groups or hostel.
                      </p>
                    )}
                  </div>
                  <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => setContactOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
