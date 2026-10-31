import { Link } from "@tanstack/react-router";
import { useRole } from "@/context/RoleContext";

export type Item = { to: string; label: string; exact?: boolean };

/** Horizontal pill tabs linking between sibling pages. */
export function SubNav({ items }: { items: Item[] }) {
  return (
    <nav className="mb-7 flex gap-6 overflow-x-auto border-b" aria-label="Section">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          activeOptions={{ exact: i.exact ?? true }}
          className="shrink-0 border-b-2 border-transparent py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "!border-primary !text-primary" }}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export const messTabs: Item[] = [
  { to: "/mess", label: "Today" },
  { to: "/mess/menu", label: "Weekly menu" },
  { to: "/mess/dining", label: "Dining info" },
  { to: "/mess/history", label: "Ratings & history" },
];

export const cartTabs: Item[] = [
  { to: "/campuscart", label: "Browse" },
  { to: "/campuscart/create", label: "Sell an item" },
  { to: "/campuscart/my-activity", label: "My activity" },
];

export const clubTabs: Item[] = [
  { to: "/clubs", label: "Clubs" },
  { to: "/events", label: "Events" },
];

export const adminTabs: Item[] = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/mess", label: "Mess" },
  { to: "/admin/clubs", label: "Clubs & Events" },
  { to: "/admin/campuscart", label: "CampusCart" },
];

export function useAdminTabs(): Item[] {
  const { user } = useRole();
  const role = user?.role;
  if (role === "mess_admin") {
    return [{ to: "/admin/mess", label: "Daily Food Menu & Notices" }];
  }
  if (role === "club_lead") {
    return [{ to: "/admin/clubs", label: "Clubs & Events Management" }];
  }
  if (role === "moderator") {
    return [{ to: "/admin/campuscart", label: "CampusCart Moderation" }];
  }
  return adminTabs;
}
