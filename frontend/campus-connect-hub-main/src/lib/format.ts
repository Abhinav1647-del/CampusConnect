import type { ListingCategory, ListingCondition, MealPeriod, Role } from "@/types";

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Date(iso).toLocaleDateString("en-IN", opts);
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const shiftISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const mondayOf = (iso: string) => {
  const d = new Date(iso + "T00:00:00"); return shiftISO(iso, -((d.getDay() + 6) % 7));
};

export const to12Hour = (time24?: string): string => {
  if (!time24) return "";
  const parts = time24.trim().split(":");
  const hPart = parts[0];
  const mPart = parts[1];
  if (!hPart || !mPart) return time24;
  let h = parseInt(hPart, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const m = mPart.padStart(2, "0");
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
};

export const periodLabel: Record<MealPeriod, string> = { breakfast: "Breakfast", lunch: "Lunch", snacks: "Snacks", dinner: "Dinner" };
export const categoryLabel: Record<ListingCategory, string> = { textbooks: "Textbooks", calculators: "Calculators", electronics: "Electronics", stationery: "Stationery", hostel: "Hostel essentials" };
export const conditionLabel: Record<ListingCondition, string> = { new: "New", like_new: "Like new", good: "Good", fair: "Fair" };
export const roleLabel: Record<Role, string> = { student: "Student", club_lead: "Club lead", mess_admin: "Mess Staff", moderator: "CampusCart moderator", admin: "App admin" };

export const currentPeriod = (): MealPeriod => {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h < 10) return "breakfast"; if (h < 15) return "lunch"; if (h < 18.5) return "snacks"; return "dinner";
};
