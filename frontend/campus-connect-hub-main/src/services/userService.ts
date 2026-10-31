import { api } from "./api";
import { endpoints } from "./endpoints";
import type { AppNotification, User } from "@/types";

export const userService = {
  me: async (): Promise<User> => {
    const raw = await api.get<any>(endpoints.me);
    const roleMap: Record<string, any> = {
      STUDENT: "student",
      CLUB_LEAD: "club_lead",
      MESS_ADMIN: "mess_admin",
      CAMPUSCART_MODERATOR: "moderator",
      APP_ADMIN: "admin",
    };
    const role = roleMap[raw?.role?.toUpperCase?.()] || (raw?.role || "student").toLowerCase();
    return {
      id: raw?.id || "u1",
      name: raw?.name || "Student",
      email: raw?.email || "student@iiitn.ac.in",
      rollNo: raw?.rollNo || raw?.rollNumber || "BT21CSE001",
      branch: raw?.branch || "CSE",
      year: raw?.year ?? 3,
      hostel: raw?.hostel || "Campus Hostel",
      role: ["student", "club_lead", "mess_admin", "moderator", "admin"].includes(role) ? role : "student",
      clubIds: Array.isArray(raw?.clubIds) ? raw.clubIds : [],
    };
  },
  notifications: async (): Promise<AppNotification[]> => {
    try {
      const res = await api.get<any>(endpoints.notifications);
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object") {
        if (Array.isArray(res.notifications)) return res.notifications;
        if (Array.isArray(res.items)) return res.items;
      }
      return [];
    } catch {
      return [];
    }
  },
};
