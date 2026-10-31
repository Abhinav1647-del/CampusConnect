import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction } from "@/hooks/queries";
import { campusCartService } from "@/services/campusCartService";
import { PageHeader } from "@/components/shared/States";
import { SubNav, cartTabs } from "@/components/shared/SubNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { conditionLabel } from "@/lib/format";
import { seo } from "@/lib/seo";
import type { ListingCategory, ListingCondition } from "@/types";

export const Route = createFileRoute("/campuscart/create")({
  head: () => seo("Sell an item", "Give your pre-loved campus essentials a new home on CampusCart."),
  component: Create,
});

const sel = "h-10 w-full rounded-md border bg-card px-3 text-sm";

function Create() {
  const nav = useNavigate();
  const [f, setF] = useState({ title: "", description: "", category: "textbooks" as ListingCategory, condition: "good" as ListingCondition, price: "", image: "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const m = useAction(campusCartService.create, { success: "Your item is live!", invalidate: ["listings"], onSuccess: (l) => nav({ to: "/campuscart/$listingId", params: { listingId: l.id } }) });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(f.price);
    if (f.title.trim().length < 3) return setErr("Give your item a title (at least 3 characters).");
    if (!Number.isFinite(price) || price < 0 || price > 100000) return setErr("Enter a price between ₹0 and ₹1,00,000.");
    if (f.description.trim().length < 10) return setErr("Add a short description (at least 10 characters).");
    setErr("");
    m.mutate({ title: f.title.trim(), description: f.description.trim(), category: f.category, condition: f.condition, price, images: f.image.trim() ? [f.image.trim()] : [] });
  };
  return (
    <div>
      <PageHeader eyebrow="CampusCart" title="Sell an item" subtitle="Only students with an IIIT Nagpur account can see your listing." />
      <SubNav items={cartTabs} />
      <form onSubmit={submit} className="max-w-xl space-y-5">
        <div className="space-y-1.5"><Label htmlFor="t">Title</Label><Input id="t" value={f.title} onChange={set("title")} maxLength={80} placeholder="What are you selling?" /></div>
        <div>
          <div className="space-y-1.5"><Label htmlFor="cd">Condition</Label><select id="cd" className={sel} value={f.condition} onChange={set("condition")}>{Object.entries(conditionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="p">Price (₹)</Label><Input id="p" type="number" inputMode="numeric" min={0} value={f.price} onChange={set("price")} placeholder="450" /></div>
        <div className="space-y-1.5"><Label htmlFor="d">Description</Label><Textarea id="d" value={f.description} onChange={set("description")} maxLength={600} rows={4} placeholder="Condition details, edition, where to meet…" /></div>
        <div className="space-y-1.5"><Label htmlFor="i">Photo link (optional)</Label><Input id="i" type="url" value={f.image} onChange={set("image")} placeholder="https://…" /></div>
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={m.isPending}>{m.isPending ? "Posting…" : "Post listing"}</Button>
      </form>
    </div>
  );
}
