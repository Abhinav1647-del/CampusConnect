import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, HandHelping, Plus, Search, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { useItemRequests, useListings } from "@/hooks/queries";
import { useRole } from "@/context/RoleContext";
import { EmptyState, ErrorState, LoadingCards, PageHeader } from "@/components/shared/States";
import { SubNav, cartTabs } from "@/components/shared/SubNav";
import { ListingCard } from "@/components/shared/Cards";
import { ItemRequestCard, RequestItemDialog } from "@/components/cart/ItemRequestComponents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categoryLabel } from "@/lib/format";
import { seo } from "@/lib/seo";
import type { ListingCategory } from "@/types";

export const Route = createFileRoute("/campuscart/")({
  head: () => seo("CampusCart", "Buy, sell, and request pre-loved finds with fellow IIIT Nagpur students."),
  component: Browse,
});

type Section = "selling" | "requested";
type Sort = "new" | "low" | "high";

function Browse() {
  const listingsQ = useListings();
  const requestsQ = useItemRequests();
  const { can } = useRole();

  const [section, setSection] = useState<Section>("selling");
  const [term, setTerm] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("new");

  // Filter listings (Items for Sale)
  const sellingList = (listingsQ.data ?? [])
    .filter((l) => l.status === "available" || l.status === "reserved")
    .filter((l) => catFilter === "all" || l.category === catFilter)
    .filter((l) => (l.title + " " + l.description).toLowerCase().includes(term.toLowerCase()))
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
        ? b.price - a.price
        : b.createdAt.localeCompare(a.createdAt)
    );

  // Filter item requests (Requested Items)
  const requestedList = (requestsQ.data ?? [])
    .filter((r) => catFilter === "all" || r.category === catFilter)
    .filter((r) => (r.title + " " + r.description).toLowerCase().includes(term.toLowerCase()))
    .sort((a, b) =>
      sort === "low"
        ? a.budget - b.budget
        : sort === "high"
        ? b.budget - a.budget
        : b.createdAt.localeCompare(a.createdAt)
    );

  return (
    <div>
      <PageHeader
        eyebrow="The student marketplace"
        title="CampusCart"
        subtitle="Good finds. New beginnings. Buy, sell, or request items right here on campus."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="gap-1.5 shadow-sm">
              <Link to="/campuscart/create">
                Sell an item <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <RequestItemDialog
              trigger={
                <Button className="gap-1.5 shadow-sm">
                  <HandHelping className="h-4 w-4" /> Request an item to buy
                </Button>
              }
            />
          </div>
        }
      />

      <SubNav items={cartTabs} />

      {can("moderator", "admin") && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Marketplace Moderator: You have permission to review reports and remove flagged listings.</span>
          </div>
          <Link
            to="/admin/campuscart"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Review Reports Queue →
          </Link>
        </div>
      )}

      {/* Two Sub-sections Toggle: Items for Sale vs Requested Items */}
      <div className="mb-6">
        <Tabs
          value={section}
          onValueChange={(v) => {
            setSection(v as Section);
            setTerm("");
          }}
          className="w-full"
        >
          <TabsList className="h-12 w-full max-w-md grid grid-cols-2 p-1 bg-muted/80 rounded-xl">
            <TabsTrigger
              value="selling"
              className="gap-2 rounded-lg text-sm font-semibold transition data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span>Items for Sale</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {listingsQ.data?.length ?? 0}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="requested"
              className="gap-2 rounded-lg text-sm font-semibold transition data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <HandHelping className="h-4 w-4 text-primary" />
              <span>Requested Items</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {requestsQ.data?.length ?? 0}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search and Filters Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search items"
            placeholder={
              section === "selling"
                ? "Search items being sold (calculators, textbooks, lamps…)"
                : "Search requested items students want to buy…"
            }
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="h-11 bg-card pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <select
            aria-label="Category filter"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="h-11 rounded-md border bg-card px-3 text-sm"
          >
            <option value="all">All categories</option>
            {Object.entries(categoryLabel).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-11 rounded-md border bg-card px-3 text-sm"
          >
            <option value="new">Newest first</option>
            <option value="low">
              {section === "selling" ? "Price: Low to High" : "Budget: Low to High"}
            </option>
            <option value="high">
              {section === "selling" ? "Price: High to Low" : "Budget: High to Low"}
            </option>
          </select>
        </div>
      </div>

      {/* Sub-section 1: Items Being Sold */}
      {section === "selling" && (
        <div>
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Items for Sale
              </h2>
              <p className="text-xs text-muted-foreground">
                Explore pre-owned goods and books listed by IIIT Nagpur students
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {sellingList.length} {sellingList.length === 1 ? "item" : "items"}
            </span>
          </div>

          {listingsQ.isLoading ? (
            <LoadingCards count={6} className="sm:grid-cols-2 lg:grid-cols-3" />
          ) : listingsQ.isError ? (
            <ErrorState error={listingsQ.error} onRetry={() => listingsQ.refetch()} />
          ) : sellingList.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No items found"
              body="No items match your search or filter. Try a different query or post an item for sale!"
              action={
                <Button asChild size="sm" className="mt-2">
                  <Link to="/campuscart/create">
                    <Plus className="mr-1 h-4 w-4" /> Sell an item
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6 lg:grid-cols-3">
              {sellingList.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-section 2: Items Requested */}
      {section === "requested" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Requested Items (Looking to Buy)
              </h2>
              <p className="text-xs text-muted-foreground">
                Students looking for specific items on campus — have what they need? Reach out to sell!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {requestedList.length} {requestedList.length === 1 ? "request" : "requests"}
              </span>
              <RequestItemDialog
                trigger={
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Request an item
                  </Button>
                }
              />
            </div>
          </div>

          {requestsQ.isLoading ? (
            <LoadingCards count={6} className="sm:grid-cols-2 lg:grid-cols-3" />
          ) : requestsQ.isError ? (
            <ErrorState error={requestsQ.error} onRetry={() => requestsQ.refetch()} />
          ) : requestedList.length === 0 ? (
            <EmptyState
              icon={HandHelping}
              title={term ? "No matching requests found" : "No item requests yet"}
              body={
                term
                  ? "Try another keyword or clear your filters."
                  : "Looking for a textbook, calculator, electronics, or hostel essential? Post a request and campus peers can reach out."
              }
              action={
                <RequestItemDialog
                  trigger={
                    <Button size="sm" className="mt-2 gap-1.5 shadow-sm">
                      <HandHelping className="h-4 w-4" /> Request an item to buy
                    </Button>
                  }
                />
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {requestedList.map((req) => (
                <ItemRequestCard key={req.id} item={req} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
