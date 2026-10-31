import { api } from "./api";
import { endpoints } from "./endpoints";
import type { ItemRequest, ItemRequestInput, Listing, ListingInput, ListingStatus, PurchaseRequest, Report, RequestStatus } from "@/types";
import { listings as defaultListings, itemRequests as defaultItemRequests } from "@/mocks/data";

const LOCAL_LISTINGS_KEY = "cc_user_listings_v4";
const LOCAL_ITEM_REQUESTS_KEY = "cc_user_item_requests_v4";

function purgeOldKeys() {
  if (typeof window === "undefined") return;
  try {
    for (const k of ["cc_local_listings_v2", "cc_user_listings_v3", "cc_local_item_requests_v2", "cc_user_item_requests_v3", "cc_local_listings"]) {
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
purgeOldKeys();

function getLocalListings(): Listing[] {
  if (typeof window === "undefined") return [];
  try {
    purgeOldKeys();
    const raw = localStorage.getItem(LOCAL_LISTINGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalListings(list: Listing[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_LISTINGS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function getLocalItemRequests(): ItemRequest[] {
  if (typeof window === "undefined") return [];
  try {
    purgeOldKeys();
    const raw = localStorage.getItem(LOCAL_ITEM_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalItemRequests(requests: ItemRequest[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_ITEM_REQUESTS_KEY, JSON.stringify(requests));
  } catch {
    /* ignore */
  }
}

function normalizeListing(raw: any): Listing {
  if (!raw) return raw;
  const rawCat = (raw.category || "textbooks").toString().toLowerCase();
  const categoryMap: Record<string, any> = {
    books: "textbooks",
    textbooks: "textbooks",
    calculators: "calculators",
    electronics: "electronics",
    stationery: "stationery",
    hostel: "hostel",
  };
  const category = categoryMap[rawCat] || "textbooks";
  const condition = (raw.condition || "good").toString().toLowerCase().replace(/-/g, "_");
  const status = (raw.status || "available").toString().toLowerCase();
  const price = typeof raw.price === "number" ? raw.price : (typeof raw.price === "object" && raw.price !== null && Array.isArray(raw.price.d)) ? raw.price.d[0] : Number(raw.price || 0);

  return {
    id: raw.id,
    sellerId: raw.sellerId || raw.seller?.id || "",
    sellerName: raw.sellerName || raw.seller?.name || "Student",
    title: raw.title || "",
    description: raw.description || "",
    category,
    condition: ["new", "like_new", "good", "fair"].includes(condition) ? condition : "good",
    price,
    images: Array.isArray(raw.images) ? raw.images.map((img: any) => typeof img === "string" ? img : img?.url || "") : [],
    status: ["available", "reserved", "sold", "removed"].includes(status) ? status : "available",
    createdAt: raw.createdAt || new Date().toISOString(),
    reports: raw.reports ?? 0,
  };
}

export const campusCartService = {
  list: async (): Promise<Listing[]> => {
    try {
      const res = await api.get<any>(endpoints.cart.listings);
      const list = Array.isArray(res) ? res : [];
      if (list.length > 0) return list.map(normalizeListing);
    } catch {
      /* ignore */
    }
    return getLocalListings();
  },
  get: async (id: string): Promise<Listing> => {
    try {
      const res = await api.get<any>(endpoints.cart.listing(id));
      if (res) return normalizeListing(res);
    } catch {
      /* ignore */
    }
    const found = getLocalListings().find((l) => l.id === id);
    if (found) return found;
    throw new Error("Listing not found");
  },
  create: async (input: ListingInput): Promise<Listing> => {
    const conditionMap: Record<string, string> = {
      new: "NEW",
      like_new: "LIKE_NEW",
      good: "GOOD",
      fair: "FAIR",
    };
    const condition = conditionMap[input.condition] || "GOOD";
    const payload = {
      title: input.title,
      description: input.description,
      category: input.category,
      condition,
      price: Number(input.price),
      images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
    };
    const fallback: Listing = {
      ...input,
      id: `l-${Date.now()}`,
      sellerId: "u1",
      sellerName: "Aarav Sharma",
      price: Number(input.price),
      status: "available",
      createdAt: new Date().toISOString(),
      reports: 0,
    };
    try {
      const res = await api.post<any>(endpoints.cart.listings, payload);
      const item = res ? normalizeListing(res) : fallback;
      const all = getLocalListings();
      all.unshift(item);
      saveLocalListings(all);
      return item;
    } catch {
      const all = getLocalListings();
      all.unshift(fallback);
      saveLocalListings(all);
      return fallback;
    }
  },
  update: (id: string, input: Partial<ListingInput>) => api.patch<Listing>(endpoints.cart.listing(id), input),
  setStatus: (id: string, status: ListingStatus) => api.patch<Listing>(endpoints.cart.status(id), { status }),
  deleteListing: async (id: string): Promise<void> => {
    try {
      await api.delete(endpoints.cart.listing(id));
    } catch {
      // Mock / fallback removal
      const all = getLocalListings().filter((l) => l.id !== id);
      saveLocalListings(all);
    }
  },
  sendRequest: async (id: string, message: string): Promise<PurchaseRequest> => {
    try {
      const res = await api.post<PurchaseRequest>(endpoints.cart.requests(id), { message });
      if (res) return res;
    } catch {
      /* fallback */
    }
    const { mockRequest } = await import("@/mocks/adapter");
    return mockRequest<PurchaseRequest>("POST", endpoints.cart.requests(id), { message });
  },
  myRequests: async (): Promise<{ sent: PurchaseRequest[]; received: PurchaseRequest[] }> => {
    let sent: PurchaseRequest[] = [];
    let received: PurchaseRequest[] = [];
    try {
      const res = await api.get<any>(endpoints.cart.myRequests);
      if (res) {
        if (Array.isArray(res)) {
          sent = res.map((r: any) => ({
            id: r.id,
            listingId: r.listingId,
            listingTitle: r.listing?.title || r.listingTitle || "Item",
            buyerId: r.buyerId,
            buyerName: r.buyer?.name || r.buyerName || "Student",
            sellerId: r.listing?.sellerId || r.sellerId || "",
            message: r.message || "",
            status: (r.status || "pending").toLowerCase(),
            createdAt: r.createdAt || new Date().toISOString(),
          }));
        } else {
          if (Array.isArray(res.sent)) {
            sent = res.sent.map((r: any) => ({
              id: r.id,
              listingId: r.listingId,
              listingTitle: r.listing?.title || r.listingTitle || "Item",
              buyerId: r.buyerId,
              buyerName: r.buyer?.name || r.buyerName || "Student",
              sellerId: r.listing?.sellerId || r.sellerId || "",
              message: r.message || "",
              status: (r.status || "pending").toLowerCase(),
              createdAt: r.createdAt || new Date().toISOString(),
            }));
          }
          if (Array.isArray(res.received)) {
            received = res.received.map((r: any) => ({
              id: r.id,
              listingId: r.listingId,
              listingTitle: r.listing?.title || r.listingTitle || "Item",
              buyerId: r.buyerId,
              buyerName: r.buyer?.name || r.buyerName || "Student",
              sellerId: r.listing?.sellerId || r.sellerId || "",
              message: r.message || "",
              status: (r.status || "pending").toLowerCase(),
              createdAt: r.createdAt || new Date().toISOString(),
            }));
          }
        }
      }
    } catch {
      /* ignore */
    }
    // Also include mock requests
    try {
      const { mockRequest } = await import("@/mocks/adapter");
      const mockRes = await mockRequest<{ sent: PurchaseRequest[]; received: PurchaseRequest[] }>("GET", endpoints.cart.myRequests);
      if (mockRes) {
        const existingSent = new Set(sent.map((s) => s.id));
        for (const s of mockRes.sent || []) {
          if (!existingSent.has(s.id)) sent.push(s);
        }
        const existingRec = new Set(received.map((r) => r.id));
        for (const r of mockRes.received || []) {
          if (!existingRec.has(r.id)) received.push(r);
        }
      }
    } catch {
      /* ignore */
    }
    return { sent, received };
  },
  updateRequest: async (id: string, status: RequestStatus) => {
    try {
      return await api.patch<PurchaseRequest>(endpoints.cart.request(id), { status });
    } catch {
      const { mockRequest } = await import("@/mocks/adapter");
      return mockRequest<PurchaseRequest>("PATCH", endpoints.cart.request(id), { status });
    }
  },
  report: (id: string, reason: string) => api.post<Report>(endpoints.cart.report(id), { reason }),
  reports: async () => {
    try {
      const res = await api.get<(Report & { listing?: Listing })[]>(endpoints.cart.reports);
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },
  resolveReport: (id: string, action: "dismiss" | "remove") => api.patch<Report>(endpoints.cart.resolveReport(id), { action }),

  // Item Requests ("Request an item to buy")
  listItemRequests: async (): Promise<ItemRequest[]> => {
    try {
      const res = await api.get<any>(endpoints.cart.itemRequests);
      const list = Array.isArray(res) ? res : [];
      if (list.length > 0) return list;
    } catch {
      /* ignore */
    }
    return getLocalItemRequests();
  },
  createItemRequest: async (input: ItemRequestInput, user?: { id: string; name: string; rollNo?: string | undefined }): Promise<ItemRequest> => {
    const newItem: ItemRequest = {
      id: `ir-${Date.now()}`,
      requesterId: user?.id || "u1",
      requesterName: user?.name || "Student",
      requesterRollNo: user?.rollNo || "BT23CSE101",
      requesterContact: input.contact || "",
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      budget: Number(input.budget),
      status: "open",
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await api.post<ItemRequest>(endpoints.cart.itemRequests, input);
      const created = res || newItem;
      const all = getLocalItemRequests();
      all.unshift(created);
      saveLocalItemRequests(all);
      return created;
    } catch {
      const all = getLocalItemRequests();
      all.unshift(newItem);
      saveLocalItemRequests(all);
      return newItem;
    }
  },
  fulfillItemRequest: async (id: string): Promise<void> => {
    const all = getLocalItemRequests();
    const item = all.find((x) => x.id === id);
    if (item) {
      item.status = "fulfilled";
      saveLocalItemRequests(all);
    }
    try {
      await api.patch(endpoints.cart.itemRequest(id), { status: "fulfilled" });
    } catch {
      /* ignore */
    }
  },
  deleteItemRequest: async (id: string): Promise<void> => {
    const all = getLocalItemRequests().filter((x) => x.id !== id);
    saveLocalItemRequests(all);
    try {
      await api.delete(endpoints.cart.itemRequest(id));
    } catch {
      /* ignore */
    }
  },
};
