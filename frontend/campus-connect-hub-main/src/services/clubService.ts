import { api } from "./api";
import { endpoints } from "./endpoints";
import type { Announcement, Club, ClubEvent, Registration, User } from "@/types";
import { clubs as defaultClubs, events as defaultEvents, announcements as defaultAnnouncements } from "@/mocks/data";

const LOCAL_EVENTS_KEY = "cc_local_events_v2";
const LOCAL_ANNOUNCEMENTS_KEY = "cc_local_announcements_v2";
const LOCAL_EVENT_REGS_KEY = "cc_event_registrations_v2";

export function getLocalEventRegs(): Registration[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_EVENT_REGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalEventRegs(regs: Registration[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_EVENT_REGS_KEY, JSON.stringify(regs));
  } catch {
    /* ignore */
  }
}

function getLocalEvents(): ClubEvent[] {
  if (typeof window === "undefined") return [...defaultEvents];
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    if (!raw) return [...defaultEvents];
    const parsed: ClubEvent[] = JSON.parse(raw);
    const existingIds = new Set(parsed.map((e) => e.id));
    // Merge any default events not yet in storage (e.g. newly added DemoDays)
    const combined = [...parsed];
    for (const d of defaultEvents) {
      if (!existingIds.has(d.id)) {
        combined.unshift(d);
      }
    }
    return combined;
  } catch {
    return [...defaultEvents];
  }
}

function saveLocalEvents(events: ClubEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events));
  } catch {
    /* ignore */
  }
}

function getLocalAnnouncements(): Announcement[] {
  if (typeof window === "undefined") return [...defaultAnnouncements];
  try {
    const raw = localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY);
    if (!raw) return [...defaultAnnouncements];
    const parsed: Announcement[] = JSON.parse(raw);
    const existingIds = new Set(parsed.map((a) => a.id));
    const combined = [...parsed];
    for (const d of defaultAnnouncements) {
      if (!existingIds.has(d.id)) {
        combined.unshift(d);
      }
    }
    return combined;
  } catch {
    return [...defaultAnnouncements];
  }
}

function saveLocalAnnouncements(ann: Announcement[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(ann));
  } catch {
    /* ignore */
  }
}

export type EventInput = Omit<ClubEvent, "id" | "clubId" | "registered" | "attended">;

const clubMetaMap = new Map<string, (typeof defaultClubs)[0]>();
defaultClubs.forEach((c) => clubMetaMap.set(c.name.toLowerCase().trim(), c));

// Aliases for resilient lookup across naming variations and typos
const dotSlashClub = defaultClubs.find((c) => c.name.toLowerCase().includes("dot"));
if (dotSlashClub) {
  clubMetaMap.set("dot and slash", dotSlashClub);
  clubMetaMap.set("dotslash", dotSlashClub);
}
const crisprClub = defaultClubs.find((c) => c.name.toLowerCase().includes("crisp"));
if (crisprClub) {
  clubMetaMap.set("crisper", crisprClub);
}
const strokesClub = defaultClubs.find((c) => c.name.toLowerCase().includes("stroke"));
if (strokesClub) {
  clubMetaMap.set("stokes", strokesClub);
}

export const KNOWN_CLUBS_BY_ID: Record<string, string> = {
  cmv5glw1g000kqcug8m2srca6: "Iotics",
  c10: "Iotics",
};

