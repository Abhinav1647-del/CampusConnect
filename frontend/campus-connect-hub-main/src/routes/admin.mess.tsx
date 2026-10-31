import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Edit2, Plus, Trash2, Utensils, Check, Eye, EyeOff } from "lucide-react";
import { useAction, useMenu, useNotices } from "@/hooks/queries";
import { messService } from "@/services/messService";
import { PageHeader, SectionTitle } from "@/components/shared/States";
import { SubNav, useAdminTabs } from "@/components/shared/SubNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { periodLabel, todayISO, to12Hour } from "@/lib/format";
import { seo } from "@/lib/seo";
import { toast } from "sonner";
import type { MealPeriod } from "@/types";

export const Route = createFileRoute("/admin/mess")({
  head: () => seo("Mess Admin", "Manage daily food menu, dishes and mess notices."),
  component: AdminMess,
});

function AdminMess() {
  const [date, setDate] = useState(todayISO());
  const menu = useMenu(date);
  const notices = useNotices();
  const tabs = useAdminTabs();

  // Notices state
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");

  // Edit food modal state
  const [editingPeriod, setEditingPeriod] = useState<MealPeriod | null>(null);
  const [dishInput, setDishInput] = useState("");
  const [isSavingFood, setIsSavingFood] = useState(false);

  const publish = useAction(messService.saveMenu, {
    success: "Menu status updated",
    invalidate: ["menu", "week"],
  });

  const postNotice = useAction(messService.createNotice, {
    success: "Mess notice posted",
    invalidate: ["notices"],
    onSuccess: () => {
      setNoticeTitle("");
      setNoticeBody("");
    },
  });

  const delNotice = useAction(messService.deleteNotice, {
    success: "Notice removed",
    invalidate: ["notices"],
  });

  const openFoodEditor = (period: MealPeriod, currentDishes: { name: string }[]) => {
    setEditingPeriod(period);
    setDishInput(currentDishes.map((d) => d.name).join(", "));
  };

  const handleSaveMealFood = async () => {
    if (!editingPeriod) return;
    setIsSavingFood(true);
    try {
      const names = dishInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (names.length === 0) {
        toast.error("Please enter at least one dish name.");
        setIsSavingFood(false);
        return;
      }

      await messService.updateMealDishes(date, editingPeriod, names, menu.data?.published ?? true);
      toast.success(`${periodLabel[editingPeriod]} food items updated!`);
      menu.refetch();
      setEditingPeriod(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update food items.");
    } finally {
      setIsSavingFood(false);
    }
  };

  const periods: MealPeriod[] = ["breakfast", "lunch", "snacks", "dinner"];

  return (
    <div className="space-y-8">
      <div>
        <PageHeader eyebrow="Mess Administrator" title="Daily Food & Menu Management" />
        <p className="mt-1 text-sm text-muted-foreground">
          Update food dishes for daily meals, publish menu schedules, and post notices for students.
        </p>
      </div>

      <SubNav items={tabs} />

      {/* Date & Publish Control */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="menu-date" className="font-semibold text-base">Select Date:</Label>
            <Input
              id="menu-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto font-medium"
            />
            {date === todayISO() && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Today
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {menu.data && (
              <Button
                variant={menu.data.published ? "outline" : "default"}
                size="sm"
                disabled={publish.isPending}
                onClick={() =>
                  publish.mutate({ ...menu.data!, published: !menu.data!.published })
                }
              >
                {menu.data.published ? (
                  <>
                    <EyeOff className="mr-1.5 h-4 w-4 text-muted-foreground" /> Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="mr-1.5 h-4 w-4" /> Publish to Students
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 4 Meals Grid with Dish Editing */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {periods.map((period) => {
            const meal = menu.data?.meals.find(
              (m) => m.period.toLowerCase() === period.toLowerCase()
            );
            const dishes = meal?.dishes || [];

            return (
              <div
                key={period}
                className="flex flex-col justify-between rounded-xl border bg-background p-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {periodLabel[period]}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {meal?.start && meal?.end
                          ? `${to12Hour(meal.start)} – ${to12Hour(meal.end)}`
                          : "Scheduled meal"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => openFoodEditor(period, dishes)}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-primary" />
                      Edit Foods
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Current Dishes ({dishes.length}):
                    </p>
                    {dishes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {dishes.map((dish) => (
                          <span
                            key={dish.name}
                            className="inline-flex items-center gap-1 rounded-md border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground"
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                dish.veg ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
                            {dish.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground pt-1">
                        No dishes configured. Click "Edit Foods" to add.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t text-[11px] text-muted-foreground flex justify-between">
                  <span>Rating: {dishes.length > 0 ? `${(dishes.reduce((acc, d) => acc + (d.avgRating || 0), 0) / dishes.length).toFixed(1)} ★` : "—"}</span>
                  <span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => openFoodEditor(period, dishes)}>
                    Update dishes →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Edit Food Dialog */}
      <Dialog open={!!editingPeriod} onOpenChange={(open) => !open && setEditingPeriod(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Edit {editingPeriod ? periodLabel[editingPeriod] : ""} Dishes
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dishes-input">Dishes (comma separated)</Label>
              <Textarea
                id="dishes-input"
                rows={3}
                placeholder="e.g. Masala Dosa, Sambhar, Coconut Chutney, Tea, Coffee"
                value={dishInput}
                onChange={(e) => setDishInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter dishes separated by commas. Changes will immediately update for students on {date}.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPeriod(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMealFood} disabled={isSavingFood}>
              {isSavingFood ? "Saving…" : "Save & Update Foods"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mess Notices Management */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
        <div>
          <SectionTitle>Publish Mess Notice</SectionTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Post announcements directly to the mess dining board (e.g. festive feast, timing revisions).
          </p>
        </div>

        <div className="space-y-3 rounded-xl border bg-background p-4">
          <div className="space-y-1.5">
            <Label htmlFor="notice-title">Notice Title</Label>
            <Input
              id="notice-title"
              placeholder="e.g. Special Dinner this Friday"
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notice-body">Message</Label>
            <Textarea
              id="notice-body"
              rows={2}
              placeholder="e.g. Festive special dinner with Paneer Tikka, Naan, and Gulab Jamun starting 7:30 PM."
              value={noticeBody}
              onChange={(e) => setNoticeBody(e.target.value)}
            />
          </div>

          <Button
            size="sm"
            disabled={!noticeTitle.trim() || !noticeBody.trim() || postNotice.isPending}
            onClick={() =>
              postNotice.mutate({ title: noticeTitle.trim(), body: noticeBody.trim() })
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Post Notice
          </Button>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-3">Active Mess Notices</h3>
          <ul className="space-y-2">
            {(notices.data ?? [])
              .filter((n) => n.scope === "mess")
              .map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-3 rounded-xl border bg-background p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    aria-label="Delete notice"
                    onClick={() => delNotice.mutate(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
