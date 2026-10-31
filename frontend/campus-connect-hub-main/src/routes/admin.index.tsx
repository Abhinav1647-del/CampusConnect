import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageHeader } from "@/components/shared/States";
import { SubNav, useAdminTabs } from "@/components/shared/SubNav";
import { useRole } from "@/context/RoleContext";
import { UtensilsCrossed, Users, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin console — Campus Connect" },
      { name: "description", content: "Admin console at IIIT Nagpur Campus Connect." },
      { property: "og:title", content: "Admin console — Campus Connect" },
      { property: "og:description", content: "Admin console at IIIT Nagpur Campus Connect." },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const { user } = useRole();
  const navigate = useNavigate();
  const tabs = useAdminTabs();

  useEffect(() => {
    if (user?.role === "mess_admin") {
      navigate({ to: "/admin/mess", replace: true });
    } else if (user?.role === "club_lead") {
      navigate({ to: "/admin/clubs", replace: true });
    } else if (user?.role === "moderator") {
      navigate({ to: "/admin/campuscart", replace: true });
    }
  }, [user?.role, navigate]);

  return (
    <div>
      <PageHeader eyebrow="Administration" title="Overview" />
      <SubNav items={tabs} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/mess"
          className="group rounded-2xl border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
        >
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold group-hover:text-primary">Mess Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update daily food items, publish meal menus, and post mess notices.
          </p>
        </Link>

        <Link
          to="/admin/clubs"
          className="group rounded-2xl border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
        >
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold group-hover:text-primary">Clubs & Events</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and schedule events, remove cancelled events, and view attendee registrations.
          </p>
        </Link>

        <Link
          to="/admin/campuscart"
          className="group rounded-2xl border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md"
        >
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold group-hover:text-primary">CampusCart Moderation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review reported listings, resolve flags, and moderate student marketplace items.
          </p>
        </Link>
      </div>
    </div>
  );
}
