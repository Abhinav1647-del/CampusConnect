import { useEffect, type ReactNode } from "react";
import { ClientOnly, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, FlaskConical, Home, ShieldCheck, ShoppingBag, User, Users, UtensilsCrossed } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useRole } from "@/context/RoleContext";
import { useNotifications } from "@/hooks/queries";
import { isMockMode } from "@/services/api";
import { demoUsers } from "@/mocks/data";
import { roleLabel, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/mess", label: "Mess & Dining", short: "Mess", icon: UtensilsCrossed },
  { to: "/clubs", label: "Clubs & Events", short: "Clubs", icon: Users },
  { to: "/campuscart", label: "CampusCart", short: "Cart", icon: ShoppingBag },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary font-display text-lg font-extrabold text-sidebar-primary-foreground">C</span>
      <span className="leading-tight">
        <span className="block font-display text-base font-extrabold">Campus Connect</span>
        <span className="block text-[11px] opacity-70">IIIT Nagpur</span>
      </span>
    </Link>
  );
}

function DemoRoleSwitcher() {
  const { previewUserId, setPreviewUserId } = useRole();
  if (!isMockMode) return null;
  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar-accent p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-primary">
        <FlaskConical className="h-3.5 w-3.5" /> Demo role preview
      </p>
      <Select value={previewUserId} onValueChange={setPreviewUserId}>
        <SelectTrigger aria-label="Preview as role" className="h-9 border-sidebar-border bg-sidebar text-sidebar-foreground"><SelectValue /></SelectTrigger>
        <SelectContent>
          {demoUsers.map((u) => <SelectItem key={u.id} value={u.id}>{roleLabel[u.role]} · {u.name.split(" ")[0]}</SelectItem>)}
        </SelectContent>
      </Select>
      <p className="mt-2 text-[11px] leading-snug opacity-70">Not real sign-in. Permissions will be enforced by the backend.</p>
    </div>
  );
}

function Notifications() {
  const { data } = useNotifications();
  const list = Array.isArray(data)
    ? data
    : data && Array.isArray((data as any).notifications)
      ? (data as any).notifications
      : [];
  const unread = list.filter((n: any) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger aria-label={`Notifications, ${unread} unread`} className="relative grid h-10 w-10 place-items-center rounded-full border bg-card hover:bg-muted">
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{unread}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b px-4 py-3 text-sm font-semibold">Notifications</p>
        {list.length === 0 ? <p className="p-4 text-sm text-muted-foreground">You're all caught up.</p> : (
          <ul className="max-h-80 overflow-auto">
            {list.map((n: any) => (
              <li key={n.id} className="flex gap-3 border-b px-4 py-3 last:border-0">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-muted" : "bg-primary")} />
                <div className="min-w-0"><p className="text-sm">{n.title}</p><p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p></div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, can, signedIn, signOut } = useRole();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoginPage = pathname === "/login";
  const showAdmin = can("mess_admin", "moderator", "club_lead");
  const adminLink = user?.role === "mess_admin"
    ? { to: "/admin/mess", label: "Mess Admin" }
    : user?.role === "club_lead"
    ? { to: "/admin/clubs", label: "Club Admin" }
    : user?.role === "moderator"
    ? { to: "/admin/campuscart", label: "Cart Moderator" }
    : { to: "/admin", label: "Admin Console" };

  useEffect(() => {
    if (!signedIn && !isLoginPage) {
      navigate({ to: "/login", replace: true });
    }
  }, [signedIn, isLoginPage, navigate]);

  // Clean, focused layout for login page without sidebar or app navigation
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b px-6 py-4 flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen", signedIn && "md:grid md:grid-cols-[260px_minmax(0,1fr)]")}>
      {/* Desktop sidebar - only rendered when signed in */}
      {signedIn && (
        <aside className="sticky top-0 hidden h-screen flex-col gap-8 border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground md:flex">
          <Logo />
          <nav aria-label="Main" className="flex flex-col gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: "exact" in n }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-80 transition hover:bg-sidebar-accent hover:opacity-100"
                activeProps={{ className: "!bg-sidebar-accent !opacity-100 text-sidebar-primary" }}
              >
                <n.icon className="h-4.5 w-4.5" /> {n.label}
              </Link>
            ))}
            {showAdmin && (
              <Link
                to={adminLink.to}
                className="mt-3 flex items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2.5 text-sm font-medium opacity-80 hover:bg-sidebar-accent hover:opacity-100"
                activeProps={{ className: "!bg-sidebar-accent !opacity-100 text-sidebar-primary" }}
              >
                <ShieldCheck className="h-4.5 w-4.5" /> {adminLink.label}
              </Link>
            )}
          </nav>
          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs opacity-70">Theme</span>
              <ThemeToggle className="h-8 w-8 border-sidebar-border bg-sidebar hover:bg-sidebar-accent" />
            </div>
            <DemoRoleSwitcher />
            {user && <p className="truncate px-1 text-xs opacity-70">Viewing as {user.name}</p>}
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-col pb-20 md:pb-0">
        {isMockMode && (
          <div className="border-b bg-muted/50 px-4 py-2 text-center text-xs font-medium text-accent-foreground">
            Demo mode — showing sample data, not official IIIT Nagpur information. No backend connected.
          </div>
        )}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="md:hidden"><div className="rounded-lg bg-sidebar px-2 py-1 text-sidebar-foreground"><Logo /></div></div>
          <p className="hidden text-sm text-muted-foreground md:block">
            <ClientOnly>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</ClientOnly>
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {showAdmin && <Link to={adminLink.to} aria-label={adminLink.label} className="grid h-10 w-10 place-items-center rounded-full border bg-card hover:bg-muted md:hidden"><ShieldCheck className="h-4.5 w-4.5" /></Link>}
            <Notifications />
            {signedIn ? (
              <Popover>
                <PopoverTrigger className="rounded-full border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">{user?.name.split(" ")[0] ?? "Account"}</PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2">
                  <Link to="/profile" className="block rounded-md px-3 py-2 text-sm hover:bg-muted">Profile</Link>
                  <button onClick={() => { signOut(); navigate({ to: "/login", replace: true }); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted">Sign out</button>
                </PopoverContent>
              </Popover>
            ) : (
              <Link to="/login" className="rounded-full border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">Sign in</Link>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 md:px-10 md:py-10">{children}</main>
      </div>

      {/* Mobile bottom nav - only rendered when signed in */}
      {signedIn && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "!text-primary" }}
            >
              <n.icon className="h-5 w-5" /> {"short" in n ? n.short : n.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export { DemoRoleSwitcher };
