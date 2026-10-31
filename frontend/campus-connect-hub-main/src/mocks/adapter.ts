// In-memory mock backend. Implements the same REST paths as services/endpoints.ts
// so screens never know whether they talk to mocks or the real API.
import * as seed from "./data";
import type {
  Announcement, ClubEvent, DailyMenu, DishRating, DishRatingInput, ItemRequest, ItemRequestInput, Listing, ListingInput,
  ListingStatus, Notice, PurchaseRequest, Registration, RequestStatus, User,
} from "@/types";

const db = {
  menus: seed.buildMenus(),
  notices: [...seed.notices],
  clubs: [...seed.clubs],
  events: [...seed.events],
  announcements: [...seed.announcements],
  registrations: [...seed.registrations],
  listings: [...seed.listings],
  itemRequests: [...seed.itemRequests],
  requests: [...seed.purchaseRequests],
  reports: [...seed.reports],
  ratings: [...seed.ratings],
  notifications: [...seed.notifications],
};

const LOCAL_EVENT_REGS_KEY = "cc_event_registrations_v2";
const LOCAL_CART_REQS_KEY = "cc_cart_requests_v2";

function getStoredEventRegs(): Registration[] {
  if (typeof window === "undefined") return db.registrations;
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_REGS_KEY);
    if (!raw) return db.registrations;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : db.registrations;
  } catch {
    return db.registrations;
  }
}

function saveStoredEventRegs(regs: Registration[]) {
  db.registrations = regs;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_EVENT_REGS_KEY, JSON.stringify(regs));
  } catch {}
}

function getStoredCartReqs(): PurchaseRequest[] {
  if (typeof window === "undefined") return db.requests;
  try {
    const raw = localStorage.getItem(LOCAL_CART_REQS_KEY);
    if (!raw) return db.requests;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : db.requests;
  } catch {
    return db.requests;
  }
}

function saveStoredCartReqs(reqs: PurchaseRequest[]) {
  db.requests = reqs;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CART_REQS_KEY, JSON.stringify(reqs));
  } catch {}
}

let currentUserId = "u1";
export const setMockUser = (id: string) => { currentUserId = id; };
const me = (): User => seed.demoUsers.find((u) => u.id === currentUserId)!;
const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const delay = (ms = 250 + Math.random() * 250) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

class MockError extends Error { constructor(public status: number, m: string) { super(m); } }
const fail = (status: number, m: string): never => { throw new MockError(status, m); };
const requireRole = (...roles: User["role"][]) => {
  if (!roles.includes(me().role) && me().role !== "admin") fail(403, "You don't have permission for this action.");
};