function normalizeClub(raw: any): Club {
  if (!raw) return raw;
  let name = raw.name || "Club";
  if (name.toLowerCase().trim() === "dot and slash") {
    name = "Dot Slash";
  }
  if (KNOWN_CLUBS_BY_ID[raw.id]) {
    name = KNOWN_CLUBS_BY_ID[raw.id];
  }
  const meta = clubMetaMap.get(name.toLowerCase().trim());
  const cat = (raw.category || meta?.category || "technical").toLowerCase();
  const validCat = ["technical", "cultural", "sports", "other"].includes(cat) ? cat : "other";

  const backendLeads = Array.isArray(raw.memberships)
    ? raw.memberships.filter((m: any) => m.isLead && m.user?.name).map((m: any) => m.user.name)
    : [];

  const leads = backendLeads.length > 0
    ? backendLeads
    : (Array.isArray(raw.leads) && raw.leads.length > 0 ? raw.leads : (meta?.leads || []));

  const clubMembers = (raw.clubMembers && raw.clubMembers.length > 0)
    ? raw.clubMembers
    : (meta?.clubMembers || []);

  return {
    id: raw.id,
    name,
    tagline: (raw.tagline && raw.tagline !== raw.description) ? raw.tagline : (meta?.tagline || raw.description || ""),
    description: raw.description || meta?.description || "",
    category: validCat as any,
    coordinator: (raw.coordinator && raw.coordinator !== "Lead Coordinator") ? raw.coordinator : (meta?.coordinator || "TBD"),
    leads,
    clubMembers,
    members: raw.members ?? raw._count?.memberships ?? meta?.members ?? 45,
    recruiting: raw.recruiting ?? meta?.recruiting ?? true,
    color: raw.color || meta?.color || String(((raw.id?.charCodeAt?.(raw.id.length - 1) || 1) % 5) + 1),
  };
}

function normalizeEvent(raw: any): ClubEvent {
  if (!raw) return raw;
  const clubId = raw.clubId || raw.club?.id || "";
  const clubName = raw.club?.name || raw.clubName || (KNOWN_CLUBS_BY_ID[clubId] ? KNOWN_CLUBS_BY_ID[clubId] : undefined);
  const isUnlimited = raw.isUnlimited === true || raw.capacity === null || raw.capacity === 0;
  return {
    id: raw.id,
    clubId,
    clubName,
    title: raw.title || "Campus Event",
    description: raw.description || "",
    date: raw.date || raw.startTime || new Date().toISOString(),
    venue: raw.venue || "Campus",
    deadline: raw.deadline || raw.registrationDeadline || raw.startTime || new Date().toISOString(),
    capacity: isUnlimited ? null : (raw.capacity ?? 100),
    isUnlimited,
    registered: raw.registered ?? raw._count?.registrations ?? 0,
    attended: raw.attended ?? 0,
  };
}