type Handler = (m: RegExpMatchArray, q: URLSearchParams, body: any) => unknown;
const routes: [string, RegExp, Handler][] = [
  ["GET", /^\/api\/users\/me$/, () => me()],
  ["POST", /^\/api\/auth\/login$/, (_, __, b: { email: string; password: string }) => {
    if (!/^[^\s@]+@iiitn\.ac\.in$/i.test(b?.email ?? "")) fail(400, "Only IIIT Nagpur college email IDs (@iiitn.ac.in) are allowed.");
    if (!b.password || b.password.length < 6) fail(401, "Incorrect email or password.");
    return { requiresOtp: true, email: b.email, message: "OTP sent to your email ID", demoOtp: "123456" };
  }],
  ["POST", /^\/api\/auth\/verify-otp$/, (_, __, b: { email: string; otp: string }) => {
    if (b?.otp !== "123456") fail(401, "Invalid OTP code. Please enter 123456.");
    return { token: "demo-token", accessToken: "demo-token", user: me() };
  }],
  ["POST", /^\/api\/auth\/send-otp$/, (_, __, b: { email: string }) => {
    return { message: "OTP sent to your email", demoOtp: "123456" };
  }],
  ["GET", /^\/api\/notifications$/, () => db.notifications],
  ["GET", /^\/api\/notices$/, () => db.notices],

  // ---- Mess
  ["GET", /^\/api\/mess\/menu$/, (_, q) => {
    const m = db.menus.find((x) => x.date === q.get("date"));
    if (!m || (!m.published && !["mess_admin", "admin"].includes(me().role))) return null;
    return m;
  }],
  ["GET", /^\/api\/mess\/menu\/week$/, (_, q) => {
    const start = new Date(q.get("start")! + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const date = seed.toISODate(d);
      const m = db.menus.find((x) => x.date === date);
      return m && m.published ? m : { date, published: false, meals: [] };
    });
  }],
  ["GET", /^\/api\/mess\/crowd$/, () => {
    const h = new Date().getHours();
    const level = h >= 12 && h < 14 ? "high" : h >= 19 && h < 21 ? "high" : h >= 7 && h < 10 ? "medium" : "low";
    return { level, updatedAt: now() };
  }],
  ["GET", /^\/api\/mess\/ratings\/history$/, () => {
    const dishes = new Map<string, { name: string; sum: number; count: number }>();
    db.menus.forEach((mn) => mn.meals.forEach((ml) => ml.dishes.forEach((d) => {
      const e = dishes.get(d.id) ?? { name: d.name, sum: 0, count: 0 };
      e.sum += d.avgRating * d.ratingCount; e.count += d.ratingCount; dishes.set(d.id, e);
    })));
    const ranked = [...dishes.values()].map((d) => ({ name: d.name, avg: +(d.sum / d.count).toFixed(2), count: d.count })).sort((a, b) => b.avg - a.avg);
    const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
    return {
      monthly: months.map((month, i) => ({ month, avg: +(3.4 + Math.sin(i) * 0.3 + i * 0.05).toFixed(2), count: 800 + i * 70 })),
      top: ranked.slice(0, 5), bottom: ranked.slice(-5).reverse(),
      mine: db.ratings.filter((r) => r.userId === me().id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }],
  ["POST", /^\/api\/mess\/ratings$/, (_, __, b: DishRatingInput) => {
    if (!b.stars || b.stars < 1 || b.stars > 5) fail(400, "Rating must be between 1 and 5 stars.");
    if (db.ratings.some((r) => r.userId === me().id && r.dishId === b.dishId && r.date === b.date && r.period === b.period))
      fail(409, "You've already rated this dish for this meal.");
    const menu = db.menus.find((m) => m.date === b.date);
    const dish = menu?.meals.find((m) => m.period === b.period)?.dishes.find((d) => d.id === b.dishId);
    if (!dish) fail(404, "Dish not found.");
    dish!.avgRating = +((dish!.avgRating * dish!.ratingCount + b.stars) / (dish!.ratingCount + 1)).toFixed(1);
    dish!.ratingCount += 1;
    const r: DishRating = { ...b, id: uid("dr"), userId: me().id, dishName: dish!.name, createdAt: now() };
    db.ratings.push(r); return r;
  }],
  ["POST", /^\/api\/admin\/mess\/menu$/, (_, __, b: DailyMenu) => {
    requireRole("mess_admin");
    const i = db.menus.findIndex((m) => m.date === b.date);
    if (i >= 0) db.menus[i] = b; else db.menus.push(b);
    return b;
  }],
  ["POST", /^\/api\/admin\/mess\/notices$/, (_, __, b: Pick<Notice, "title" | "body" | "important">) => {
    requireRole("mess_admin");
    const n: Notice = { ...b, id: uid("n"), scope: "mess", createdAt: now() };
    db.notices.unshift(n); return n;
  }],
  ["DELETE", /^\/api\/admin\/mess\/notices\/(\w+)$/, (m) => {
    requireRole("mess_admin"); db.notices = db.notices.filter((n) => n.id !== m[1]); return { ok: true };
  }],

  // ---- Clubs & events
  ["GET", /^\/api\/clubs$/, () => db.clubs],
  ["GET", /^\/api\/clubs\/(\w+)$/, (m) => db.clubs.find((c) => c.id === m[1]) ?? fail(404, "Club not found")],
  ["GET", /^\/api\/clubs\/(\w+)\/events$/, (m) => db.events.filter((e) => e.clubId === m[1])],
  ["GET", /^\/api\/events$/, () => db.events],
  ["GET", /^\/api\/announcements$/, () => [...db.announcements].sort((a, b) => b.createdAt.localeCompare(a.createdAt))],
  ["GET", /^\/api\/clubs\/(\w+)\/announcements$/, (m) => db.announcements.filter((a) => a.clubId === m[1])],
  ["POST", /^\/api\/clubs\/(\w+)\/announcements$/, (m, _, b: Pick<Announcement, "title" | "body">) => {
    if (!me().clubIds.includes(m[1]!) && !["admin", "club_lead", "moderator"].includes(me().role)) fail(403, "You do not have permission to post announcements.");
    const a: Announcement = { ...b, id: uid("a"), clubId: m[1]!, createdAt: now() };
    db.announcements.unshift(a); return a;
  }],
  ["POST", /^\/api\/clubs\/(\w+)\/events$/, (m, _, b: Omit<ClubEvent, "id" | "clubId" | "registered">) => {
    if (!me().clubIds.includes(m[1]!) && me().role !== "club_lead" && me().role !== "admin") fail(403, "Only club leads can create events.");
    const e: ClubEvent = { ...b, id: uid("e"), clubId: m[1]!, registered: 0 };
    db.events.push(e); return e;
  }],
  ["PATCH", /^\/api\/events\/([a-zA-Z0-9_-]+)$/, (m, _, b: Partial<ClubEvent>) => {
    let e = db.events.find((x) => x.id === m[1]);
    if (!e && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("cc_local_events_v2");
        if (raw) {
          const locals = JSON.parse(raw);
          e = locals.find((x: any) => x.id === m[1]);
        }
      } catch {
        /* ignore */
      }
    }
    if (!e) fail(404, "Event not found");
    const foundEvent = e!;
    if (!me().clubIds.includes(foundEvent.clubId) && me().role !== "club_lead" && me().role !== "admin") fail(403, "Not allowed.");
    Object.assign(foundEvent, b); return foundEvent;
  }],
  ["DELETE", /^\/api\/events\/([a-zA-Z0-9_-]+)$/, (m) => {
    const e = db.events.find((x) => x.id === m[1]) ?? fail(404, "Event not found");
    if (!me().clubIds.includes(e.clubId) && me().role !== "club_lead" && me().role !== "admin") fail(403, "Not allowed.");
    db.events = db.events.filter((x) => x.id !== m[1]);
    return { ok: true };
  }],
  ["GET", /^\/api\/(users\/me|events\/my)\/registrations$/, () => {
    const currentId = me().id;
    return getStoredEventRegs().filter((r) => r.status !== "cancelled" && (r.userId === currentId || r.userId === "u1" || r.userId === "u5" || currentId === "u5"));
  }],
  ["GET", /^\/api\/events\/([a-zA-Z0-9_-]+)\/registrations$/, (m) =>
    getStoredEventRegs().filter((r) => r.eventId === m[1] && r.status !== "cancelled").map((r) => ({
      ...r,
      user: seed.demoUsers.find((u) => u.id === r.userId) || { id: r.userId, name: "Student", email: "student@iiitn.ac.in", rollNo: "BT23CSE101", branch: "CSE" },
    }))],
  ["POST", /^\/api\/events\/([a-zA-Z0-9_-]+)\/register$/, (m) => {
    let e = db.events.find((x) => x.id === m[1]);
    if (!e && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("cc_local_events_v2");
        if (raw) {
          const locals = JSON.parse(raw);
          e = locals.find((x: any) => x.id === m[1]);
          if (e) db.events.push(e);
        }
      } catch {
        /* ignore */
      }
    }
    if (!e) fail(404, "Event not found");
    const targetEvent = e!;
    if (new Date(targetEvent.deadline) < new Date()) fail(400, "Registration deadline has passed.");
    const allRegs = getStoredEventRegs();
    const existing = allRegs.find((r) => r.eventId === targetEvent.id && (r.userId === me().id || r.userId === "u1") && r.status !== "cancelled");
    if (existing) fail(409, "You're already registered.");
    const isUnlimited = targetEvent.isUnlimited || targetEvent.capacity === null || targetEvent.capacity === undefined;
    const status = !isUnlimited && targetEvent.registered >= (targetEvent.capacity ?? 0) ? "waitlisted" : "registered";
    if (status === "registered") {
      targetEvent.registered = (targetEvent.registered || 0) + 1;
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("cc_local_events_v2");
          if (raw) {
            const locals = JSON.parse(raw);
            const found = locals.find((x: any) => x.id === targetEvent.id);
            if (found) {
              found.registered = (found.registered || 0) + 1;
              localStorage.setItem("cc_local_events_v2", JSON.stringify(locals));
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
    const r: Registration = { eventId: targetEvent.id, userId: me().id, status, createdAt: now() };
    const updatedRegs = allRegs.filter((x) => !(x.eventId === targetEvent.id && x.userId === me().id));
    updatedRegs.unshift(r);
    saveStoredEventRegs(updatedRegs);
    return r;
  }],
  ["DELETE", /^\/api\/events\/([a-zA-Z0-9_-]+)\/register$/, (m) => {
    const allRegs = getStoredEventRegs();
    const r = allRegs.find((x) => x.eventId === m[1] && (x.userId === me().id || x.userId === "u1") && x.status !== "cancelled") ?? fail(404, "No registration found");
    const e = db.events.find((x) => x.id === m[1]);
    if (r.status === "registered" && e) {
      e.registered = Math.max(0, (e.registered || 1) - 1);
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("cc_local_events_v2");
          if (raw) {
            const locals = JSON.parse(raw);
            const found = locals.find((x: any) => x.id === e.id);
            if (found) {
              found.registered = Math.max(0, (found.registered || 1) - 1);
              localStorage.setItem("cc_local_events_v2", JSON.stringify(locals));
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
    r.status = "cancelled";
    saveStoredEventRegs(allRegs);
    return r;
  }],

  // ---- CampusCart
  ["GET", /^\/api\/campuscart\/listings$/, () => db.listings.filter((l) => l.status !== "removed")],
  ["GET", /^\/api\/campuscart\/listings\/(\w+)$/, (m) => db.listings.find((l) => l.id === m[1]) ?? fail(404, "Listing not found")],
  ["POST", /^\/api\/campuscart\/listings$/, (_, __, b: ListingInput) => {
    if (!b.title?.trim() || b.price < 0) fail(400, "Invalid listing.");
    const l: Listing = { ...b, id: uid("l"), sellerId: me().id, sellerName: me().name, status: "available", createdAt: now(), reports: 0 };
    db.listings.unshift(l); return l;
  }],
  ["PATCH", /^\/api\/campuscart\/listings\/(\w+)$/, (m, _, b: Partial<ListingInput>) => {
    const l = db.listings.find((x) => x.id === m[1]) ?? fail(404, "Listing not found");
    if (l.sellerId !== me().id) fail(403, "Only the seller can edit this listing.");
    Object.assign(l, b); return l;
  }],
  ["PATCH", /^\/api\/campuscart\/listings\/(\w+)\/status$/, (m, _, b: { status: ListingStatus }) => {
    const l = db.listings.find((x) => x.id === m[1]) ?? fail(404, "Listing not found");
    if (l.sellerId !== me().id && !["moderator", "admin"].includes(me().role)) fail(403, "Not allowed.");
    l.status = b.status; return l;
  }],
  ["DELETE", /^\/api\/campuscart\/listings\/(\w+)$/, (m) => {
    const idx = db.listings.findIndex((x) => x.id === m[1]);
    if (idx === -1) fail(404, "Listing not found");
    const l = db.listings[idx]!;
    if (l.sellerId !== me().id && !["moderator", "admin"].includes(me().role)) fail(403, "Only the seller or moderators can remove this listing.");
    db.listings.splice(idx, 1);
    return { success: true, message: "Listing deleted successfully" };
  }],

  // ---- CampusCart Item Requests (Items Wanted / Looking to Buy)
  ["GET", /^\/api\/campuscart\/item-requests$/, () => db.itemRequests],
  ["POST", /^\/api\/campuscart\/item-requests$/, (_, __, b: ItemRequestInput) => {
    if (!b.title?.trim() || b.budget < 0) fail(400, "Please provide item title and a valid budget.");
    const req: ItemRequest = {
      id: uid("ir"),
      requesterId: me().id,
      requesterName: me().name,
      requesterRollNo: me().rollNo,
      requesterContact: b.contact || "",
      title: b.title.trim(),
      description: b.description?.trim() || "",
      category: b.category,
      budget: Number(b.budget),
      status: "open",
      createdAt: now(),
    };
    db.itemRequests.unshift(req);
    return req;
  }],
  ["PATCH", /^\/api\/campuscart\/item-requests\/(\w+)$/, (m, _, b: Partial<ItemRequest>) => {
    const req = db.itemRequests.find((x) => x.id === m[1]) ?? fail(404, "Request not found");
    if (req.requesterId !== me().id && !["moderator", "admin"].includes(me().role)) fail(403, "Not allowed.");
    Object.assign(req, b);
    return req;
  }],
  ["DELETE", /^\/api\/campuscart\/item-requests\/(\w+)$/, (m) => {
    const req = db.itemRequests.find((x) => x.id === m[1]) ?? fail(404, "Request not found");
    if (req.requesterId !== me().id && !["moderator", "admin"].includes(me().role)) fail(403, "Not allowed.");
    db.itemRequests = db.itemRequests.filter((x) => x.id !== m[1]);
    return { ok: true };
  }],
  ["GET", /^\/api\/campuscart\/requests$/, () => {
    const all = getStoredCartReqs();
    return {
      sent: all.filter((r) => r.buyerId === me().id),
      received: all.filter((r) => r.sellerId === me().id || me().role === "admin"),
    };
  }],
  ["POST", /^\/api\/campuscart\/listings\/([a-zA-Z0-9_-]+)\/requests$/, (m, _, b: { message: string }) => {
    let l = db.listings.find((x) => x.id === m[1]);
    if (!l && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("cc_user_listings_v4");
        if (raw) {
          const locals = JSON.parse(raw);
          l = locals.find((x: any) => x.id === m[1]);
          if (l) db.listings.push(l);
        }
      } catch {
        /* ignore */
      }
    }
    if (!l) fail(404, "Listing not found");
    const target = l!;
    if (target.sellerId === me().id) fail(400, "You can't request your own listing.");
    if (target.status !== "available") fail(400, "This item is no longer available.");
    const reqs = getStoredCartReqs();
    if (reqs.some((r) => r.listingId === target.id && r.buyerId === me().id && r.status === "pending")) {
      fail(409, "You already have a pending request for this item.");
    }
    const r: PurchaseRequest = {
      id: uid("r"),
      listingId: target.id,
      listingTitle: target.title,
      buyerId: me().id,
      buyerName: me().name,
      sellerId: target.sellerId,
      message: b.message ?? "",
      status: "pending",
      createdAt: now(),
    };
    reqs.unshift(r);
    saveStoredCartReqs(reqs);
    return r;
  }],
  ["PATCH", /^\/api\/campuscart\/requests\/([a-zA-Z0-9_-]+)$/, (m, _, b: { status: RequestStatus }) => {
    const reqs = getStoredCartReqs();
    const r = reqs.find((x) => x.id === m[1]) ?? fail(404, "Request not found");
    const isSeller = r.sellerId === me().id || me().role === "admin", isBuyer = r.buyerId === me().id;
    if (!isSeller && !isBuyer) fail(403, "Not allowed.");
    if (b.status === "cancelled" && !isBuyer) fail(403, "Only the buyer can cancel.");
    if (["accepted", "rejected", "completed"].includes(b.status) && !isSeller) fail(403, "Only the seller can do this.");
    r.status = b.status;
    saveStoredCartReqs(reqs);
    let l = db.listings.find((x) => x.id === r.listingId);
    if (!l && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("cc_user_listings_v4");
        if (raw) {
          const locals = JSON.parse(raw);
          l = locals.find((x: any) => x.id === r.listingId);
        }
      } catch {
        /* ignore */
      }
    }
    if (l) {
      if (b.status === "accepted") l.status = "reserved";
      if (b.status === "completed") l.status = "sold";
      if ((b.status === "cancelled" || b.status === "rejected") && l.status === "reserved") l.status = "available";
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("cc_user_listings_v4");
          if (raw) {
            const locals = JSON.parse(raw);
            const idx = locals.findIndex((x: any) => x.id === l!.id);
            if (idx >= 0) {
              locals[idx] = l;
              localStorage.setItem("cc_user_listings_v4", JSON.stringify(locals));
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
    return r;
  }],
  ["POST", /^\/api\/campuscart\/listings\/(\w+)\/reports$/, (m, _, b: { reason: string }) => {
    const l = db.listings.find((x) => x.id === m[1]) ?? fail(404, "Listing not found");
    l.reports += 1;
    const r = { id: uid("rp"), listingId: l.id, reason: b.reason, createdAt: now(), resolved: false };
    db.reports.unshift(r); return r;
  }],
  ["GET", /^\/api\/admin\/campuscart\/reports$/, () => {
    requireRole("moderator");
    return db.reports.map((r) => ({ ...r, listing: db.listings.find((l) => l.id === r.listingId) }));
  }],
  ["PATCH", /^\/api\/admin\/campuscart\/reports\/(\w+)$/, (m, _, b: { action: "dismiss" | "remove" }) => {
    requireRole("moderator");
    const r = db.reports.find((x) => x.id === m[1]) ?? fail(404, "Report not found");
    if (b.action === "remove") {
      const l = db.listings.find((x) => x.id === r.listingId); if (l) l.status = "removed";
      db.reports.filter((x) => x.listingId === r.listingId).forEach((x) => (x.resolved = true));
    }
    r.resolved = true; return r;
  }],
];

export async function mockRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  await delay();
  const [p, qs] = path.split("?");
  const q = new URLSearchParams(qs);
  for (const [m, re, h] of routes) {
    if (m !== method) continue;
    const match = (p ?? "").match(re);
    if (match) return clone(h(match, q, body ? clone(body) : body)) as T;
  }
  throw new MockError(404, `Mock route not implemented: ${method} ${p}`);
}