function normalizeAnnouncement(raw: any): Announcement {
  if (!raw) return raw;
  return {
    id: raw.id,
    clubId: raw.clubId || "",
    title: raw.title || "",
    body: raw.body || raw.content || "",
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export const DEMODAYS_EVENT: ClubEvent = {
  id: "e-demodays",
  clubId: "c7",
  clubName: "CRISPR",
  title: "DemoDays(Final Day)",
  description: "CRISPR presents DemoDays(Final Day)! An exclusive showcase of cutting-edge tech innovations, student startup prototypes, biotech experiments, and project demonstrations.",
  date: "2026-10-30T11:00:00+05:30",
  venue: "Seminar Hall",
  deadline: "2026-10-29T23:59:00+05:30",
  capacity: 150,
  registered: 150,
};

export const ESUMMIT_ANNOUNCEMENT: Announcement = {
  id: "a-esummit",
  clubId: "c7",
  title: "E-Summit 2027 Coming This January! 🚀",
  body: "We are thrilled to announce that the flagship E-Summit is officially happening this January! Grand preparations have kicked off with exciting speaker sessions, startup pitches, hackathons, and networking opportunities. Stay tuned for dates and registration details!",
  createdAt: "2026-10-30T00:30:00+05:30",
};

export const clubService = {
  list: async (): Promise<Club[]> => {
    try {
      const res = await api.get<any>(endpoints.clubs.list);
      const list = Array.isArray(res) ? res : [];
      if (list.length > 0) return list.map(normalizeClub);
    } catch {
      /* ignore */
    }
    return defaultClubs;
  },
  get: async (id: string): Promise<Club> => {
    try {
      const res = await api.get<any>(endpoints.clubs.detail(id));
      if (res) return normalizeClub(res);
    } catch {
      /* ignore */
    }
    const fallback = defaultClubs.find((c) => c.id === id) || {
      id,
      name: id === "c7" ? "CRISPR" : (KNOWN_CLUBS_BY_ID[id] || "Club"),
      tagline: id === "c7" ? "Biology & biotech innovation" : "",
      description: "",
      category: "technical" as const,
      coordinator: "TBD",
      leads: [],
      members: 40,
      recruiting: true,
      color: "3",
    };
    return normalizeClub(fallback);
  },
  events: async (clubId: string): Promise<ClubEvent[]> => {
    let list: ClubEvent[] = [];
    try {
      const res = await api.get<any>(endpoints.clubs.events(clubId));
      const rawList = Array.isArray(res) ? res : res?.items || res?.data?.items || res?.data || [];
      if (Array.isArray(rawList)) list = rawList.map(normalizeEvent);
    } catch {
      /* ignore */
    }
    const local = getLocalEvents().filter(
      (e) => e.clubId === clubId || (clubId === "c7" && e.title.toLowerCase().includes("demodays"))
    );
    const remoteIds = new Set(list.map((e) => e.id));
    const combined = [...list];
    for (const loc of local) {
      if (!remoteIds.has(loc.id)) {
        combined.unshift(loc);
      }
    }
    const source = combined.length > 0 ? combined : local;
    if (clubId === "c7" && !source.some((e) => e.title.toLowerCase().includes("demodays"))) {
      source.unshift(DEMODAYS_EVENT);
    }
    const localRegs = getLocalEventRegs();
    for (const e of source) {
      if (e.id === "e-demodays" || e.title.toLowerCase().includes("demodays")) continue;
      const count = localRegs.filter((r) => r.eventId === e.id && r.status !== "cancelled").length;
      const localMatch = local.find((l) => l.id === e.id);
      e.registered = Math.max(e.registered || 0, localMatch?.registered || 0, count);
    }
    return source.map((e) => (e.title.toLowerCase().includes("demodays") ? { ...e, ...DEMODAYS_EVENT } : e));
  },
  allEvents: async (): Promise<ClubEvent[]> => {
    let list: ClubEvent[] = [];
    try {
      const res = await api.get<any>(endpoints.clubs.allEvents);
      const rawList = Array.isArray(res) ? res : res?.items || res?.data?.items || res?.data || [];
      if (Array.isArray(rawList)) list = rawList.map(normalizeEvent);
    } catch {
      /* ignore */
    }
    const local = getLocalEvents();
    // Merge remote list and local events so created events are never lost
    const remoteIds = new Set(list.map((e) => e.id));
    const combined = [...list];
    for (const loc of local) {
      if (!remoteIds.has(loc.id)) {
        combined.unshift(loc);
      }
    }
    const source = combined.length > 0 ? combined : local;
    if (!source.some((e) => e.title.toLowerCase().includes("demodays"))) {
      source.unshift(DEMODAYS_EVENT);
    }
    const localRegs = getLocalEventRegs();
    for (const e of source) {
      if (e.id === "e-demodays" || e.title.toLowerCase().includes("demodays")) continue;
      const count = localRegs.filter((r) => r.eventId === e.id && r.status !== "cancelled").length;
      const localMatch = local.find((l) => l.id === e.id);
      e.registered = Math.max(e.registered || 0, localMatch?.registered || 0, count);
    }
    return source.map((e) => (e.title.toLowerCase().includes("demodays") ? { ...e, ...DEMODAYS_EVENT } : e));
  },
  announcements: async (clubId: string): Promise<Announcement[]> => {
    let list: Announcement[] = [];
    try {
      const res = await api.get<any>(endpoints.clubs.announcements(clubId));
      if (Array.isArray(res)) list = res.map(normalizeAnnouncement);
    } catch {
      /* ignore */
    }
    const local = getLocalAnnouncements().filter(
      (a) => a.clubId === clubId || (clubId === "c7" && a.title.toLowerCase().includes("esummit"))
    );
    const source = list.length > 0 ? list : local;
    if (clubId === "c7" && !source.some((a) => a.title.toLowerCase().includes("esummit"))) {
      source.unshift(ESUMMIT_ANNOUNCEMENT);
    }
    return source;
  },
  allAnnouncements: async (): Promise<Announcement[]> => {
    let list: Announcement[] = [];
    try {
      const res = await api.get<any>(endpoints.clubs.allAnnouncements);
      if (Array.isArray(res)) list = res.map(normalizeAnnouncement);
    } catch {
      /* ignore */
    }
    const local = getLocalAnnouncements();
    const source = list.length > 0 ? list : local;
    if (!source.some((a) => a.title.toLowerCase().includes("esummit"))) {
      source.unshift(ESUMMIT_ANNOUNCEMENT);
    }
    return source;
  },
  postAnnouncement: async (clubId: string, a: { title: string; body: string }) => {
    const fallback: Announcement = {
      id: `a-${Date.now()}`,
      clubId,
      title: a.title,
      body: a.body,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await api.post<Announcement>(endpoints.clubs.announcements(clubId), a);
      const created = res || fallback;
      const all = getLocalAnnouncements();
      all.unshift(created);
      saveLocalAnnouncements(all);
      return created;
    } catch {
      const all = getLocalAnnouncements();
      all.unshift(fallback);
      saveLocalAnnouncements(all);
      return fallback;
    }
  },
  createEvent: async (clubId: string, e: EventInput) => {
    const fallback: ClubEvent = {
      ...e,
      id: `e-${Date.now()}`,
      clubId,
      registered: 0,
    };
    try {
      const res = await api.post<ClubEvent>(endpoints.clubs.createEvent(clubId), e);
      const created = res || fallback;
      const all = getLocalEvents();
      all.unshift(created);
      saveLocalEvents(all);
      return created;
    } catch {
      const all = getLocalEvents();
      all.unshift(fallback);
      saveLocalEvents(all);
      return fallback;
    }
  },
  updateEvent: async (eventId: string, e: Partial<EventInput>) => {
    const all = getLocalEvents();
    const idx = all.findIndex((x) => x.id === eventId);
    let updated: ClubEvent;
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...e } as ClubEvent;
      saveLocalEvents(all);
      updated = all[idx];
    } else {
      updated = { id: eventId, ...e } as any;
    }
    try {
      const res = await api.patch<ClubEvent>(endpoints.clubs.updateEvent(eventId), e);
      return res || updated;
    } catch {
      return updated;
    }
  },
  deleteEvent: async (eventId: string) => {
    const all = getLocalEvents().filter((x) => x.id !== eventId);
    saveLocalEvents(all);
    try {
      await api.delete<void>(endpoints.clubs.updateEvent(eventId));
    } catch {
      /* ignore */
    }
  },
  register: async (eventId: string): Promise<Registration> => {
    let reg: Registration | null = null;
    try {
      reg = await api.post<Registration>(endpoints.clubs.register(eventId));
    } catch (err: any) {
      if (err?.message?.includes("not found") || err?.status === 404) {
        const { mockRequest } = await import("@/mocks/adapter");
        reg = await mockRequest<Registration>("POST", endpoints.clubs.register(eventId));
      } else {
        throw err;
      }
    }
    // Update local storage so count increments immediately across all views
    if (typeof window !== "undefined") {
      try {
        const localEvents = getLocalEvents();
        const ev = localEvents.find((x) => x.id === eventId);
        if (ev) {
          ev.registered = (ev.registered || 0) + 1;
          saveLocalEvents(localEvents);
        }
        const regs = getLocalEventRegs().filter((r) => r.eventId !== eventId);
        regs.unshift({
          eventId,
          userId: "current",
          status: "registered",
          createdAt: new Date().toISOString(),
        });
        saveLocalEventRegs(regs);
      } catch {
        /* ignore */
      }
    }
    return reg || {
      eventId,
      userId: "current",
      status: "registered",
      createdAt: new Date().toISOString(),
    };
  },
  cancel: async (eventId: string): Promise<Registration> => {
    let res: Registration | null = null;
    try {
      res = await api.delete<Registration>(endpoints.clubs.register(eventId));
    } catch (err: any) {
      if (err?.message?.includes("not found") || err?.status === 404) {
        const { mockRequest } = await import("@/mocks/adapter");
        res = await mockRequest<Registration>("DELETE", endpoints.clubs.register(eventId));
      } else {
        throw err;
      }
    }
    if (typeof window !== "undefined") {
      try {
        const localEvents = getLocalEvents();
        const ev = localEvents.find((x) => x.id === eventId);
        if (ev) {
          ev.registered = Math.max(0, (ev.registered || 1) - 1);
          saveLocalEvents(localEvents);
        }
        const regs = getLocalEventRegs().filter((r) => r.eventId !== eventId);
        saveLocalEventRegs(regs);
      } catch {
        /* ignore */
      }
    }
    return res || {
      eventId,
      userId: "current",
      status: "cancelled",
      createdAt: new Date().toISOString(),
    };
  },
  myRegistrations: async (): Promise<Registration[]> => {
    let list: Registration[] = [];
    try {
      const res = await api.get<any>(endpoints.clubs.myRegistrations);
      const raw = Array.isArray(res) ? res : res?.items || res?.data?.items || res?.data || [];
      if (Array.isArray(raw)) list = raw;
    } catch {
      try {
        const res2 = await api.get<any>("/api/events/my/registrations");
        const raw2 = Array.isArray(res2) ? res2 : res2?.items || res2?.data?.items || res2?.data || [];
        if (Array.isArray(raw2)) list = raw2;
      } catch {
        /* ignore */
      }
    }
    try {
      const { mockRequest } = await import("@/mocks/adapter");
      const mockRegs = (await mockRequest<Registration[]>("GET", endpoints.clubs.myRegistrations)) || [];
      const existing = new Set(list.map((r) => r.eventId));
      for (const m of mockRegs) {
        if (!existing.has(m.eventId)) list.push(m);
      }
    } catch {
      /* ignore */
    }
    const localRegs = getLocalEventRegs().filter((r) => r.status !== "cancelled");
    const existing = new Set(list.map((r) => r.eventId));
    for (const l of localRegs) {
      if (!existing.has(l.eventId)) {
        list.push(l);
        existing.add(l.eventId);
      }
    }
    return list;
  },
  eventRegistrations: async (eventId: string) => {
    let list: any[] = [];
    try {
      const res = await api.get<any>(endpoints.clubs.eventRegistrations(eventId));
      const raw = Array.isArray(res) ? res : res?.items || res?.data || [];
      if (Array.isArray(raw)) list = raw;
    } catch {
      /* ignore */
    }
    try {
      const { mockRequest } = await import("@/mocks/adapter");
      const mockAttendees = (await mockRequest<any[]>("GET", endpoints.clubs.eventRegistrations(eventId))) || [];
      const existing = new Set(list.map((r) => r.userId));
      for (const m of mockAttendees) {
        if (!existing.has(m.userId)) list.push(m);
      }
    } catch {
      /* ignore */
    }
    const localRegs = getLocalEventRegs().filter((r) => r.eventId === eventId && r.status !== "cancelled");
    const existingEvents = new Set(list.map((r) => r.eventId));
    for (const l of localRegs) {
      if (!existingEvents.has(l.eventId)) {
        list.push({
          ...l,
          user: {
            name: "Current User",
            email: "student@iiitn.ac.in",
            rollNumber: "BT23CSE101",
            rollNo: "BT23CSE101",
            branch: "CSE",
          },
        });
      }
    }
    return list;
  },
};
